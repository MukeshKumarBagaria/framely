import "server-only";
import { describePolicy, statusSets, type BusinessSettings, type ReportType } from "../../domain/accounting-policy";
import { addDays, addMonths, startOfMonth, startOfWeek, todayIn, type IsoDate } from "../../domain/dates";
import {
  computeCashFlow,
  computeProfitAndLoss,
  expenseBreakdown,
  type BreakdownSlice,
  type CashFlowSummary,
  type ProfitAndLoss,
} from "../../domain/financial-calculations";
import { generateInsights, type Insight } from "../../domain/insights";
import { buildKpis, type Kpi } from "../../domain/kpis";
import { dec, money, percentOf, type Money } from "../../domain/money";
import { bucketForRange, resolvePeriod, type Bucket, type PeriodPair } from "../../domain/periods";
import type { OrderStatus } from "../../domain/statuses";
import type { Filters } from "../../schemas";
import type { BusinessContext } from "../auth";
import { rpcAll } from "../db";
import { unwrap } from "../errors";
import { toCount, toMoney } from "../mappers";
import { buildSeries, isSegment, loadDailyInputs, sliceInputs, type LineFilters } from "./financial-data";
import { getInventorySnapshot } from "./inventory-service";
import { getOverdue, getReconciliationSummary } from "./reconciliation-service";
import { getSettingsAt } from "./settings-service";

export type ResolvedFilters = {
  period: PeriodPair;
  lineFilters: LineFilters;
  segment: boolean;
  query: string;
  today: IsoDate;
};

/** Filters from the URL, resolved against today in the business timezone. */
export function resolveFilters(ctx: BusinessContext, filters: Filters, defaultPreset: Filters["preset"] = "this_month"): ResolvedFilters {
  const today = todayIn(ctx.business.timeZone);
  const preset = filters.preset ?? defaultPreset ?? "this_month";
  const period = resolvePeriod(preset, today, ctx.business.fyStartMonth, { from: filters.from, to: filters.to });
  const lineFilters: LineFilters = {
    channel: filters.channel,
    sku: filters.sku ?? null,
    statuses: filters.status,
    settlement: filters.settlement,
  };
  const params = new URLSearchParams();
  params.set("preset", preset);
  if (preset === "custom") {
    params.set("from", period.current.from);
    params.set("to", period.current.to);
  }
  if (filters.channel) params.set("channel", filters.channel);
  if (filters.sku) params.set("sku", filters.sku);
  if (filters.status?.length) params.set("status", filters.status.join(","));
  if (filters.settlement) params.set("settlement", filters.settlement);
  return { period, lineFilters, segment: isSegment(lineFilters), query: params.toString(), today };
}

export type SeriesRow = {
  key: string;
  label: string;
  from: string;
  to: string;
  netSales: number;
  costs: number;
  profit: number | null;
  margin: number | null;
  lines: number;
  deliveredLines: number;
  adSpend: number;
  attributedRevenue: number;
  cashIn: number;
  cashOut: number;
  cumulativeNetSales: number;
  cumulativeProfit: number | null;
};

export type SkuRow = {
  sku: string;
  productId: string | null;
  productName: string | null;
  lines: number;
  units: number;
  netSoldLines: number;
  lossLines: number;
  netSales: Money;
  cogs: Money;
  lossCost: Money;
  deductions: Money;
  contribution: Money;
  margin: string | null;
  missingCostLines: number;
};

export type DashboardData = {
  businessName: string;
  generatedAt: string;
  period: PeriodPair;
  bucket: Bucket;
  segment: boolean;
  query: string;
  profitBasis: "net" | "contribution";
  settingsEffectiveFrom: string;
  policyNotes: string[];
  kpis: Kpi[];
  pnl: ProfitAndLoss;
  previousPnl: ProfitAndLoss;
  series: SeriesRow[];
  weekly: SeriesRow[];
  monthly: SeriesRow[];
  expenseBreakdown: BreakdownSlice[];
  statusDistribution: { status: OrderStatus; lines: number }[];
  skus: SkuRow[];
  cash: CashFlowSummary;
  insights: Insight[];
  receivables: Money | null;
  inventoryValue: Money;
  inventoryIsEstimate: boolean;
};

