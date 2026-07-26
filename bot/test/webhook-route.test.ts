import "./helpers/env.ts";
import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import Fastify from "fastify";
import { webhookRoutes } from "../src/webhook/routes.ts";
import type { Worker } from "../src/webhook/queue.ts";

// §20.1, the first three boxes:
//   - Webhook GET verification returns the raw challenge
//   - Signature verification rejects a tampered body
//   - Handler ACKs in < 200ms (measure it)

const SECRET = "app-secret-for-tests";
const VERIFY_TOKEN = "verify-token-0123456789abcdef";

const PAYLOAD = {
  object: "whatsapp_business_account",
  entry: [
    {
      id: "WABA_ID",
      changes: [
        {
          field: "messages",
          value: {
            messaging_product: "whatsapp",
            metadata: { display_phone_number: "919", phone_number_id: "100000000000000" },
            contacts: [{ profile: { name: "Priya" }, wa_id: "919876543210" }],
            messages: [
              { from: "919876543210", id: "wamid.HBgMTEST", timestamp: "1785000000", type: "text", text: { body: "Hi" } },
            ],
          },
        },
      ],
    },
  ],
};

function sign(raw: string): string {
  return "sha256=" + crypto.createHmac("sha256", SECRET).update(raw).digest("hex");
}

async function buildApp() {
  const enqueued: unknown[] = [];
  const wakes: number[] = [];
  const worker: Worker = {
    wake: () => wakes.push(Date.now()),
    stop: async () => {},
  };
  const app = Fastify({ logger: false });
  await app.register(
    webhookRoutes(worker, async (payload) => {
      enqueued.push(payload);
      return enqueued.length;
    })
  );
  return { app, enqueued, wakes };
}

test("GET returns the raw challenge, not JSON", async () => {
  const { app } = await buildApp();
  const res = await app.inject({
    method: "GET",
    url: "/whatsapp/webhook",
    query: { "hub.mode": "subscribe", "hub.verify_token": VERIFY_TOKEN, "hub.challenge": "1158201444" },
  });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body, "1158201444");
  assert.match(res.headers["content-type"] as string, /text\/plain/);
  await app.close();
});

test("GET rejects a wrong verify token", async () => {
  const { app } = await buildApp();
  const res = await app.inject({
    method: "GET",
    url: "/whatsapp/webhook",
    query: { "hub.mode": "subscribe", "hub.verify_token": "wrong", "hub.challenge": "123" },
  });
  assert.equal(res.statusCode, 403);
  await app.close();
});

test("POST accepts a correctly signed delivery, enqueues it, and wakes the worker", async () => {
  const { app, enqueued, wakes } = await buildApp();
  const raw = JSON.stringify(PAYLOAD);
  const res = await app.inject({
    method: "POST",
    url: "/whatsapp/webhook",
    headers: { "content-type": "application/json", "x-hub-signature-256": sign(raw) },
    payload: raw,
  });
  assert.equal(res.statusCode, 200);
  assert.equal(enqueued.length, 1);
  assert.equal(wakes.length, 1);
  await app.close();
});

test("POST rejects a tampered body and enqueues nothing", async () => {
  const { app, enqueued } = await buildApp();
  const raw = JSON.stringify(PAYLOAD);
  const tampered = raw.replace("Hi", "Hj");
  const res = await app.inject({
    method: "POST",
    url: "/whatsapp/webhook",
    headers: { "content-type": "application/json", "x-hub-signature-256": sign(raw) },
    payload: tampered,
  });
  assert.equal(res.statusCode, 401);
  assert.equal(enqueued.length, 0);
  await app.close();
});

test("POST rejects a missing signature header", async () => {
  const { app } = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/whatsapp/webhook",
    headers: { "content-type": "application/json" },
    payload: JSON.stringify(PAYLOAD),
  });
  assert.equal(res.statusCode, 401);
  await app.close();
});

test("ACKs well inside Meta's retry threshold", async () => {
  const { app } = await buildApp();
  const raw = JSON.stringify(PAYLOAD);
  const signature = sign(raw);

  // Warm up, then measure — the first inject pays for route compilation.
  await app.inject({
    method: "POST",
    url: "/whatsapp/webhook",
    headers: { "content-type": "application/json", "x-hub-signature-256": signature },
    payload: raw,
  });

  const started = process.hrtime.bigint();
  for (let i = 0; i < 20; i++) {
    await app.inject({
      method: "POST",
      url: "/whatsapp/webhook",
      headers: { "content-type": "application/json", "x-hub-signature-256": signature },
      payload: raw,
    });
  }
  const avgMs = Number(process.hrtime.bigint() - started) / 1e6 / 20;
  // The real target is <200ms including the insert; the handler itself must be
  // a rounding error next to that.
  assert.ok(avgMs < 20, `average ACK took ${avgMs.toFixed(2)}ms`);
  await app.close();
});

test("malformed JSON is rejected rather than crashing the process", async () => {
  const { app } = await buildApp();
  const raw = "{not json";
  const res = await app.inject({
    method: "POST",
    url: "/whatsapp/webhook",
    headers: { "content-type": "application/json", "x-hub-signature-256": sign(raw) },
    payload: raw,
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});
