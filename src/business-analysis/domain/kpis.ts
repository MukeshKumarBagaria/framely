// KPI tiles: current value, the previous equivalent period, and the change
// between them. A comparison is only shown when both sides are defined and
// the base is non-zero; otherwise it is "not available" (never a fake 0%).
import type { ProfitAndLoss } from "./financial-calculations";
import { dec, money, type Money } from "./money";

export type KpiFormat = "money" | "count" | "percent";
export type Tone = "positive" | "negative" | "neutral";

export type Comparison = {
  absolute: string | null;
  percent: string | null;
  /** Direction of the change relative to what is good for the business. */
  tone: Tone;
  reason?: "no_previous" | "zero_base" | "unavailable";
};

export function compare(current: string | null, previous: string | null, higherIsBetter: boolean | null): Comparison {
  if (current === null || previous === null) {
    return { absolute: null, percent: null, tone: "neutral", reason: "unavailable" };
  }
  const delta = dec(current).minus(previous);
  const base = dec(previous);
  const percent = base.isZero() ? null : delta.dividedBy(base.abs()).times(100).toDecimalPlaces(1).toFixed(1);
  let tone: Tone = "neutral";
  if (higherIsBetter !== null && !delta.isZero()) {
    tone = delta.greaterThan(0) === higherIsBetter ? "positive" : "negative";
  }
  return {
    absolute: delta.toDecimalPlaces(2).toFixed(2),
    percent,
    tone,
    reason: base.isZero() ? "zero_base" : undefined,
  };
}

export type KpiKey =
  | "gross_order_value"
  | "recognized_revenue"
  | "delivered_orders"
  | "settled_amount"
  | "gross_profit"
  | "operating_profit"
  | "net_profit"
  | "total_expenses"
  | "ad_spend"
  | "profit_margin"
  | "average_order_value"
  | "return_rate"
  | "outstanding_receivables"
  | "inventory_value";

export type Kpi = {
  key: KpiKey;
  label: string;
  format: KpiFormat;
  value: string | null;
  previous: string | null;
  comparison: Comparison;
  /** Colour of the value itself: profit-type metrics are green/red by sign. */
  valueTone: Tone;
  tooltip: string;
  href: string;
  estimate?: boolean;
  unavailableReason?: string;
};

export type KpiExtras = {
  settledAmount: Money | null;
  receivables: Money | null;
  inventoryValue: Money | null;
  inventoryIsEstimate: boolean;
};

function signTone(v: string | null): Tone {
  if (v === null) return "neutral";
  const d = dec(v);
  return d.greaterThan(0) ? "positive" : d.lessThan(0) ? "negative" : "neutral";
}

