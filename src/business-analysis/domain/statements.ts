// The profit-and-loss statement as rows, used by every export format. Rows
// are derived from the same ProfitAndLoss object the dashboard shows, so an
// exported total can never differ from the on-screen one.
import type { ProfitAndLoss } from "./financial-calculations";
import { dec, money, type Money } from "./money";

export type StatementRow = {
  section: string;
  line: string;
  amount: Money | null;
  kind: "item" | "subtotal" | "total" | "note";
  /** Sign the item contributes to its subtotal: +1 adds, −1 deducts. */
  sign?: 1 | -1;
  note?: string;
};

const neg = (v: Money | null) => (v === null ? null : money(dec(v).negated()));

export function profitAndLossStatement(p: ProfitAndLoss): StatementRow[] {
  const rows: StatementRow[] = [];
  const item = (section: string, line: string, amount: Money | null, sign: 1 | -1, note?: string) =>
    rows.push({ section, line, amount, kind: "item", sign, note });
  const sub = (section: string, line: string, amount: Money | null, kind: "subtotal" | "total" = "subtotal", note?: string) =>
    rows.push({ section, line, amount, kind, note });

  item("Revenue", "Recognised sales (excl. GST)", p.revenue.recognizedRevenue, 1);
  item("Revenue", "Less: sales returns", neg(p.revenue.salesReturns), 1);
  sub("Revenue", "Net sales", p.revenue.netSales);

  item("Cost of goods sold", "Materials", neg(p.cogs.materials), 1, p.counts.actualCostLines > 0 ? "Includes recorded actual costs" : "Recipe estimates");
  item("Cost of goods sold", "Packaging", neg(p.cogs.packaging), 1);
  item("Cost of goods sold", "Other production costs", neg(p.cogs.other), 1);
  if (p.cogs.directExpenses !== null) item("Cost of goods sold", "Direct costs from expenses", neg(p.cogs.directExpenses), 1);
  sub("Cost of goods sold", "Gross profit", p.grossProfit);

  const v = p.variableCosts;
  item("Selling costs", "Platform commission & fees", neg(v.platformFees), 1);
  item("Selling costs", "Shipping charges", neg(v.shipping), 1);
  item("Selling costs", "Return/RTO shipping", neg(v.returnShipping), 1);
  item("Selling costs", "Penalties & recoveries", neg(v.penalties), 1);
  item("Selling costs", "Return/RTO product losses", neg(v.returnLosses), 1);
  item("Selling costs", "Claims & compensation received", v.claims, 1);
  item("Selling costs", "Other platform adjustments", neg(v.adjustments), 1);
  if (v.expenses !== null) item("Selling costs", "Other selling expenses", neg(v.expenses), 1);
  sub("Selling costs", "Contribution before advertising", p.contributionBeforeAds);

  if (p.advertising.total !== null) {
    if (p.advertising.campaignSpend !== null) item("Advertising", "Campaign spend", neg(p.advertising.campaignSpend), 1);
    item("Advertising", "Marketplace ads", neg(p.advertising.marketplaceAds), 1);
    if (p.advertising.expenses !== null) item("Advertising", "Advertising expenses", neg(p.advertising.expenses), 1);
    sub("Advertising", "Contribution after advertising", p.contributionAfterAds);
  }

  if (p.operatingExpenses) {
    for (const l of p.operatingExpenses.lines) item("Operating expenses", l.name, neg(l.amount), 1);
    sub("Operating expenses", "Operating profit", p.operatingProfit);
  }

  if (p.netProfit !== null) {
    item("Other items", "Other income", p.otherIncome, 1);
    item("Other items", "Finance costs", neg(p.financeCosts), 1);
    item("Other items", "Income tax", neg(p.incomeTax), 1);
    sub("Other items", p.netProfitIsEstimate ? "Net profit (estimated, before unrecorded adjustments)" : "Net profit", p.netProfit, "total");
  }

  const x = p.excluded;
  rows.push({ section: "Not in profit", line: "GST collected on net sales", amount: p.revenue.gstOnNetSales, kind: "note", note: "Collected for the government" });
  rows.push({ section: "Not in profit", line: "Material & packaging purchases", amount: x.inventoryPurchases, kind: "note", note: "Cash and stock; cost reaches profit through COGS" });
  rows.push({ section: "Not in profit", line: "Capital expenditure", amount: x.capitalExpenditure, kind: "note", note: "Cash only; depreciation not recorded" });
  rows.push({ section: "Not in profit", line: "Expenses already deducted by the platform", amount: x.alreadyDeductedExpenses, kind: "note", note: "Counted once, via settlements" });
  rows.push({ section: "Not in profit", line: "Advertising recorded elsewhere", amount: x.advertisingNotInProfit, kind: "note", note: "Excluded to avoid double counting" });
  rows.push({ section: "Not in profit", line: "TCS/TDS withheld", amount: x.taxesWithheld, kind: "note", note: "Claimable tax credits" });
  rows.push({ section: "Not in profit", line: "Settlements without a breakdown", amount: x.unclassifiedSettlement, kind: "note", note: "Cannot be split into sale and fees" });
  rows.push({ section: "Not in profit", line: "Recoverable GST on expenses", amount: x.recoverableGstOnExpenses, kind: "note", note: "Input tax credit" });
  return rows;
}

/**
 * Re-adds each section's items onto the previous subtotal and returns any
 * subtotal that does not match. Used by tests and as an export self-check.
 */
export function verifyStatement(rows: StatementRow[]): { line: string; expected: Money; computed: Money }[] {
  const problems: { line: string; expected: Money; computed: Money }[] = [];
  let running = dec(0);
  for (const r of rows) {
    if (r.kind === "item" && r.amount !== null) running = running.plus(dec(r.amount).times(r.sign ?? 1));
    if ((r.kind === "subtotal" || r.kind === "total") && r.amount !== null) {
      if (!running.equals(r.amount)) problems.push({ line: r.line, expected: r.amount, computed: money(running) });
      running = dec(r.amount);
    }
  }
  return problems;
}