const num = (v: Money | null | undefined) => (v === null || v === undefined ? 0 : dec(v).toDecimalPlaces(2).toNumber());

function toSeriesRows(points: ReturnType<typeof buildSeries>, bucket: Bucket, rangeTo: string, segment: boolean): SeriesRow[] {
  let cumSales = dec(0);
  let cumProfit = dec(0);
  return points.map((p, i) => {
    const next = points[i + 1]?.key;
    const to = next ? addDays(next, -1) : rangeTo;
    const profit = segment ? p.pnl.contributionBeforeAds : p.pnl.netProfit;
    const costs = segment
      ? dec(p.pnl.cogs.total).plus(p.pnl.variableCosts.total)
      : dec(p.pnl.totalExpenses ?? 0);
    const cash = computeCashFlow(p.inputs.cash);
    cumSales = cumSales.plus(p.pnl.revenue.netSales);
    if (profit !== null) cumProfit = cumProfit.plus(profit);
    return {
      key: p.key,
      label: p.label,
      from: p.key,
      to: bucket === "day" ? p.key : to,
      netSales: num(p.pnl.revenue.netSales),
      costs: num(money(costs)),
      profit: profit === null ? null : num(profit),
      margin: profit === null ? null : (() => { const m = percentOf(profit, p.pnl.revenue.netSales); return m === null ? null : Number(m); })(),
      lines: p.pnl.counts.lines,
      deliveredLines: p.pnl.counts.deliveredLines,
      adSpend: num(p.pnl.advertisingMetrics.spend),
      attributedRevenue: num(p.pnl.advertisingMetrics.attributedRevenue),
      cashIn: num(cash.totalIn),
      cashOut: num(cash.totalOut),
      cumulativeNetSales: num(money(cumSales)),
      cumulativeProfit: profit === null ? null : num(money(cumProfit)),
    };
  });
}

type SkuDbRow = {
  sku: string; product_id: string | null; product_name: string | null; lines: number; units: number; net_sold_lines: number; loss_lines: number;
  net_sales: number; cogs: number; loss_cost: number; deductions: number; contribution: number; missing_cost_lines: number;
};

export async function getSkuProfitability(ctx: BusinessContext, range: { from: string; to: string }, settings: BusinessSettings, channel?: string | null): Promise<SkuRow[]> {
  const sets = statusSets(settings);
  const rows = await rpcAll<SkuDbRow>(ctx.supabase, "sku_profitability", {
    p_business_id: ctx.businessId,
    p_from: range.from,
    p_to: range.to,
    p_net_sold: sets.netSold,
    p_loss: sets.loss,
    p_recovery_percent: settings.costs.returnedGoodsRecoveryPercent,
    p_date_basis: settings.revenue.dateBasis,
    p_channel: channel ?? null,
  }, ["sku"]);
  return rows
    .map((r) => ({
      sku: r.sku,
      productId: r.product_id,
      productName: r.product_name,
      lines: toCount(r.lines),
      units: toCount(r.units),
      netSoldLines: toCount(r.net_sold_lines),
      lossLines: toCount(r.loss_lines),
      netSales: toMoney(r.net_sales),
      cogs: toMoney(r.cogs),
      lossCost: toMoney(r.loss_cost),
      deductions: toMoney(r.deductions),
      contribution: toMoney(r.contribution),
      margin: percentOf(toMoney(r.contribution), toMoney(r.net_sales)),
      missingCostLines: toCount(r.missing_cost_lines),
    }))
    .sort((a, b) => dec(b.contribution).comparedTo(a.contribution));
}

async function lastImports(ctx: BusinessContext): Promise<Partial<Record<ReportType, IsoDate | null>> | null> {
  if (!ctx.can("writer")) return null;
  const res = await ctx.supabase
    .from("document_imports")
    .select("report_type, committed_at")
    .eq("business_id", ctx.businessId)
    .eq("status", "committed")
    .order("committed_at", { ascending: false })
    .limit(200);
  const out: Partial<Record<ReportType, IsoDate | null>> = {};
  for (const r of unwrap(res) as { report_type: ReportType; committed_at: string }[]) {
    if (!out[r.report_type]) out[r.report_type] = r.committed_at.slice(0, 10);
  }
  return out;
}

