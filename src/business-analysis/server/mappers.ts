// Converts rows returned by the aggregation SQL functions into the domain's
// aggregate types. PostgREST returns NUMERIC as JSON numbers; every column
// here is NUMERIC(14,2)/(14,4) or a sum of them, which round-trips exactly
// through a double (≤15 significant digits), and it is immediately turned
// back into a decimal string — no arithmetic happens on the float.
import type {
  AdAggregate,
  CashAggregate,
  ExpenseAggregate,
  OrderAggregate,
  SettlementAggregate,
} from "../domain/financial-calculations";
import { money } from "../domain/money";
import type { CashTxnType, ExpenseTreatment, OrderStatus, SettlementType } from "../domain/statuses";

type Num = number | string | null | undefined;
const m = (v: Num) => money(v === null || v === undefined ? 0 : String(v));
const n = (v: Num) => (v === null || v === undefined ? 0 : Number(v));

export type OrderDailyRow = {
  day: string;
  status: string;
  lines: Num;
  orders: Num;
  units: Num;
  listed_amount: Num;
  sale_amount: Num;
  sale_amount_excl_gst: Num;
  material_cost: Num;
  packaging_cost: Num;
  other_cost: Num;
  line_cost: Num;
  missing_cost_lines: Num;
  actual_cost_lines: Num;
};

export function mapOrderDaily(r: OrderDailyRow): { day: string; agg: OrderAggregate } {
  return {
    day: String(r.day).slice(0, 10),
    agg: {
      status: r.status as OrderStatus,
      lines: n(r.lines),
      orders: n(r.orders),
      units: n(r.units),
      listedAmount: m(r.listed_amount),
      saleAmount: m(r.sale_amount),
      saleAmountExclGst: m(r.sale_amount_excl_gst),
      materialCost: m(r.material_cost),
      packagingCost: m(r.packaging_cost),
      otherCost: m(r.other_cost),
      lineCost: m(r.line_cost),
      missingCostLines: n(r.missing_cost_lines),
      actualCostLines: n(r.actual_cost_lines),
    },
  };
}

export type SettlementDailyRow = { day: string; transaction_type: string; amount: Num; items: Num; linked_items: Num };
export function mapSettlementDaily(r: SettlementDailyRow): { day: string; agg: SettlementAggregate } {
  return {
    day: String(r.day).slice(0, 10),
    agg: { transactionType: r.transaction_type as SettlementType, amount: m(r.amount), items: n(r.items), linkedItems: n(r.linked_items) },
  };
}

export type ExpenseDailyRow = {
  day: string;
  category_id: string;
  category_slug: string;
  category_name: string;
  treatment: string;
  reflected_in_settlement: boolean;
  amount: Num;
  recoverable_tax: Num;
  entries: Num;
};
export function mapExpenseDaily(r: ExpenseDailyRow): { day: string; agg: ExpenseAggregate } {
  return {
    day: String(r.day).slice(0, 10),
    agg: {
      categoryId: r.category_id,
      categorySlug: r.category_slug,
      categoryName: r.category_name,
      treatment: r.treatment as ExpenseTreatment,
      reflectedInSettlement: Boolean(r.reflected_in_settlement),
      amount: m(r.amount),
      recoverableTax: m(r.recoverable_tax),
      entries: n(r.entries),
    },
  };
}

export type AdDailyRow = {
  day: string;
  ad_account_id: string;
  platform: string;
  spend: Num;
  impressions: Num;
  reach: Num;
  clicks: Num;
  link_clicks: Num;
  purchases: Num;
  attributed_revenue: Num;
};
export function mapAdDaily(r: AdDailyRow): { day: string; agg: AdAggregate } {
  return {
    day: String(r.day).slice(0, 10),
    agg: {
      platform: r.platform,
      spend: m(r.spend),
      impressions: n(r.impressions),
      reach: n(r.reach),
      clicks: n(r.clicks),
      linkClicks: n(r.link_clicks),
      purchases: m(r.purchases),
      attributedRevenue: m(r.attributed_revenue),
    },
  };
}

export type CashDailyRow = { day: string; direction: string; txn_type: string; amount: Num; entries: Num };
export function mapCashDaily(r: CashDailyRow): { day: string; agg: CashAggregate } {
  return {
    day: String(r.day).slice(0, 10),
    agg: { direction: r.direction as "in" | "out", txnType: r.txn_type as CashTxnType, amount: m(r.amount), entries: n(r.entries) },
  };
}

export const toMoney = m;
export const toCount = n;
