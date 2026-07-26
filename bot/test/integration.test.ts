// End-to-end idempotency against a real Postgres — §20.1's hardest line:
//
//   "Replaying the same webhook payload twice creates one message row, one
//    photo, one counter increment."
//
// Runs only when TEST_DATABASE_URL points at a throwaway database:
//
//   createdb giftmahal_test
//   TEST_DATABASE_URL=postgres://localhost:5432/giftmahal_test npm test
//
// The WhatsApp client is mocked at the module level, so nothing leaves the box.
import "./helpers/env.ts";
import { describe, it, before, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";

const TEST_DB = process.env.TEST_DATABASE_URL;
if (TEST_DB) process.env.DATABASE_URL = TEST_DB;

/** Everything the bot sent, in order — the assertion surface for these tests. */
const sent: { kind: string; to: string; detail: unknown }[] = [];

mock.module("../src/whatsapp/client.ts", {
  namedExports: {
    sendText: async (to: string, body: string) => {
      sent.push({ kind: "text", to, detail: body });
      return `wamid.out.${sent.length}`;
    },
    sendList: async (to: string, input: unknown) => {
      sent.push({ kind: "list", to, detail: input });
      return `wamid.out.${sent.length}`;
    },
    sendButtons: async (to: string, input: unknown) => {
      sent.push({ kind: "buttons", to, detail: input });
      return `wamid.out.${sent.length}`;
    },
    sendImageByLink: async (to: string, link: string) => {
      sent.push({ kind: "image", to, detail: link });
      return `wamid.out.${sent.length}`;
    },
    sendImageById: async (to: string, id: string) => {
      sent.push({ kind: "image", to, detail: id });
      return `wamid.out.${sent.length}`;
    },
    sendDocumentById: async (to: string, id: string) => {
      sent.push({ kind: "document", to, detail: id });
      return `wamid.out.${sent.length}`;
    },
    sendTemplate: async (to: string, name: string) => {
      sent.push({ kind: "template", to, detail: name });
      return `wamid.out.${sent.length}`;
    },
    markAsRead: async () => {},
    uploadMedia: async () => "media-id",
    // A 1x1 JPEG stand-in; the pipeline only cares that bytes arrive.
    downloadMedia: async () => ({
      buf: Buffer.from("fake-jpeg-bytes"),
      mime: "image/jpeg",
      sha256: "abc123",
      bytes: 15,
    }),
    WhatsAppError: class WhatsAppError extends Error {},
  },
});

const { pool, query } = await import("../src/db/index.ts");
const { migrate } = await import("../src/db/migrate.ts");
const { handleEvent } = await import("../src/webhook/dispatcher.ts");
const { enqueue, processNext } = await import("../src/webhook/queue.ts");
const { getActiveSession } = await import("../src/flow/sessions.ts");
const { countPhotos } = await import("../src/media/photos.ts");

const PHONE = "919876543210";

function textPayload(id: string, body: string) {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "WABA",
        changes: [
          {
            field: "messages",
            value: {
              contacts: [{ profile: { name: "Priya" }, wa_id: PHONE }],
              messages: [{ from: PHONE, id, timestamp: "1785000000", type: "text", text: { body } }],
            },
          },
        ],
      },
    ],
  };
}

function imagePayload(id: string, mediaId: string) {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "WABA",
        changes: [
          {
            field: "messages",
            value: {
              contacts: [{ profile: { name: "Priya" }, wa_id: PHONE }],
              messages: [
                { from: PHONE, id, timestamp: "1785000001", type: "image", image: { id: mediaId, mime_type: "image/jpeg" } },
              ],
            },
          },
        ],
      },
    ],
  };
}

function listReplyPayload(id: string, rowId: string) {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "WABA",
        changes: [
          {
            field: "messages",
            value: {
              contacts: [{ profile: { name: "Priya" }, wa_id: PHONE }],
              messages: [
                {
                  from: PHONE,
                  id,
                  timestamp: "1785000002",
                  type: "interactive",
                  interactive: { type: "list_reply", list_reply: { id: rowId, title: rowId } },
                },
              ],
            },
          },
        ],
      },
    ],
  };
}

