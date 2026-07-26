import "./helpers/env.ts";
import test from "node:test";
import assert from "node:assert/strict";
import { isTrustworthy, normalizeTypedOrderId, parseOrderText } from "../src/ocr/meesho.ts";
import { estimatedDelivery } from "../src/flow/steps/order.ts";
import { extractSellerOrders, parseCsv } from "../src/jobs/reconcile.ts";

// §14.1 — the truncation problem. "OCR of that screenshot gives you a partial
// ID. You cannot reliably reconstruct the rest. Design for this."

test("reads a full order id from screenshot text", () => {
  const ocr = parseOrderText("Order #311778447421983\n₹ 1,299\nDelivery by 1 Aug", 88);
  assert.equal(ocr.orderId, "311778447421983");
  assert.equal(ocr.truncated, false);
  assert.equal(ocr.amountPaise, 129_900);
  assert.equal(ocr.deliveryDate, "1 Aug");
  assert.equal(isTrustworthy(ocr), true);
});

test("flags a truncated id so it is never auto-accepted", () => {
  const ellipsis = parseOrderText("Order #311778447421...", 92);
  assert.equal(ellipsis.truncated, true);
  assert.equal(isTrustworthy(ellipsis), false, "truncated ids must fall through to a typed id");

  const unicodeEllipsis = parseOrderText("Order #311778447421…", 92);
  assert.equal(unicodeEllipsis.truncated, true);
});

test("low OCR confidence is not trusted (§19 E12)", () => {
  const ocr = parseOrderText("Order #311778447421983", 55);
  assert.equal(ocr.orderId, "311778447421983");
  assert.equal(isTrustworthy(ocr), false);
});

test("prefers the longest number when the screenshot has several", () => {
  const ocr = parseOrderText("Order #311778447421983 placed 26 Jul 2026 ₹181 qty 1", 90);
  assert.equal(ocr.orderId, "311778447421983");
});

test("handles a screenshot with no id at all", () => {
  const ocr = parseOrderText("Thank you for your order", 90);
  assert.equal(ocr.orderId, null);
  assert.equal(isTrustworthy(ocr), false);
});

test("typed order ids: digits only, at least 10 (§14.4)", () => {
  assert.equal(normalizeTypedOrderId("311778447421983"), "311778447421983");
  assert.equal(normalizeTypedOrderId("Order # 3117 7844 7421"), "311778447421");
  assert.equal(normalizeTypedOrderId("12345"), null);
  assert.equal(normalizeTypedOrderId("thanks!"), null);
});

test("delivery estimate is a short human date", () => {
  const formatted = estimatedDelivery(new Date("2026-07-26T12:00:00Z"), 6);
  assert.match(formatted, /^\d{1,2} \w{3}$/);
});

// ---- §14.5 reconciliation ----

test("parses a CSV with quotes, commas and embedded newlines", () => {
  const rows = parseCsv('a,b\n"1,5","line\nbreak"\n"say ""hi""",3\n');
  assert.deepEqual(rows, [
    ["a", "b"],
    ["1,5", "line\nbreak"],
    ['say "hi"', "3"],
  ]);
});

test("extracts seller orders from a Meesho-shaped export", () => {
  const csv = [
    "Sub Order No,Order Date,Product Name,Supplier Discounted Price (Incl GST and Commision),Quantity",
    "311778447421983_1,2026-07-26,Photo Frame,181.00,1",
    '311778447421984_1,2026-07-26,Photo Frame,"1,299.00",1',
  ].join("\n");
  const orders = extractSellerOrders(csv);
  assert.equal(orders.length, 2);
  // The "_1" sub-order suffix is dropped: the customer copies the id without it.
  assert.equal(orders[0]?.orderId, "311778447421983");
  assert.equal(orders[0]?.amountPaise, 18_100);
  assert.equal(orders[1]?.amountPaise, 129_900);
});

test("ignores rows without a usable order id", () => {
  const csv = "Sub Order No,Amount\n,\nTOTAL,500\n";
  assert.deepEqual(extractSellerOrders(csv), []);
});
