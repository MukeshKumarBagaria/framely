import "./helpers/env.ts";
import test from "node:test";
import assert from "node:assert/strict";
import { normalize } from "../src/flow/normalize.ts";
import { isHelpRequest, isRestart, isSkip, isUndo } from "../src/flow/interrupts.ts";
import { detectSource } from "../src/flow/sessions.ts";
import type { WaMessage } from "../src/whatsapp/types.ts";

const base = { from: "919876543210", id: "wamid.TEST" };

test("normalizes a text message", () => {
  const input = normalize({ ...base, type: "text", text: { body: "  Hi  " } } as WaMessage);
  assert.deepEqual(input, { kind: "text", text: "Hi" });
});

test("normalizes list and button replies", () => {
  const list = normalize({
    ...base,
    type: "interactive",
    interactive: { type: "list_reply", list_reply: { id: "lang_hi", title: "हिन्दी" } },
  } as WaMessage);
  assert.deepEqual(list, { kind: "list", id: "lang_hi", title: "हिन्दी" });

  const button = normalize({
    ...base,
    type: "interactive",
    interactive: { type: "button_reply", button_reply: { id: "approve", title: "✅ Perfect" } },
  } as WaMessage);
  assert.deepEqual(button, { kind: "button", id: "approve", title: "✅ Perfect" });
});

test("normalizes an image", () => {
  const input = normalize({
    ...base,
    type: "image",
    image: { id: "MEDIA_ID", mime_type: "image/jpeg" },
  } as WaMessage);
  assert.deepEqual(input, { kind: "image", mediaId: "MEDIA_ID", mime: "image/jpeg", asDocument: false });
});

// §19 E3 — "Customer sends photo as document: detect image mime on
// type:'document', treat as photo." Common in India, worth handling day one.
test("treats an image sent as a document as a photo", () => {
  const input = normalize({
    ...base,
    type: "document",
    document: { id: "DOC_ID", mime_type: "image/jpeg", filename: "IMG_2043.JPG" },
  } as WaMessage);
  assert.deepEqual(input, {
    kind: "image",
    mediaId: "DOC_ID",
    mime: "image/jpeg",
    asDocument: true,
    filename: "IMG_2043.JPG",
  });
});

test("a real document is not a photo", () => {
  const input = normalize({
    ...base,
    type: "document",
    document: { id: "DOC_ID", mime_type: "application/pdf" },
  } as WaMessage);
  assert.equal(input.kind, "other");
});

test("template quick-reply buttons arrive as type 'button'", () => {
  const input = normalize({
    ...base,
    type: "button",
    button: { text: "Continue", payload: "Continue" },
  } as WaMessage);
  assert.deepEqual(input, { kind: "text", text: "Continue" });
});

test("unsupported types degrade to 'other' instead of throwing", () => {
  for (const type of ["audio", "sticker", "location", "reaction", "unsupported"]) {
    assert.equal(normalize({ ...base, type } as WaMessage).kind, "other");
  }
});

// ---- §8.3 global interrupts, in every language ----

test("help requests are recognised across languages", () => {
  for (const text of ["help", "AGENT", "मुझे मदद चाहिए", "मला मदत हवी", "મદદ કરો", "సహాయం", "உதவி", "ಸಹಾಯ"]) {
    assert.equal(isHelpRequest({ kind: "text", text }), true, text);
  }
  assert.equal(isHelpRequest({ kind: "text", text: "Priya" }), false);
});

test("restart is recognised, and doesn't fire on ordinary text", () => {
  for (const text of ["restart", "Start Over", "फिर से", "ફરીથી"]) {
    assert.equal(isRestart({ kind: "text", text }), true, text);
  }
  assert.equal(isRestart({ kind: "text", text: "restart my frame please" }), false);
});

test("undo and skip", () => {
  assert.equal(isUndo({ kind: "text", text: "undo" }), true);
  assert.equal(isUndo({ kind: "text", text: "हटाओ" }), true);
  assert.equal(isUndo({ kind: "text", text: "undo the last photo" }), false);
  assert.equal(isSkip("skip"), true);
  assert.equal(isSkip("SKIP"), true);
  assert.equal(isSkip("skipper"), false);
});

test("a button reply is never mistaken for an interrupt", () => {
  assert.equal(isHelpRequest({ kind: "button", id: "help_me" }), false);
  assert.equal(isRestart({ kind: "list", id: "restart_x" }), false);
});

// ---- §8.2 step 0: source detection ----

test("detects a click-to-WhatsApp ad arrival", () => {
  const detected = detectSource({
    ...base,
    type: "text",
    text: { body: "Hi" },
    referral: { source_type: "ad", source_id: "120210000000000", ctwa_clid: "ARAa..." },
  } as WaMessage);
  assert.deepEqual(detected, { source: "ctwa_ad", ad_id: "120210000000000", ctwa_clid: "ARAa..." });
});

test("detects a Meesho buyer by keyword or an order-shaped number", () => {
  assert.equal(
    detectSource({ ...base, type: "text", text: { body: "I ordered from Meesho" } } as WaMessage).source,
    "meesho"
  );
  assert.equal(
    detectSource({ ...base, type: "text", text: { body: "311778447421" } } as WaMessage).source,
    "meesho"
  );
});

test("everything else is organic", () => {
  assert.equal(detectSource({ ...base, type: "text", text: { body: "hello" } } as WaMessage).source, "organic");
});