describe("webhook idempotency (requires TEST_DATABASE_URL)", { skip: !TEST_DB }, () => {
  before(async () => {
    await migrate();
  });

  beforeEach(async () => {
    sent.length = 0;
    await query("truncate media, messages, orders, sessions, webhook_events, designs restart identity cascade");
    await query(
      `insert into designs (id, occasion, name_i18n, photos_needed, fields, sample_image_url, active, sort_order)
       values ('test_collage_2','birthday','{"en":"2-Photo Collage"}',2,
               '[{"key":"name","label_i18n":{"en":"the name"},"maxLen":18,"required":true}]',
               'designs/test.jpg', true, 0)`
    );
  });

  it("applies migrations to a clean database", async () => {
    const tables = await query<{ table_name: string }>(
      "select table_name from information_schema.tables where table_schema = 'public' order by table_name"
    );
    const names = tables.rows.map((r) => r.table_name);
    for (const expected of ["sessions", "orders", "media", "messages", "webhook_events", "designs"]) {
      assert.ok(names.includes(expected), `missing table ${expected}`);
    }
  });

  it("replaying the same delivery creates exactly one message row and one reply", async () => {
    const payload = textPayload("wamid.DUP1", "Hi");

    await handleEvent(payload);
    await handleEvent(payload);
    await handleEvent(payload);

    const messages = await query<{ n: number }>(
      "select count(*)::int as n from messages where wa_message_id = 'wamid.DUP1' and direction = 'in'"
    );
    assert.equal(messages.rows[0]?.n, 1, "one inbound row per wa_message_id");

    const sessions = await query<{ n: number }>("select count(*)::int as n from sessions");
    assert.equal(sessions.rows[0]?.n, 1, "one session");

    const welcomes = sent.filter((s) => s.kind === "list");
    assert.equal(welcomes.length, 1, "the welcome list is sent once, not three times");
  });

  it("replaying a photo creates one media row and one counter increment", async () => {
    // Walk the flow to AWAITING_PHOTOS.
    await handleEvent(textPayload("wamid.A", "Hi"));
    await handleEvent(listReplyPayload("wamid.B", "lang_en"));
    await handleEvent(listReplyPayload("wamid.C", "occ_birthday"));
    await handleEvent(listReplyPayload("wamid.D", "design_test_collage_2"));

    const session = await getActiveSession(PHONE);
    assert.equal(session?.state, "AWAITING_PHOTOS");
    assert.equal(session?.photos_needed, 2);

    const photo = imagePayload("wamid.PHOTO1", "MEDIA_1");
    await handleEvent(photo);
    await handleEvent(photo);
    await handleEvent(photo);

    assert.equal(await countPhotos(session!.id), 1, "one media row");
    const after = await getActiveSession(PHONE);
    assert.equal(after?.photos_received, 1, "one counter increment");

    const media = await query<{ slot_index: number; local_path: string }>(
      "select slot_index, local_path from media where session_id = $1",
      [session!.id]
    );
    assert.equal(media.rows.length, 1);
    assert.equal(media.rows[0]?.slot_index, 1);
    assert.match(media.rows[0]?.local_path ?? "", /^raw\/01_/);
  });

  it("a photo burst produces one debounced ack, not one per photo", async () => {
    await handleEvent(textPayload("wamid.A2", "Hi"));
    await handleEvent(listReplyPayload("wamid.B2", "lang_en"));
    await handleEvent(listReplyPayload("wamid.C2", "occ_birthday"));
    await handleEvent(listReplyPayload("wamid.D2", "design_test_collage_2"));
    sent.length = 0;

    await handleEvent(imagePayload("wamid.P1", "MEDIA_A"));

    // Nothing sent yet — the ack is deferred to the sweep (§11.1).
    assert.equal(sent.filter((s) => s.kind === "text").length, 0);
    const session = await getActiveSession(PHONE);
    assert.ok(session?.ack_due_at, "ack_due_at is scheduled");

    const { sweepAcks } = await import("../src/jobs/ack.ts");
    await query("update sessions set ack_due_at = now() - interval '1 second' where id = $1", [session!.id]);
    await sweepAcks();

    const acks = sent.filter((s) => s.kind === "text" && String(s.detail).includes("1 of 2"));
    assert.equal(acks.length, 1, "exactly one progress message");

    // Sweeping again must not re-send: the claim cleared ack_due_at.
    await sweepAcks();
    assert.equal(sent.filter((s) => s.kind === "text" && String(s.detail).includes("1 of 2")).length, 1);
  });

  it("the queue hands each event to exactly one consumer", async () => {
    await enqueue(textPayload("wamid.Q1", "Hi"));

    const handled: unknown[] = [];
    const handler = async (raw: unknown) => {
      handled.push(raw);
    };

    assert.equal(await processNext(handler), true);
    assert.equal(await processNext(handler), false, "queue is empty on the second claim");
    assert.equal(handled.length, 1);

    const done = await query<{ status: string }>("select status from webhook_events");
    assert.equal(done.rows[0]?.status, "done");
  });

  it("a failing handler retries, then parks the event as failed", async () => {
    await enqueue(textPayload("wamid.Q2", "Hi"));
    const boom = async () => {
      throw new Error("renderer exploded");
    };

    await processNext(boom); // attempt 1 → pending
    await processNext(boom); // attempt 2 → pending
    await processNext(boom); // attempt 3 → failed

    const row = await query<{ status: string; attempts: number; error: string }>(
      "select status, attempts, error from webhook_events"
    );
    assert.equal(row.rows[0]?.status, "failed");
    assert.equal(row.rows[0]?.attempts, 3);
    assert.match(row.rows[0]?.error ?? "", /renderer exploded/);
  });

  it("only one active session exists per phone number (§19 E14)", async () => {
    await handleEvent(textPayload("wamid.S1", "Hi"));
    await handleEvent(textPayload("wamid.S2", "Hello again"));
    await handleEvent(textPayload("wamid.S3", "Anyone there?"));

    const sessions = await query<{ n: number }>(
      `select count(*)::int as n from sessions
        where phone_e164 = $1 and state <> all(array['CONFIRMED','IN_PRINT','DISPATCHED','ABANDONED'])`,
      [PHONE]
    );
    assert.equal(sessions.rows[0]?.n, 1);
  });

  it("closes the pool", async () => {
    await pool.end();
  });
});
