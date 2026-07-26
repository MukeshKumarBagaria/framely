// Session repository. Everything that touches the `sessions` table lives here,
// so the state machine reads as flow logic and not as SQL.
import { query, queryOne } from "../db/index.ts";
import { config } from "../config.ts";
import { ensureSessionFolder, purgeSubfolder, sessionFolderPath, writeMeta } from "../media/storage.ts";
import type { Lang, SessionState, WaMessage } from "../whatsapp/types.ts";

export type Session = {
  id: string;
  phone_e164: string;
  wa_profile_name: string | null;
  lang: Lang | null;
  occasion: string | null;
  template_id: string | null;
  state: SessionState;
  photos_needed: number | null;
  photos_received: number;
  field_values: Record<string, string>;
  revision_count: number;
  current_render: string | null;
  source: "ctwa_ad" | "meesho" | "organic" | "unknown";
  ad_id: string | null;
  ctwa_clid: string | null;
  folder_path: string | null;
  window_expires_at: Date | null;
  fep_expires_at: Date | null;
  created_at: Date;
  updated_at: Date;
  last_inbound_at: Date | null;
  // 002_runtime
  retry_count: number;
  field_cursor: number;
  replacing_slot: number | null;
  nudge_count: number;
  last_nudge_at: Date | null;
  ack_due_at: Date | null;
  consent_at: Date | null;
  human_reason: string | null;
  chatwoot_conversation_id: string | null;
  photo_layout_id: string | null;
  render_warnings: unknown[];
  current_print: string | null;
  approved_at: Date | null;
  raw_purged_at: Date | null;
  renders_purged_at: Date | null;
  org_id: string | null;
};

/** States that mean "this conversation is over" — see the §6 partial index. */
export const TERMINAL_STATES: SessionState[] = ["CONFIRMED", "IN_PRINT", "DISPATCHED", "ABANDONED"];

// Whitelist: `updateSession` builds SQL from these keys only.
const UPDATABLE = [
  "wa_profile_name",
  "lang",
  "occasion",
  "template_id",
  "state",
  "photos_needed",
  "photos_received",
  "field_values",
  "revision_count",
  "current_render",
  "source",
  "ad_id",
  "ctwa_clid",
  "folder_path",
  "window_expires_at",
  "fep_expires_at",
  "last_inbound_at",
  "retry_count",
  "field_cursor",
  "replacing_slot",
  "nudge_count",
  "last_nudge_at",
  "ack_due_at",
  "consent_at",
  "human_reason",
  "chatwoot_conversation_id",
  "photo_layout_id",
  "render_warnings",
  "current_print",
  "approved_at",
  "raw_purged_at",
  "renders_purged_at",
] as const;

export type SessionPatch = Partial<Pick<Session, (typeof UPDATABLE)[number]>>;

export async function getSession(id: string): Promise<Session | null> {
  return queryOne<Session>("select * from sessions where id = $1", [id]);
}

export async function getActiveSession(phoneE164: string): Promise<Session | null> {
  return queryOne<Session>(
    `select * from sessions
      where phone_e164 = $1 and state <> all($2::text[])
      order by created_at desc limit 1`,
    [phoneE164, TERMINAL_STATES]
  );
}

export async function getLatestSession(phoneE164: string): Promise<Session | null> {
  return queryOne<Session>(
    "select * from sessions where phone_e164 = $1 order by created_at desc limit 1",
    [phoneE164]
  );
}

export async function updateSession(id: string, patch: SessionPatch): Promise<Session> {
  const keys = Object.keys(patch).filter((k): k is (typeof UPDATABLE)[number] =>
    (UPDATABLE as readonly string[]).includes(k)
  );
  if (keys.length === 0) {
    const current = await getSession(id);
    if (!current) throw new Error(`session ${id} not found`);
    return current;
  }
  const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(", ");
  const values = keys.map((k) => {
    const v = patch[k];
    // jsonb columns must be handed to pg as JSON text, not as a JS object that
    // node-postgres would stringify into a Postgres array literal.
    return k === "field_values" || k === "render_warnings" ? JSON.stringify(v ?? null) : v;
  });
  const row = await queryOne<Session>(
    `update sessions set ${sets} where id = $1 returning *`,
    [id, ...values]
  );
  if (!row) throw new Error(`session ${id} not found`);
  return row;
}

/** §8 step 0 — source detection from the webhook `referral` object. */
export function detectSource(msg: WaMessage): {
  source: Session["source"];
  ad_id: string | null;
  ctwa_clid: string | null;
} {
  const referral = msg.referral;
  if (referral?.source_type === "ad") {
    return {
      source: "ctwa_ad",
      ad_id: referral.source_id ?? null,
      ctwa_clid: referral.ctwa_clid ?? null,
    };
  }
  const text = msg.text?.body?.toLowerCase() ?? "";
  if (/meesho/.test(text) || /\b\d{10,25}\b/.test(text)) {
    return { source: "meesho", ad_id: null, ctwa_clid: null };
  }
  if (text.length > 0 || msg.type !== "text") {
    return { source: "organic", ad_id: null, ctwa_clid: null };
  }
  return { source: "unknown", ad_id: null, ctwa_clid: null };
}

