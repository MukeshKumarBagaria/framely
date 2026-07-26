import "./helpers/env.ts";
import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { verifySignature } from "../src/whatsapp/signature.ts";

// §20.1: "Signature verification rejects a tampered body."
// §19 E18: a mismatch means WA_APP_SECRET is wrong or a proxy mangled the body.

const SECRET = "app-secret-for-tests";
const body = Buffer.from(JSON.stringify({ object: "whatsapp_business_account", entry: [] }));

function sign(buf: Buffer, secret = SECRET): string {
  return "sha256=" + crypto.createHmac("sha256", secret).update(buf).digest("hex");
}

test("accepts a correctly signed body", () => {
  assert.equal(verifySignature(body, sign(body), SECRET), true);
});

test("rejects a tampered body", () => {
  const signature = sign(body);
  const tampered = Buffer.from(JSON.stringify({ object: "evil", entry: [] }));
  assert.equal(verifySignature(tampered, signature, SECRET), false);
});

test("rejects a body signed with the wrong secret", () => {
  assert.equal(verifySignature(body, sign(body, "not-the-secret"), SECRET), false);
});

test("rejects a missing header without throwing", () => {
  assert.equal(verifySignature(body, undefined, SECRET), false);
  assert.equal(verifySignature(body, "", SECRET), false);
});

test("rejects a truncated header without throwing", () => {
  // The guide's snippet feeds the raw header straight to timingSafeEqual, which
  // throws on a length mismatch — exactly the attacker-controlled case.
  const truncated = sign(body).slice(0, 20);
  assert.doesNotThrow(() => verifySignature(body, truncated, SECRET));
  assert.equal(verifySignature(body, truncated, SECRET), false);
});

test("rejects a header with the wrong prefix", () => {
  const hex = crypto.createHmac("sha256", SECRET).update(body).digest("hex");
  assert.equal(verifySignature(body, "sha1=" + hex, SECRET), false);
  assert.equal(verifySignature(body, hex, SECRET), false);
});

test("verifies against the exact bytes, not a re-serialisation", () => {
  // Whitespace is invisible to JSON.parse but not to HMAC. This is why the
  // route keeps the raw buffer instead of re-stringifying req.body — a proxy
  // that reformats the payload is §19 E18's other cause of signature failures.
  const raw = Buffer.from('{ "object" : "whatsapp_business_account" }');
  const reserialised = Buffer.from(JSON.stringify(JSON.parse(raw.toString())));
  assert.notEqual(raw.toString(), reserialised.toString());
  assert.equal(verifySignature(raw, sign(raw), SECRET), true);
  assert.equal(verifySignature(reserialised, sign(raw), SECRET), false);
});
