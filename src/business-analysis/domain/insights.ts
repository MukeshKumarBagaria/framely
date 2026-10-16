// Rule-based insights. Every insight states the numbers it was derived from
// and links to the records behind them. Rules describe what changed; they do
// not claim why (no causation from correlation).
import type { BusinessSettings, ReportType } from "./accounting-policy";
import { diffDays, formatDateIN, type IsoDate } from "./dates";
import type { ProfitAndLoss } from "./financial-calculations";
import { dec, formatINR, formatPercent, type Money } from "./money";

export type InsightSeverity = "critical" | "warning" | "info";

export type Insight = {
  id: string;
  severity: InsightSeverity;
  title: string;
  detail: string;
  href?: string;
};

export type InsightContext = {
  today: IsoDate;
  settings: BusinessSettings;
  current: ProfitAndLoss;
  previous: ProfitAndLoss;
  expensesByCategory: { categoryId: string; name: string; current: Money; previous: Money }[];
  skus: { sku: string; productName: string | null; contribution: Money; netSoldLines: number; lossLines: number }[];
  lowStock: { materialId: string; name: string; quantity: string; threshold: string; unit: string }[];
  reconciliation: { overdueLines: number; overdueAmount: Money; unlinkedItems: number; duplicateLines: number };
  largeExpenses: { id: string; date: IsoDate; label: string; amount: Money; typical: Money }[];
  /** null when the viewer may not see import history (viewers). */
  lastImports: Partial<Record<ReportType, IsoDate | null>> | null;
  hasOrders: boolean;
  hasAdData: boolean;
};

const REPORT_LABELS: Record<ReportType, string> = {
  meesho_orders: "Meesho order report",
  meesho_settlements: "Meesho payment/settlement report",
  meesho_returns: "Meesho returns report",
  platform_fees: "Fee and deduction report",
  meta_ads: "Meta Ads report",
};

