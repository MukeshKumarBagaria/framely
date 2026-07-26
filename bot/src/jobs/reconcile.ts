// §14.5 reconciliation. Nightly, match the Meesho seller-panel export against
// what the bot captured:
//
//   1. exact meesho_order_id
//   2. partial prefix + amount (+ date)
//   3. no match → leave it flagged "unmatched" on the dashboard
//
// "Do not block printing on a match. Print on approval; match for accounting."
import fs from "node:fs/promises";
import { query } from "../db/index.ts";
import { logger } from "../logger.ts";

export type SellerOrder = { orderId: string; amountPaise?: number | null; date?: string | null };

/**
 * Minimal RFC4180-ish CSV parser: quoted fields, doubled quotes, embedded
 * commas and newlines. Meesho's export is plain enough that pulling in a CSV
 * dependency for it would be the wrong trade.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
      continue;
    }
    if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") field += c ?? "";
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

/** Pull order id / amount / date out of an export whose columns move around. */
export function extractSellerOrders(csv: string): SellerOrder[] {
  const rows = parseCsv(csv);
  const header = rows[0];
  if (!header) return [];

  const idx = (...names: string[]): number =>
    header.findIndex((h) => names.some((n) => h.trim().toLowerCase().includes(n)));

  const idCol = idx("sub order no", "sub_order", "order no", "order id", "order_id");
  const amountCol = idx("supplier discounted price", "final price", "amount", "price");
  const dateCol = idx("order date", "date");

  return rows
    .slice(1)
    .map((r): SellerOrder | null => {
      // Meesho sub-order numbers carry a "_1" line suffix ("311778447421983_1").
      // The customer copies the part before it, so that's what we match on.
      const cell = (idCol >= 0 ? (r[idCol] ?? "") : "").split("_")[0] ?? "";
      const orderId = cell.replace(/\D/g, "");
      if (orderId.length < 8) return null;
      const amountRaw = amountCol >= 0 ? (r[amountCol] ?? "") : "";
      const amount = Number.parseFloat(amountRaw.replace(/[^\d.]/g, ""));
      return {
        orderId,
        amountPaise: Number.isFinite(amount) ? Math.round(amount * 100) : null,
        date: dateCol >= 0 ? (r[dateCol] ?? null) : null,
      };
    })
    .filter((o): o is SellerOrder => o !== null);
}

export type ReconcileResult = { exact: number; partial: number; unmatched: number };

export async function reconcile(sellerOrders: SellerOrder[]): Promise<ReconcileResult> {
  let exact = 0;
  let partial = 0;

  for (const seller of sellerOrders) {
    const byId = await query(
      `update orders set reconciled_at = now(), meesho_order_id = $1
        where meesho_order_id = $1 and reconciled_at is null returning id`,
      [seller.orderId]
    );
    if (byId.rowCount) {
      exact += byId.rowCount;
      continue;
    }

    // Rung 2: a truncated OCR id is a *prefix* of the real one. Requiring the
    // amount to agree as well keeps that from matching the wrong order.
    const byPartial = await query(
      `update orders set reconciled_at = now(), meesho_order_id = $1, verified_by = coalesce(verified_by, 'reconciled')
        where reconciled_at is null
          and meesho_order_id is null
          and meesho_order_partial is not null
          and $1 like meesho_order_partial || '%'
          and (amount_paise is null or $2::int is null or amount_paise = $2::int)
        returning id`,
      [seller.orderId, seller.amountPaise ?? null]
    );
    partial += byPartial.rowCount ?? 0;
  }

  const remaining = await query<{ n: number }>(
    "select count(*)::int as n from orders where reconciled_at is null and status <> 'cancelled'"
  );

  const result = { exact, partial, unmatched: remaining.rows[0]?.n ?? 0 };
  logger.info(result, "meesho reconciliation complete");
  return result;
}

/**
 * The scheduled entry point. Drops a CSV at MEESHO_EXPORT_PATH (default
 * /data/meesho/latest.csv) and this picks it up; no file, no work.
 */
export async function reconcileFromFile(): Promise<void> {
  const path = process.env.MEESHO_EXPORT_PATH ?? "/data/meesho/latest.csv";
  let csv: string;
  try {
    csv = await fs.readFile(path, "utf8");
  } catch {
    logger.debug({ path }, "no meesho export to reconcile");
    return;
  }
  await reconcile(extractSellerOrders(csv));
}