async function largeExpenses(ctx: BusinessContext, from: string, to: string, settings: BusinessSettings) {
  const res = await ctx.supabase
    .from("expenses")
    .select("id, expense_date, amount, vendor, category_id, expense_categories(name)")
    .eq("business_id", ctx.businessId)
    .eq("is_recurring_template", false)
    .is("reversal_of_id", null)
    .eq("status", "active")
    .gte("expense_date", addDays(from, -180))
    .lte("expense_date", to)
    .order("expense_date", { ascending: false })
    .limit(2000);
  const rows = unwrap(res) as { id: string; expense_date: string; amount: number; vendor: string | null; category_id: string; expense_categories: { name: string } | null }[];
  const byCategory = new Map<string, number[]>();
  for (const r of rows) byCategory.set(r.category_id, [...(byCategory.get(r.category_id) ?? []), Number(r.amount)]);
  const median = (xs: number[]) => {
    const s = [...xs].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };
  const t = settings.thresholds;
  return rows
    .filter((r) => r.expense_date >= from)
    .flatMap((r) => {
      const peers = byCategory.get(r.category_id) ?? [];
      if (peers.length < 4) return [];
      const typical = median(peers);
      const amount = Number(r.amount);
      if (amount < t.largeExpenseMinAmount || typical <= 0 || amount < typical * t.largeExpenseMultiplier) return [];
      return [{
        id: r.id,
        date: r.expense_date,
        label: `${r.expense_categories?.name ?? "Expense"}${r.vendor ? ` — ${r.vendor}` : ""}`,
        amount: money(String(r.amount)),
        typical: money(String(typical)),
      }];
    })
    .sort((a, b) => dec(b.amount).comparedTo(a.amount));
}