export function generateInsights(ctx: InsightContext): Insight[] {
  const out: Insight[] = [];
  const t = ctx.settings.thresholds;
  const cur = ctx.current;
  const prev = ctx.previous;

  // GST not configured — every revenue figure depends on it.
  if (ctx.settings.gst.registered === null && ctx.hasOrders) {
    out.push({
      id: "gst_unconfigured",
      severity: "warning",
      title: "GST treatment is not configured",
      detail: "Revenue and margins currently include any GST collected. Set your GST registration and default rate in Settings.",
      href: "settings",
    });
  }

  // Missing material costs.
  if (cur.counts.missingCostLines > 0) {
    out.push({
      id: "missing_costs",
      severity: "warning",
      title: `${cur.counts.missingCostLines} order line${cur.counts.missingCostLines === 1 ? "" : "s"} have no product cost`,
      detail: "Their cost of goods is counted as ₹0, which overstates profit. Add a recipe for the SKU (Product costing) and re-run costing for the period.",
      href: "products",
    });
  }

  // Unknown statuses.
  if (cur.counts.unknownLines > 0) {
    out.push({
      id: "unknown_status",
      severity: "warning",
      title: `${cur.counts.unknownLines} order line${cur.counts.unknownLines === 1 ? "" : "s"} have an unrecognised status`,
      detail: "They are excluded from revenue until mapped. Add the status wording under Settings → Import mappings.",
      href: "orders?status=unknown",
    });
  }

  // Margin decline.
  if (cur.margins.net !== null && prev.margins.net !== null) {
    const drop = dec(prev.margins.net).minus(cur.margins.net);
    if (drop.greaterThanOrEqualTo(t.marginDropPoints)) {
      out.push({
        id: "margin_decline",
        severity: "warning",
        title: `Net margin fell ${drop.toDecimalPlaces(1).toFixed(1)} points`,
        detail: `From ${formatPercent(prev.margins.net)} in the previous period to ${formatPercent(cur.margins.net)} now.`,
        href: "reports",
      });
    }
  }

  // Return/RTO rate.
  if (cur.rates.returnRtoRate !== null && dec(cur.rates.returnRtoRate).greaterThan(t.rtoRatePercent) && cur.counts.shippedOutcomeLines >= 10) {
    out.push({
      id: "rto_rate",
      severity: dec(cur.rates.returnRtoRate).greaterThan(t.rtoRatePercent * 1.5) ? "critical" : "warning",
      title: `Return/RTO rate is ${formatPercent(cur.rates.returnRtoRate)}`,
      detail: `${cur.counts.rtoLines} RTO and ${cur.counts.returnedLines} returned of ${cur.counts.shippedOutcomeLines} shipped lines with an outcome (threshold ${t.rtoRatePercent}%). Product losses from these: ${formatINR(cur.variableCosts.returnLosses)}.`,
      href: "orders?status=rto",
    });
  }

  // Advertising thresholds.
  if (cur.advertisingMetrics.spendPercentOfSales !== null && dec(cur.advertisingMetrics.spendPercentOfSales).greaterThan(ctx.settings.advertising.maxSpendPercentOfSales)) {
    out.push({
      id: "ad_spend_share",
      severity: "warning",
      title: `Advertising is ${formatPercent(cur.advertisingMetrics.spendPercentOfSales)} of net sales`,
      detail: `${formatINR(cur.advertising.total)} spent against ${formatINR(cur.revenue.netSales)} net sales; your limit is ${ctx.settings.advertising.maxSpendPercentOfSales}%.`,
      href: "advertising",
    });
  }
  if (cur.advertisingMetrics.roas !== null && dec(cur.advertisingMetrics.roas).lessThan(ctx.settings.advertising.minRoas)) {
    out.push({
      id: "low_roas",
      severity: "info",
      title: `Platform-reported ROAS is ${cur.advertisingMetrics.roas}×`,
      detail: `Below your target of ${ctx.settings.advertising.minRoas}×. This is the ad platform's own attribution, which can differ from actual marketplace sales.`,
      href: "advertising",
    });
  }

  // Expense categories that grew.
  for (const c of ctx.expensesByCategory) {
    const p = dec(c.previous);
    const n = dec(c.current);
    const delta = n.minus(p);
    if (p.greaterThan(0) && delta.greaterThanOrEqualTo(t.expenseIncreaseMinAmount)
        && delta.dividedBy(p).times(100).greaterThanOrEqualTo(t.expenseIncreasePercent)) {
      out.push({
        id: `expense_up_${c.categoryId}`,
        severity: "info",
        title: `${c.name} up ${delta.dividedBy(p).times(100).toDecimalPlaces(0).toFixed(0)}%`,
        detail: `${formatINR(c.current)} this period vs ${formatINR(c.previous)} in the previous period (+${formatINR(delta)}).`,
        href: `expenses?category=${encodeURIComponent(c.categoryId)}`,
      });
    }
  }

  // Unusually large expenses.
  for (const e of ctx.largeExpenses.slice(0, 3)) {
    out.push({
      id: `large_expense_${e.id}`,
      severity: "info",
      title: `Large expense: ${formatINR(e.amount)}`,
      detail: `${e.label} on ${formatDateIN(e.date)} — about ${dec(e.amount).dividedBy(dec(e.typical).isZero() ? 1 : e.typical).toDecimalPlaces(1).toFixed(1)}× the typical entry in its category.`,
      href: `expenses?search=${encodeURIComponent(e.id)}`,
    });
  }

  // Negative-contribution SKUs.
  const losers = ctx.skus.filter((s) => dec(s.contribution).lessThan(0) && s.netSoldLines + s.lossLines >= 3);
  if (losers.length > 0) {
    const worst = losers.sort((a, b) => dec(a.contribution).comparedTo(b.contribution)).slice(0, 3);
    out.push({
      id: "negative_skus",
      severity: "warning",
      title: `${losers.length} SKU${losers.length === 1 ? " has" : "s have"} negative contribution`,
      detail: worst.map((s) => `${s.sku} (${formatINR(s.contribution)})`).join(", ") + " — after product cost, platform deductions and return losses, before advertising.",
      href: `orders?sku=${encodeURIComponent(worst[0].sku)}&profitability=loss`,
    });
  }

  // Low stock.
  if (ctx.lowStock.length > 0) {
    out.push({
      id: "low_stock",
      severity: "warning",
      title: `${ctx.lowStock.length} material${ctx.lowStock.length === 1 ? " is" : "s are"} at or below reorder level`,
      detail: ctx.lowStock.slice(0, 4).map((m) => `${m.name}: ${m.quantity} ${m.unit} (reorder at ${m.threshold})`).join("; "),
      href: "inventory",
    });
  }

  // Reconciliation.
  if (ctx.reconciliation.overdueLines > 0) {
    out.push({
      id: "unreconciled",
      severity: "warning",
      title: `${ctx.reconciliation.overdueLines} delivered line${ctx.reconciliation.overdueLines === 1 ? "" : "s"} unsettled after ${ctx.settings.settlements.expectedSettlementLagDays} days`,
      detail: `${formatINR(ctx.reconciliation.overdueAmount)} of expected sale value has no matching settlement yet. Import the latest payment report or check with the platform.`,
      href: "reconciliation?status=unsettled",
    });
  }
  if (ctx.reconciliation.duplicateLines > 0) {
    out.push({
      id: "duplicate_settlements",
      severity: "critical",
      title: `${ctx.reconciliation.duplicateLines} line${ctx.reconciliation.duplicateLines === 1 ? "" : "s"} may be settled twice`,
      detail: "The same amount appears in more than one settlement for these order lines. Review them before relying on settled totals.",
      href: "reconciliation?status=duplicate_suspected",
    });
  }
  if (ctx.reconciliation.unlinkedItems > 0) {
    out.push({
      id: "unlinked_settlements",
      severity: "info",
      title: `${ctx.reconciliation.unlinkedItems} settlement amount${ctx.reconciliation.unlinkedItems === 1 ? "" : "s"} not linked to an order`,
      detail: "Import the matching order report or link them manually in Reconciliation.",
      href: "reconciliation?view=unlinked",
    });
  }

  // Missing or stale imports.
  const required: ReportType[] = ["meesho_orders", "meesho_settlements"];
  if (ctx.hasAdData) required.push("meta_ads");
  for (const type of ctx.lastImports ? required : []) {
    const last = ctx.lastImports?.[type];
    if (!last) {
      out.push({
        id: `import_missing_${type}`,
        severity: type === "meesho_orders" ? "critical" : "warning",
        title: `No ${REPORT_LABELS[type]} imported yet`,
        detail: type === "meesho_settlements"
          ? "Without settlements, platform deductions and payouts are unknown, so profit excludes them."
          : "Import one from the Imports page to populate this data.",
        href: "imports",
      });
    } else if (diffDays(last, ctx.today) > t.importStaleDays) {
      out.push({
        id: `import_stale_${type}`,
        severity: "info",
        title: `${REPORT_LABELS[type]} last imported ${diffDays(last, ctx.today)} days ago`,
        detail: `Most recent import on ${formatDateIN(last)}. Recent figures may be incomplete.`,
        href: "imports",
      });
    }
  }

  const rank: Record<InsightSeverity, number> = { critical: 0, warning: 1, info: 2 };
  return out.sort((a, b) => rank[a.severity] - rank[b.severity]);
}
