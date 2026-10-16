import "server-only";
import type { BusinessSettings } from "../../domain/accounting-policy";
import { computeCashFlow } from "../../domain/financial-calculations";
import { dec, money } from "../../domain/money";
import { bucketForRange, bucketKeys, bucketKey, bucketLabel } from "../../domain/periods";
import type { BusinessContext } from "../auth";
import { rpcAll, rpcOne } from "../db";
import { unwrap } from "../errors";
import { mapCashDaily, type CashDailyRow } from "../mappers";

/** Cash in/out dated by payment, from the cash ledger only. */
export async function getCashFlow(ctx: BusinessContext, range: { from: string; to: string }, _settings: BusinessSettings) {
  const rows = (await rpcAll<CashDailyRow>(ctx.supabase, "cash_daily_metrics", { p_business_id: ctx.businessId, p_from: range.from, p_to: range.to }, ["day", "direction", "txn_type"]))
    .map(mapCashDaily);
  const bucket = bucketForRange(range.from, range.to);
  const byBucket = new Map<string, { in: ReturnType<typeof dec>; out: ReturnType<typeof dec> }>();
  for (const { day, agg } of rows) {
    const k = bucketKey(day, bucket);
    const b = byBucket.get(k) ?? { in: dec(0), out: dec(0) };
    if (agg.direction === "in") b.in = b.in.plus(agg.amount);
    else b.out = b.out.plus(agg.amount);
    byBucket.set(k, b);
  }
  let running = dec(0);
  const series = bucketKeys(range.from, range.to, bucket).map((key) => {
    const b = byBucket.get(key) ?? { in: dec(0), out: dec(0) };
    running = running.plus(b.in).minus(b.out);
    return {
      key,
      label: bucketLabel(key, bucket),
      cashIn: b.in.toNumber(),
      cashOut: b.out.toNumber(),
      net: b.in.minus(b.out).toNumber(),
      cumulative: running.toNumber(),
    };
  });
  return { summary: computeCashFlow(rows.map((r) => r.agg)), series, bucket };
}

export async function listCashTransactions(ctx: BusinessContext, q: { from: string; to: string; page: number; pageSize: number; direction?: string }) {
  let query = ctx.supabase.from("cash_transactions")
    .select("id, txn_date, direction, txn_type, amount, payment_account, external_reference, description, source, linked_settlement_id, linked_expense_id, linked_purchase_order_id, voided_at, void_reason, created_at", { count: "exact" })
    .eq("business_id", ctx.businessId)
    .gte("txn_date", q.from)
    .lte("txn_date", q.to)
    .order("txn_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (q.direction === "in" || q.direction === "out") query = query.eq("direction", q.direction);
  const from = (q.page - 1) * q.pageSize;
  const res = await query.range(from, from + q.pageSize - 1);
  return { rows: unwrap(res) as Record<string, unknown>[], total: res.count ?? 0 };
}

export async function recordCashTransaction(ctx: BusinessContext, payload: Record<string, unknown>) {
  return rpcOne<string>(ctx.supabase, "record_cash_transaction", { p_business_id: ctx.businessId, p_payload: payload });
}

export async function voidCashTransaction(ctx: BusinessContext, id: string, reason: string) {
  return rpcOne(ctx.supabase, "void_cash_transaction", { p_id: id, p_reason: reason });
}

export { money };
