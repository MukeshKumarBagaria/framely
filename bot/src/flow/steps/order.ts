// §14 Meesho order-id capture — "your biggest operational pain and it deserves
// care".
//
// The capture ladder, in order of reliability:
//   1. customer types/pastes the id            → confirmOrder(customer_typed)
//   2. OCR the screenshot, then CONFIRM with them → confirmOrder(customer_confirm)
//   3. partial id + amount + delivery date as a composite key, reconciled by
//      hand against the seller panel            → order row flagged unmatched
//   4. HUMAN escalation
//
// Rung 3 matters more than it looks: §14.5 says never block printing on a
// match, so an order row is created as soon as a screenshot arrives, and the
// dashboard shows it in red until it's reconciled.
import { query, queryOne } from "../../db/index.ts";
import { config } from "../../config.ts";
import { alertAdmin } from "../../alerts.ts";
import { t } from "../../i18n/index.ts";
import { saveScreenshot } from "../../media/photos.ts";
import { appendTimeline, writeMeta } from "../../media/storage.ts";
import { isTrustworthy, normalizeTypedOrderId, ocrOrderScreenshot, type OcrResult } from "../../ocr/meesho.ts";
import { escalateToHuman } from "../human.ts";
import type { Input } from "../normalize.ts";
import { send, sendButtons } from "../send.ts";
import { updateSession, type Session } from "../sessions.ts";

export type OrderRow = {
  id: string;
  session_id: string;
  phone_e164: string;
  channel: "meesho" | "direct" | "other";
  meesho_order_id: string | null;
  meesho_order_partial: string | null;
  amount_paise: number | null;
  screenshot_path: string | null;
  ocr_raw: string | null;
  ocr_confidence: number | null;
  verified_by: string | null;
  status: "placed" | "printing" | "printed" | "dispatched" | "delivered" | "cancelled";
  final_file_path: string | null;
  delivery_date_text: string | null;
  reconciled_at: Date | null;
  dispatched_at: Date | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
};

/** §8 step 7 — approval hands the customer to Meesho to actually pay. */
export async function sendMeeshoLink(session: Session): Promise<void> {
  await send(session, t(session, "meesho_link", { link: config.MEESHO_STORE_LINK }), true);
}

export async function getOrderForSession(sessionId: string): Promise<OrderRow | null> {
  return queryOne<OrderRow>(
    "select * from orders where session_id = $1 order by created_at desc limit 1",
    [sessionId]
  );
}

/** One order per session: created on first evidence, refined as more arrives. */
async function upsertOrder(
  session: Session,
  patch: Partial<
    Pick<
      OrderRow,
      | "meesho_order_id"
      | "meesho_order_partial"
      | "amount_paise"
      | "screenshot_path"
      | "ocr_raw"
      | "ocr_confidence"
      | "verified_by"
      | "delivery_date_text"
      | "final_file_path"
    >
  >
): Promise<OrderRow> {
  const existing = await getOrderForSession(session.id);

  if (existing) {
    const keys = Object.keys(patch) as (keyof typeof patch)[];
    if (keys.length === 0) return existing;
    const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(", ");
    const row = await queryOne<OrderRow>(
      `update orders set ${sets} where id = $1 returning *`,
      [existing.id, ...keys.map((k) => patch[k] ?? null)]
    );
    return row ?? existing;
  }

  const row = await queryOne<OrderRow>(
    `insert into orders
       (session_id, phone_e164, channel, meesho_order_id, meesho_order_partial, amount_paise,
        screenshot_path, ocr_raw, ocr_confidence, verified_by, delivery_date_text, final_file_path, status)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'placed')
     returning *`,
    [
      session.id,
      session.phone_e164,
      "meesho",
      patch.meesho_order_id ?? null,
      patch.meesho_order_partial ?? null,
      patch.amount_paise ?? null,
      patch.screenshot_path ?? null,
      patch.ocr_raw ?? null,
      patch.ocr_confidence ?? null,
      patch.verified_by ?? null,
      patch.delivery_date_text ?? null,
      patch.final_file_path ?? null,
    ]
  );
  if (!row) throw new Error("failed to create order");
  return row;
}