export async function createSession(
  phoneE164: string,
  msg: WaMessage,
  profileName?: string | null
): Promise<Session> {
  const { source, ad_id, ctwa_clid } = detectSource(msg);
  // §2.1 — a CTWA arrival opens the 72h Free Entry Point window.
  const fepExpires = source === "ctwa_ad" ? new Date(Date.now() + 72 * 3600_000) : null;

  const created = await queryOne<Session>(
    `insert into sessions
       (phone_e164, wa_profile_name, source, ad_id, ctwa_clid,
        window_expires_at, fep_expires_at, last_inbound_at, state)
     values ($1,$2,$3,$4,$5, now() + interval '24 hours', $6, now(), 'NEW')
     returning *`,
    [phoneE164, profileName ?? null, source, ad_id, ctwa_clid, fepExpires]
  );
  if (!created) throw new Error("failed to create session");

  const folderPath = sessionFolderPath(phoneE164, created.id, created.created_at);
  await ensureSessionFolder(folderPath);
  const withFolder = await updateSession(created.id, { folder_path: folderPath });

  await writeMeta(folderPath, {
    session_id: created.id,
    phone: phoneE164,
    customer_name: profileName ?? null,
    source,
    ad_id,
    timeline: [{ at: new Date().toISOString(), event: "session_started" }],
  });
  return withFolder;
}

/**
 * §2.1 — every inbound message resets the 24h customer service window. Also the
 * place we reset the nudge counter: someone who replied is not abandoned.
 */
export async function touchWindow(session: Session): Promise<Session> {
  const row = await queryOne<Session>(
    `update sessions
        set last_inbound_at = now(),
            window_expires_at = now() + interval '24 hours',
            nudge_count = 0
      where id = $1 returning *`,
    [session.id]
  );
  return row ?? session;
}

/** True while free-form (non-template) replies are allowed — §2.1. */
export function isWindowOpen(session: Pick<Session, "window_expires_at" | "fep_expires_at">): boolean {
  const now = Date.now();
  if (session.window_expires_at && session.window_expires_at.getTime() > now) return true;
  if (session.fep_expires_at && session.fep_expires_at.getTime() > now) return true;
  return false;
}

/**
 * §8.3 — "Reset session, keep phone + lang".
 *
 * The photos have to go with it. Leaving the `media` rows behind would make
 * `photos_received = 0` a lie: the next photo would be filed into slot N+1 and
 * the counter would jump straight to "complete" using the old pictures.
 */
export async function resetSession(session: Session): Promise<Session> {
  await query("delete from media where session_id = $1", [session.id]);
  if (session.folder_path) {
    await purgeSubfolder(session.folder_path, "raw").catch(() => {});
  }
  return updateSession(session.id, {
    state: "AWAITING_OCCASION",
    occasion: null,
    template_id: null,
    photos_needed: null,
    photos_received: 0,
    field_values: {},
    field_cursor: 0,
    revision_count: 0,
    current_render: null,
    replacing_slot: null,
    retry_count: 0,
    ack_due_at: null,
    render_warnings: [],
  });
}

export async function countPhotos(sessionId: string): Promise<number> {
  const row = await queryOne<{ n: number }>(
    "select count(*)::int as n from media where session_id = $1 and kind = 'photo'",
    [sessionId]
  );
  return row?.n ?? 0;
}

export async function bumpRetry(session: Session): Promise<number> {
  const next = (session.retry_count ?? 0) + 1;
  await updateSession(session.id, { retry_count: next });
  return next;
}

export async function clearRetry(session: Session): Promise<void> {
  if (session.retry_count !== 0) await updateSession(session.id, { retry_count: 0 });
}

// ------------------------------------------------------------ message log

export async function logOutbound(
  session: Pick<Session, "id" | "phone_e164" | "state">,
  type: string,
  payload: unknown,
  waMessageId?: string
): Promise<void> {
  await query(
    `insert into messages (session_id, phone_e164, direction, wa_message_id, type, payload, state_before)
     values ($1,$2,'out',$3,$4,$5,$6)`,
    [session.id, session.phone_e164, waMessageId ?? null, type, JSON.stringify(payload), session.state]
  );
}

export async function attachMessageToSession(
  waMessageId: string,
  sessionId: string,
  stateBefore: SessionState,
  stateAfter: SessionState
): Promise<void> {
  await query(
    `update messages set session_id = $2, state_before = $3, state_after = $4
      where wa_message_id = $1 and direction = 'in'`,
    [waMessageId, sessionId, stateBefore, stateAfter]
  );
}

export async function getConversation(sessionId: string, limit = 200): Promise<
  { direction: "in" | "out"; type: string | null; payload: unknown; created_at: Date }[]
> {
  const res = await query<{
    direction: "in" | "out";
    type: string | null;
    payload: unknown;
    created_at: Date;
  }>(
    `select direction, type, payload, created_at from messages
      where session_id = $1 order by created_at asc limit $2`,
    [sessionId, limit]
  );
  return res.rows;
}

/** §11.1 durable debounce — schedule the "N of M" ack. */
export async function scheduleAck(sessionId: string): Promise<void> {
  await query(
    `update sessions set ack_due_at = now() + ($2 || ' milliseconds')::interval where id = $1`,
    [sessionId, String(config.PHOTO_ACK_DEBOUNCE_MS)]
  );
}