export function buildKpis(
  cur: ProfitAndLoss,
  prev: ProfitAndLoss,
  curExtra: KpiExtras,
  prevExtra: KpiExtras,
  query: string,
): Kpi[] {
  const segmentNote = "Not available while filtering by SKU, status, channel or settlement: business-level costs cannot be assigned to a slice of orders.";
  const q = query ? `?${query}` : "";
  const sep = query ? "&" : "?";
  const k = (
    key: KpiKey,
    label: string,
    format: KpiFormat,
    value: string | null,
    previous: string | null,
    higherIsBetter: boolean | null,
    tooltip: string,
    href: string,
    opts: { profit?: boolean; estimate?: boolean; unavailableReason?: string } = {},
  ): Kpi => ({
    key,
    label,
    format,
    value,
    previous,
    comparison: compare(value, previous, higherIsBetter),
    valueTone: opts.profit ? signTone(value) : "neutral",
    tooltip,
    href,
    estimate: opts.estimate,
    unavailableReason: value === null ? opts.unavailableReason : undefined,
  });

  const netLabel = cur.netProfitIsEstimate ? "Net profit (est.)" : "Net profit";
  return [
    k("gross_order_value", "Gross order value", "money", cur.revenue.grossOrderValue, prev.revenue.grossOrderValue, true,
      "Listed price (incl. GST, before discounts) of every order line placed in the period, excluding cancellations.",
      `orders${q}`),
    k("recognized_revenue", "Net sales", "money", cur.revenue.netSales, prev.revenue.netSales, true,
      "Recognised sales revenue excluding GST, minus customer returns, under the revenue policy in Settings.",
      `orders${q}`),
    k("delivered_orders", "Delivered orders", "count", String(cur.counts.deliveredLines), String(prev.counts.deliveredLines), true,
      "Order lines (Meesho sub-orders) currently delivered, exchanged, or delivered with a return requested.",
      `orders${q}${sep}status=delivered`),
    k("settled_amount", "Settled by platform", "money", curExtra.settledAmount, prevExtra.settledAmount, true,
      "Net platform payouts dated in this period, from imported settlement reports (cash basis). Orders are never assumed paid because they were delivered.",
      `reconciliation${q}`),
    k("gross_profit", "Gross profit", "money", cur.grossProfit, prev.grossProfit, true,
      "Net sales (excl. GST) minus cost of goods sold (recipe estimates or recorded actual costs).",
      `reports${q}`, { profit: true, estimate: cur.counts.actualCostLines === 0 }),
    k("operating_profit", "Operating profit", "money", cur.operatingProfit, prev.operatingProfit, true,
      "Gross profit minus platform deductions, return/RTO losses, advertising and operating expenses.",
      `reports${q}`, { profit: true, unavailableReason: segmentNote }),
    k("net_profit", netLabel, "money", cur.netProfit, prev.netProfit, true,
      cur.netProfitIsEstimate
        ? "Operating profit plus other income, minus finance costs. No income tax is recorded, so this is an estimate before unrecorded adjustments."
        : "Operating profit plus other income, minus finance costs and income tax.",
      `reports${q}`, { profit: true, estimate: cur.netProfitIsEstimate, unavailableReason: segmentNote }),
    k("total_expenses", "Total expenses", "money", cur.totalExpenses, prev.totalExpenses, false,
      "All costs in the P&L: cost of goods, platform deductions, return losses, advertising, operating, finance and tax. Material purchases and equipment are cash-only and excluded.",
      `expenses${q}`, { unavailableReason: segmentNote }),
    k("ad_spend", "Advertising spend", "money", cur.advertising.total, prev.advertising.total, false,
      "Campaign spend (or advertising expenses, per Settings) plus marketplace ad deductions.",
      `advertising${q}`, { unavailableReason: segmentNote }),
    k("profit_margin", "Profit margin", "percent",
      cur.margins.net ?? cur.margins.contribution, prev.margins.net ?? prev.margins.contribution, true,
      cur.margins.net !== null
        ? "Net profit ÷ net sales (excl. GST) × 100."
        : "Contribution before advertising ÷ net sales (excl. GST) × 100 (net margin is unavailable with the current filters).",
      `reports${q}`, { profit: true }),
    k("average_order_value", "Average order value", "money", cur.rates.averageOrderValue, prev.rates.averageOrderValue, true,
      "Net sales (excl. GST) ÷ order lines kept as sales.",
      `orders${q}`),
    k("return_rate", "Return/RTO rate", "percent", cur.rates.returnRtoRate, prev.rates.returnRtoRate, false,
      "(Returned + RTO lines) ÷ lines that reached an outcome after shipping (delivered, returned, RTO, lost) × 100.",
      `orders${q}${sep}status=rto`),
    k("outstanding_receivables", "Outstanding receivables", "money", curExtra.receivables, prevExtra.receivables, null,
      "Sale value of delivered lines in this period not yet (fully) covered by an imported settlement. An estimate before deductions that are not yet known.",
      `reconciliation${q}${sep}status=unsettled`, { estimate: true }),
    k("inventory_value", "Inventory value", "money", curExtra.inventoryValue, prevExtra.inventoryValue, null,
      curExtra.inventoryIsEstimate
        ? "Stock at weighted-average cost on the period's last day, less estimated recipe usage for shipped orders (production is not recorded)."
        : "Stock at weighted-average cost on the period's last day, from the inventory ledger.",
      "inventory", { estimate: curExtra.inventoryIsEstimate }),
  ];
}

export function formatKpiValue(kpi: Pick<Kpi, "format" | "value">, fmt: {
  money: (v: string) => string;
  count: (v: string) => string;
  percent: (v: string) => string;
}): string {
  if (kpi.value === null) return "—";
  return kpi.format === "money" ? fmt.money(kpi.value) : kpi.format === "count" ? fmt.count(kpi.value) : fmt.percent(kpi.value);
}

export { money };