export async function getDashboard(ctx: BusinessContext, filters: Filters): Promise<DashboardData> {
  const today = todayIn(ctx.business.timeZone);
  const initialSettings = await getSettingsAt(ctx, today);
  const f = resolveFilters(ctx, filters, initialSettings.settings.general.defaultDatePreset);
  const { current, previous } = f.period;
  const settingsVersion = current.to === today ? initialSettings : await getSettingsAt(ctx, current.to);
  const settings = settingsVersion.settings;

  // One read covers the period, its comparison, and the 8-week / 6-month
  // comparison charts.
  const weeklyFrom = addDays(startOfWeek(current.to), -7 * 7);
  const monthlyFrom = addMonths(startOfMonth(current.to), -5);
  const windowFrom = [previous.from, weeklyFrom, monthlyFrom].sort()[0];
  const [days, skus, invNow, invPrev, reconNow, reconPrev, overdue, imports, large] = await Promise.all([
    loadDailyInputs(ctx, { from: windowFrom, to: current.to }, settings, f.lineFilters),
    getSkuProfitability(ctx, current, settings, f.lineFilters.channel),
    getInventorySnapshot(ctx, settings, current.to),
    getInventorySnapshot(ctx, settings, previous.to),
    getReconciliationSummary(ctx, current, settings),
    getReconciliationSummary(ctx, previous, settings),
    getOverdue(ctx, current, settings),
    lastImports(ctx),
    f.segment ? Promise.resolve([]) : largeExpenses(ctx, current.from, current.to, settings),
  ]);

  const curInputs = sliceInputs(days, current.from, current.to);
  const prevInputs = sliceInputs(days, previous.from, previous.to);
  const pnl = computeProfitAndLoss(curInputs, settings, { segment: f.segment });
  const previousPnl = computeProfitAndLoss(prevInputs, settings, { segment: f.segment });

  const settledAmount = (inputs: typeof curInputs) => {
    if (f.segment) return money(inputs.settlements.reduce((t, s) => t.plus(s.amount), dec(0)));
    const cf = inputs.cash.filter((c) => c.txnType === "settlement_payout");
    return money(cf.reduce((t, c) => (c.direction === "in" ? t.plus(c.amount) : t.minus(c.amount)), dec(0)));
  };

  const kpis = buildKpis(
    pnl,
    previousPnl,
    {
      settledAmount: settledAmount(curInputs),
      receivables: f.segment ? null : reconNow.outstanding,
      inventoryValue: invNow.totalEstimatedValue ?? invNow.totalValue,
      inventoryIsEstimate: invNow.isEstimate,
    },
    {
      settledAmount: settledAmount(prevInputs),
      receivables: f.segment ? null : reconPrev.outstanding,
      inventoryValue: invPrev.totalEstimatedValue ?? invPrev.totalValue,
      inventoryIsEstimate: invPrev.isEstimate,
    },
    f.query,
  );

  const bucket = bucketForRange(current.from, current.to);
  const series = toSeriesRows(buildSeries(days, current, bucket, settings, f.segment), bucket, current.to, f.segment);
  const weekly = toSeriesRows(buildSeries(days, { from: weeklyFrom, to: current.to }, "week", settings, f.segment), "week", current.to, f.segment);
  const monthly = toSeriesRows(buildSeries(days, { from: monthlyFrom, to: current.to }, "month", settings, f.segment), "month", current.to, f.segment);

  const statusDistribution = curInputs.orders
    .map((o) => ({ status: o.status, lines: o.lines }))
    .filter((s) => s.lines > 0)
    .sort((a, b) => b.lines - a.lines);

  // Expense categories, current vs previous (for the "expense grew" rule).
  const byCategory = new Map<string, { categoryId: string; name: string; current: Money; previous: Money }>();
  for (const [side, inputs] of [["current", curInputs], ["previous", prevInputs]] as const) {
    for (const e of inputs.expenses) {
      if (e.reflectedInSettlement) continue;
      const entry = byCategory.get(e.categoryId) ?? { categoryId: e.categoryId, name: e.categoryName, current: "0.00", previous: "0.00" };
      entry[side] = money(dec(entry[side]).plus(e.amount));
      byCategory.set(e.categoryId, entry);
    }
  }

  const insights = generateInsights({
    today,
    settings,
    current: pnl,
    previous: previousPnl,
    expensesByCategory: [...byCategory.values()],
    skus: skus.map((s) => ({ sku: s.sku, productName: s.productName, contribution: s.contribution, netSoldLines: s.netSoldLines, lossLines: s.lossLines })),
    lowStock: invNow.lowStock.map((m) => ({ materialId: m.materialId, name: m.name, quantity: m.estimatedQuantity ?? m.quantity, threshold: m.reorderThreshold, unit: m.unit })),
    reconciliation: { overdueLines: overdue.lines, overdueAmount: overdue.amount, unlinkedItems: reconNow.unlinkedItems, duplicateLines: reconNow.duplicateLines },
    largeExpenses: large,
    lastImports: imports,
    hasOrders: pnl.counts.lines > 0 || previousPnl.counts.lines > 0,
    hasAdData: [...days.values()].some((d) => d.ads.length > 0),
  });

  return {
    businessName: ctx.business.name,
    generatedAt: new Date().toISOString(),
    period: f.period,
    bucket,
    segment: f.segment,
    query: f.query,
    profitBasis: f.segment ? "contribution" : "net",
    settingsEffectiveFrom: settingsVersion.effectiveFrom,
    policyNotes: describePolicy(settings, settingsVersion.effectiveFrom),
    kpis,
    pnl,
    previousPnl,
    series,
    weekly,
    monthly,
    expenseBreakdown: expenseBreakdown(pnl),
    statusDistribution,
    skus,
    cash: computeCashFlow(curInputs.cash),
    insights,
    receivables: f.segment ? null : reconNow.outstanding,
    inventoryValue: invNow.totalEstimatedValue ?? invNow.totalValue,
    inventoryIsEstimate: invNow.isEstimate,
  };
}

/** The P&L for a period, for reports and exports — the same path as the dashboard. */
export async function getPeriodPnl(ctx: BusinessContext, filters: Filters) {
  const today = todayIn(ctx.business.timeZone);
  const f = resolveFilters(ctx, filters, (await getSettingsAt(ctx, today)).settings.general.defaultDatePreset);
  const version = await getSettingsAt(ctx, f.period.current.to);
  const days = await loadDailyInputs(ctx, f.period.current, version.settings, f.lineFilters);
  const inputs = sliceInputs(days, f.period.current.from, f.period.current.to);
  return {
    filters: f,
    settings: version.settings,
    settingsEffectiveFrom: version.effectiveFrom,
    days,
    inputs,
    pnl: computeProfitAndLoss(inputs, version.settings, { segment: f.segment }),
  };
}
