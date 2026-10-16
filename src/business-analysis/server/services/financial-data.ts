import "server-only";
import type { BusinessSettings } from "../../domain/accounting-policy";
import { computeProfitAndLoss, EMPTY_INPUTS, mergeInputs, type FinancialInputs, type ProfitAndLoss } from "../../domain/financial-calculations";
import { bucketKey, bucketKeys, bucketLabel, type Bucket } from "../../domain/periods";
import { ORDER_STATUSES, type OrderStatus, type SalesChannel } from "../../domain/statuses";
import type { BusinessContext } from "../auth";
import { rpcAll } from "../db";
import {
  mapAdDaily,
  mapCashDaily,
  mapExpenseDaily,
  mapOrderDaily,
  mapSettlementDaily,
  type AdDailyRow,
  type CashDailyRow,
  type ExpenseDailyRow,
  type OrderDailyRow,
  type SettlementDailyRow,
} from "../mappers";

export type LineFilters = {
  channel?: SalesChannel;
  sku?: string | null;
  statuses?: OrderStatus[];
  settlement?: "settled" | "unsettled";
};

/** Line-level filters turn the report into a segment (see CalculationScope). */
export function isSegment(f: LineFilters): boolean {
  return Boolean(f.channel || f.sku || (f.statuses && f.statuses.length > 0) || f.settlement);
}

export type DailyInputs = Map<string, FinancialInputs>;

function addTo(map: DailyInputs, day: string, pick: (i: FinancialInputs) => unknown[], value: unknown) {
  let inputs = map.get(day);
  if (!inputs) {
    inputs = { orders: [], settlements: [], expenses: [], ads: [], cash: [] };
    map.set(day, inputs);
  }
  pick(inputs).push(value);
}

/**
 * Loads per-day aggregates for a range from the database. This is the only
 * place financial figures are read; everything else derives from it through
 * computeProfitAndLoss().
 */
export async function loadDailyInputs(
  ctx: BusinessContext,
  range: { from: string; to: string },
  settings: BusinessSettings,
  filters: LineFilters = {},
): Promise<DailyInputs> {
  const segment = isSegment(filters);
  const base = { p_business_id: ctx.businessId, p_from: range.from, p_to: range.to };
  const statuses = filters.statuses && filters.statuses.length > 0 ? filters.statuses : null;
  const lineArgs = { p_channel: filters.channel ?? null, p_sku: filters.sku ?? null };

  // "settled" means the line has settlement items, so only linked items count;
  // "unsettled" lines have none at all.
  const settlementStatuses = filters.settlement === "settled" ? statuses ?? [...ORDER_STATUSES] : statuses;

  const [orders, settlements, expenses, ads, cash] = await Promise.all([
    rpcAll<OrderDailyRow>(ctx.supabase, "order_daily_metrics", {
      ...base, ...lineArgs, p_date_basis: settings.revenue.dateBasis, p_statuses: statuses, p_settlement_state: filters.settlement ?? null,
    }, ["day", "status"]),
    filters.settlement === "unsettled"
      ? Promise.resolve([] as SettlementDailyRow[])
      : rpcAll<SettlementDailyRow>(ctx.supabase, "settlement_daily_metrics", {
          ...base, ...lineArgs, p_date_basis: settings.settlements.feeDateBasis, p_statuses: settlementStatuses,
        }, ["day", "transaction_type"]),
    segment ? Promise.resolve([] as ExpenseDailyRow[]) : rpcAll<ExpenseDailyRow>(ctx.supabase, "expense_daily_metrics", base, ["day", "category_id", "reflected_in_settlement"]),
    segment ? Promise.resolve([] as AdDailyRow[]) : rpcAll<AdDailyRow>(ctx.supabase, "ad_daily_metrics", base, ["day", "ad_account_id"]),
    segment ? Promise.resolve([] as CashDailyRow[]) : rpcAll<CashDailyRow>(ctx.supabase, "cash_daily_metrics", base, ["day", "direction", "txn_type"]),
  ]);

  const days: DailyInputs = new Map();
  for (const r of orders) { const { day, agg } = mapOrderDaily(r); addTo(days, day, (i) => i.orders, agg); }
  for (const r of settlements) { const { day, agg } = mapSettlementDaily(r); addTo(days, day, (i) => i.settlements, agg); }
  for (const r of expenses) { const { day, agg } = mapExpenseDaily(r); addTo(days, day, (i) => i.expenses, agg); }
  for (const r of ads) { const { day, agg } = mapAdDaily(r); addTo(days, day, (i) => i.ads, agg); }
  for (const r of cash) { const { day, agg } = mapCashDaily(r); addTo(days, day, (i) => i.cash, agg); }
  return days;
}

export function sliceInputs(days: DailyInputs, from: string, to: string): FinancialInputs {
  const parts: FinancialInputs[] = [];
  for (const [day, inputs] of days) if (day >= from && day <= to) parts.push(inputs);
  return parts.length === 0 ? EMPTY_INPUTS : mergeInputs(parts);
}

export type SeriesPoint = {
  key: string;
  label: string;
  pnl: ProfitAndLoss;
  inputs: FinancialInputs;
};

/** One P&L per bucket; buckets with no activity are included as zeros. */
export function buildSeries(
  days: DailyInputs,
  range: { from: string; to: string },
  bucket: Bucket,
  settings: BusinessSettings,
  segment: boolean,
): SeriesPoint[] {
  const grouped = new Map<string, FinancialInputs[]>();
  for (const [day, inputs] of days) {
    if (day < range.from || day > range.to) continue;
    const k = bucketKey(day, bucket);
    const list = grouped.get(k) ?? [];
    list.push(inputs);
    grouped.set(k, list);
  }
  return bucketKeys(range.from, range.to, bucket).map((key) => {
    const inputs = grouped.has(key) ? mergeInputs(grouped.get(key)!) : EMPTY_INPUTS;
    return { key, label: bucketLabel(key, bucket), pnl: computeProfitAndLoss(inputs, settings, { segment }), inputs };
  });
}