export async function onOrderProof(
  session: Session,
  input: Input,
  waMessageId: string
): Promise<"handled" | "unparsed"> {
  // Rung 2 → confirmation button carries the id it read.
  if (input.kind === "button") {
    if (input.id.startsWith("oid_ok:")) {
      await confirmOrder(session, input.id.slice("oid_ok:".length), "customer_confirm");
      return "handled";
    }
    if (input.id === "oid_retype") {
      await send(session, t(session, "please_type_order_id"));
      return "handled";
    }
  }

  // Rung 1 — the customer typed it. Highest reliability, so it wins outright.
  if (input.kind === "text") {
    const typed = normalizeTypedOrderId(input.text);
    if (typed) {
      await confirmOrder(session, typed, "customer_typed");
      return "handled";
    }
    await send(session, t(session, "order_id_too_short"));
    return "unparsed";
  }

  if (input.kind === "image") {
    const saved = await saveScreenshot(session, input, waMessageId);
    if (!saved) return "handled"; // duplicate delivery

    const ocr = await ocrOrderScreenshot(saved.buf);
    await recordScreenshot(session, saved.relPath, ocr);

    if (isTrustworthy(ocr) && ocr.orderId) {
      // §14.4 — never auto-accept OCR (§19 E12). Always confirm.
      await sendButtons(session, {
        body: t(session, "confirm_order_id", { id: ocr.orderId }),
        buttons: [
          { id: `oid_ok:${ocr.orderId}`, title: t(session, "btn_oid_ok") },
          { id: "oid_retype", title: t(session, "btn_oid_retype") },
        ],
      });
      return "handled";
    }

    // Truncated or low confidence → rung 1 again, with rung 3 already recorded.
    await send(session, t(session, "please_type_order_id"));
    return "handled";
  }

  await send(session, t(session, "send_screenshot_or_id"));
  return "unparsed";
}

async function recordScreenshot(session: Session, relPath: string, ocr: OcrResult): Promise<void> {
  await upsertOrder(session, {
    screenshot_path: relPath,
    ocr_raw: ocr.raw.slice(0, 4000),
    ocr_confidence: ocr.confidence,
    amount_paise: ocr.amountPaise,
    delivery_date_text: ocr.deliveryDate,
    // Rung 3: keep whatever digits we got even when truncated.
    meesho_order_partial: ocr.orderId,
  });
  if (session.folder_path) {
    await appendTimeline(session.folder_path, "screenshot_received", {
      truncated: ocr.truncated,
      confidence: Math.round(ocr.confidence),
    });
  }
}

/** Estimated delivery, used in the confirmation copy. */
export function estimatedDelivery(from: Date = new Date(), days = 6): string {
  const d = new Date(from.getTime() + days * 86_400_000);
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(d);
}

export async function confirmOrder(
  session: Session,
  orderId: string,
  verifiedBy: "customer_typed" | "customer_confirm" | "ocr_auto" | "manual"
): Promise<void> {
  const order = await upsertOrder(session, {
    meesho_order_id: orderId,
    verified_by: verifiedBy,
    final_file_path: session.current_print,
  });

  const updated = await updateSession(session.id, { state: "CONFIRMED", retry_count: 0 });
  const delivery = estimatedDelivery();
  await query("update orders set delivery_date_text = coalesce(delivery_date_text, $2) where id = $1", [
    order.id,
    delivery,
  ]);

  await send(updated, t(updated, "order_confirmed", { id: orderId, date: delivery }));

  if (session.folder_path) {
    await appendTimeline(session.folder_path, "order_id_captured", { orderId, verifiedBy });
    await writeMeta(session.folder_path, {
      session_id: session.id,
      phone: session.phone_e164,
      meesho_order_id: orderId,
    });
  }

  await alertAdmin({
    severity: "low",
    title: `New order ${orderId}`,
    detail: `${session.phone_e164} · ${session.template_id ?? "?"} · folder ${session.folder_path ?? "-"}`,
  });
}

/** Rung 4 — the ladder ran out. Keep the partial row; let a human finish it. */
export async function escalateOrderCapture(session: Session): Promise<void> {
  await upsertOrder(session, { verified_by: null });
  await escalateToHuman(session, "order_id_failed");
}
