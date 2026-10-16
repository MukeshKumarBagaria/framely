// The financial calculation service: one pure function turns aggregated
// ledger rows into a profit-and-loss statement. Dashboard tiles, charts,
// reports and exports all call this — no formula is re-implemented elsewhere.
//
// Inputs are additive aggregates (per status / component / category), so the
// P&L of a period is exactly the sum of the P&Ls of its days. Every amount is
// a decimal string; nothing here touches floating point.
import type { BusinessSettings } from "./accounting-policy";
import { statusSets } from "./accounting-policy";
import { computeAdMetrics, type AdMetrics } from "./ad-metrics";
import { dec, money, percentOf, safeDivide, sum, type Money } from "./money";
import {
  settlementPnlLine,
  type CashTxnType,
  type ExpenseTreatment,
  type OrderStatus,
  type SettlementType,
} from "./statuses";

export type OrderAggregate = {
  status: OrderStatus;
  lines: number;
  orders: number;
  units: number;
  listedAmount: Money;
  saleAmount: Money;
  saleAmountExclGst: Money;
  materialCost: Money;
  packagingCost: Money;
  otherCost: Money;
  lineCost: Money;
  missingCostLines: number;
  actualCostLines: number;
};

export type SettlementAggregate = {
  transactionType: SettlementType;
  amount: Money; // signed: credits > 0, deductions < 0
  items: number;
  linkedItems: number;
};

export type ExpenseAggregate = {
  categoryId: string;
  categorySlug: string;
  categoryName: string;
  treatment: ExpenseTreatment;
  reflectedInSettlement: boolean;
  amount: Money;
  recoverableTax: Money;
  entries: number;
};

export type AdAggregate = {
  platform: string;
  spend: Money;
  impressions: number;
  reach: number;
  clicks: number;
  linkClicks: number;
  purchases: Money;
  attributedRevenue: Money;
};

export type CashAggregate = {
  direction: "in" | "out";
  txnType: CashTxnType;
  amount: Money;
  entries: number;
};

export type FinancialInputs = {
  orders: OrderAggregate[];
  settlements: SettlementAggregate[];
  expenses: ExpenseAggregate[];
  ads: AdAggregate[];
  cash: CashAggregate[];
};

export const EMPTY_INPUTS: FinancialInputs = { orders: [], settlements: [], expenses: [], ads: [], cash: [] };

export type CalculationScope = {
  /**
   * True when line-level filters (SKU, status, channel, settlement state)
   * are active. Business-level costs (expenses, campaign spend, other
   * income) cannot be attributed to a slice of orders, so everything below
   * contribution is reported as unavailable rather than misattributed.
   */
  segment: boolean;
};

export type CategoryAmount = { categoryId: string; name: string; slug: string; amount: Money };

export type ProfitAndLoss = {
  revenue: {
    grossOrderValue: Money; // listed price incl. GST, all non-cancelled lines
    recognizedRevenue: Money; // excl. GST
    recognizedRevenueInclGst: Money;
    salesReturns: Money; // excl. GST
    netSales: Money; // excl. GST
    netSalesInclGst: Money;
    gstOnNetSales: Money;
    discountsOnNetSales: Money; // listed − sold price on lines kept as sales, incl. GST
  };
  cogs: { materials: Money; packaging: Money; other: Money; directExpenses: Money | null; total: Money };
  grossProfit: Money;
  variableCosts: {
    platformFees: Money;
    shipping: Money;
    returnShipping: Money;
    penalties: Money;
    returnLosses: Money;
    claims: Money; // credit: reduces costs
    adjustments: Money;
    expenses: Money | null;
    total: Money;
  };
  contributionBeforeAds: Money;
  advertising: {
    campaignSpend: Money | null;
    marketplaceAds: Money;
    expenses: Money | null;
    total: Money | null;
  };
  contributionAfterAds: Money | null;
  operatingExpenses: { lines: CategoryAmount[]; total: Money } | null;
  operatingProfit: Money | null;
  otherIncome: Money | null;
  financeCosts: Money | null;
  incomeTax: Money | null;
  netProfit: Money | null;
  /** True when no income tax is recorded: net profit is "before unrecorded adjustments". */
  netProfitIsEstimate: boolean;
  totalExpenses: Money | null;
  margins: { gross: string | null; contribution: string | null; operating: string | null; net: string | null };
  excluded: {
    inventoryPurchases: Money;
    capitalExpenditure: Money;
    alreadyDeductedExpenses: Money;
    advertisingNotInProfit: Money;
    taxesWithheld: Money; // positive = amount withheld
    unclassifiedSettlement: Money;
    recoverableGstOnExpenses: Money;
  };
  counts: {
    lines: number;
    orders: number;
    units: number;
    deliveredLines: number;
    netSoldLines: number;
    returnedLines: number;
    rtoLines: number;
    cancelledLines: number;
    lostLines: number;
    openLines: number;
    unknownLines: number;
    shippedOutcomeLines: number;
    missingCostLines: number;
    actualCostLines: number;
  };
  rates: {
    returnRtoRate: string | null;
    averageOrderValue: Money | null;
  };
  advertisingMetrics: AdMetrics & {
    spendPercentOfSales: string | null;
    blendedRoas: string | null;
    costPerOrder: Money | null;
  };
  settledSaleReference: Money;
  scope: CalculationScope;
};

function sumWhere<T>(rows: T[], pick: (r: T) => Money, where: (r: T) => boolean = () => true): ReturnType<typeof sum> {
  return sum(rows.filter(where).map(pick));
}

function count<T>(rows: T[], pick: (r: T) => number, where: (r: T) => boolean = () => true): number {
  return rows.filter(where).reduce((n, r) => n + pick(r), 0);
}

export function computeProfitAndLoss(
  inputs: FinancialInputs,
  settings: BusinessSettings,
  scope: CalculationScope = { segment: false },
): ProfitAndLoss {
  const sets = statusSets(settings);
  const inSet = (set: OrderStatus[]) => (r: OrderAggregate) => set.includes(r.status);
  const { orders, settlements, expenses, ads, cash } = inputs;
  const segment = scope.segment;

  // ---- Revenue ---------------------------------------------------------------
  const grossOrderValue = sumWhere(orders, (r) => r.listedAmount, (r) => r.status !== "cancelled");
  const recognized = sumWhere(orders, (r) => r.saleAmountExclGst, inSet(sets.recognized));
  const recognizedIncl = sumWhere(orders, (r) => r.saleAmount, inSet(sets.recognized));
  const returns = sumWhere(orders, (r) => r.saleAmountExclGst, inSet(sets.reversed));
  const returnsIncl = sumWhere(orders, (r) => r.saleAmount, inSet(sets.reversed));
  const netSales = recognized.minus(returns);
  const netSalesIncl = recognizedIncl.minus(returnsIncl);
  const netSoldListed = sumWhere(orders, (r) => r.listedAmount, inSet(sets.netSold));
  const discounts = netSoldListed.minus(netSalesIncl);

  // ---- Cost of goods sold ------------------------------------------------------
  const materials = sumWhere(orders, (r) => r.materialCost, inSet(sets.netSold));
  const packaging = sumWhere(orders, (r) => r.packagingCost, inSet(sets.netSold));
  const otherProduction = sumWhere(orders, (r) => r.otherCost, inSet(sets.netSold));

  const expenseNet = (treatment: ExpenseTreatment) =>
    sumWhere(
      expenses,
      (r) => money(dec(r.amount).minus(r.recoverableTax)),
      (r) => r.treatment === treatment && !r.reflectedInSettlement,
    );
  const directExpenses = segment ? null : expenseNet("cogs_direct");
  const cogsTotal = materials.plus(packaging).plus(otherProduction).plus(directExpenses ?? 0);
  const grossProfit = netSales.minus(cogsTotal);

  // ---- Variable selling costs (settlement deductions are negative) -------------
  const component = (line: ReturnType<typeof settlementPnlLine>) =>
    sumWhere(settlements, (r) => r.amount, (r) => settlementPnlLine(r.transactionType) === line);
  const platformFees = component("platform_fees").negated();
  const shipping = component("shipping").negated();
  const returnShipping = component("return_shipping").negated();
  const penalties = component("penalties").negated();
  const claims = component("claims");
  const adjustments = component("adjustments").negated();
  const recovery = dec(settings.costs.returnedGoodsRecoveryPercent).dividedBy(100);
  const returnLosses = sumWhere(orders, (r) => r.lineCost, inSet(sets.loss)).times(dec(1).minus(recovery));
  const variableExpenses = segment ? null : expenseNet("variable_selling");
  const variableTotal = platformFees
    .plus(shipping)
    .plus(returnShipping)
    .plus(penalties)
    .plus(returnLosses)
    .minus(claims)
    .plus(adjustments)
    .plus(variableExpenses ?? 0);
  const contributionBeforeAds = grossProfit.minus(variableTotal);

  // ---- Advertising -----------------------------------------------------------
  const useMetrics = settings.advertising.costSource === "ad_metrics";
  const campaignSpendAll = sumWhere(ads, (r) => r.spend);
  const advertisingExpensesAll = expenseNet("advertising");
  const marketplaceAds = component("advertising").negated();
  const campaignSpend = segment ? null : useMetrics ? campaignSpendAll : dec(0);
  const advertisingExpenses = segment ? null : useMetrics ? dec(0) : advertisingExpensesAll;
  const advertisingTotal = segment ? null : marketplaceAds.plus(campaignSpend ?? 0).plus(advertisingExpenses ?? 0);
  const contributionAfterAds = advertisingTotal === null ? null : contributionBeforeAds.minus(advertisingTotal);

  // ---- Operating expenses and below ------------------------------------------
  let operatingExpenses: ProfitAndLoss["operatingExpenses"] = null;
  if (!segment) {
    const byCategory = new Map<string, CategoryAmount>();
    for (const r of expenses) {
      if (r.treatment !== "operating" || r.reflectedInSettlement) continue;
      const prev = byCategory.get(r.categoryId);
      const amount = dec(r.amount).minus(r.recoverableTax).plus(prev?.amount ?? 0);
      byCategory.set(r.categoryId, { categoryId: r.categoryId, name: r.categoryName, slug: r.categorySlug, amount: money(amount) });
    }
    const lines = [...byCategory.values()].sort((a, b) => dec(b.amount).comparedTo(a.amount));
    operatingExpenses = { lines, total: money(sum(lines.map((l) => l.amount))) };
  }
  const operatingProfit = contributionAfterAds === null || operatingExpenses === null
    ? null
    : contributionAfterAds.minus(operatingExpenses.total);

  const otherIncome = segment ? null : sumWhere(cash, (r) => r.amount, (r) => r.txnType === "other_income");
  const financeCosts = segment ? null : expenseNet("finance_cost");
  const incomeTax = segment ? null : expenseNet("income_tax");
  const netProfit = operatingProfit === null
    ? null
    : operatingProfit.plus(otherIncome ?? 0).minus(financeCosts ?? 0).minus(incomeTax ?? 0);

  const totalExpenses = segment
    ? null
    : cogsTotal
        .plus(variableTotal)
        .plus(advertisingTotal ?? 0)
        .plus(operatingExpenses?.total ?? 0)
        .plus(financeCosts ?? 0)
        .plus(incomeTax ?? 0);

  // ---- Excluded from profit (shown in notes) ----------------------------------
  const excludedTreatment = (treatment: ExpenseTreatment) =>
    sumWhere(expenses, (r) => r.amount, (r) => r.treatment === treatment && !r.reflectedInSettlement);
  const alreadyDeducted = sumWhere(expenses, (r) => r.amount, (r) => r.reflectedInSettlement);
  const recoverableGst = sumWhere(expenses, (r) => r.recoverableTax, (r) => !r.reflectedInSettlement);

  // ---- Counts and rates -------------------------------------------------------
  const c = (where: (r: OrderAggregate) => boolean) => count(orders, (r) => r.lines, where);
  const netSoldLines = c(inSet(sets.netSold));
  const returnedLines = c((r) => r.status === "returned");
  const rtoLines = c((r) => r.status === "rto");
  const shippedOutcomeLines = c(inSet(sets.shippedOutcome));

  const adBase = computeAdMetrics({
    spend: money(campaignSpendAll),
    impressions: count(ads, (r) => r.impressions),
    clicks: count(ads, (r) => r.clicks),
    linkClicks: count(ads, (r) => r.linkClicks),
    purchases: money(sum(ads.map((r) => r.purchases))),
    attributedRevenue: money(sum(ads.map((r) => r.attributedRevenue))),
  });
  const spendForRatios = advertisingTotal ?? dec(0);
  const blendedRoas = safeDivide(netSalesIncl, spendForRatios);
  const costPerOrder = safeDivide(spendForRatios, netSoldLines);

  const m = (v: ReturnType<typeof dec> | null) => (v === null ? null : money(v));
  const margin = (v: ReturnType<typeof dec> | null) => (v === null ? null : percentOf(v, netSales));

  return {
    revenue: {
      grossOrderValue: money(grossOrderValue),
      recognizedRevenue: money(recognized),
      recognizedRevenueInclGst: money(recognizedIncl),
      salesReturns: money(returns),
      netSales: money(netSales),
      netSalesInclGst: money(netSalesIncl),
      gstOnNetSales: money(netSalesIncl.minus(netSales)),
      discountsOnNetSales: money(discounts),
    },
    cogs: {
      materials: money(materials),
      packaging: money(packaging),
      other: money(otherProduction),
      directExpenses: m(directExpenses),
      total: money(cogsTotal),
    },
    grossProfit: money(grossProfit),
    variableCosts: {
      platformFees: money(platformFees),
      shipping: money(shipping),
      returnShipping: money(returnShipping),
      penalties: money(penalties),
      returnLosses: money(returnLosses),
      claims: money(claims),
      adjustments: money(adjustments),
      expenses: m(variableExpenses),
      total: money(variableTotal),
    },
    contributionBeforeAds: money(contributionBeforeAds),
    advertising: {
      campaignSpend: m(campaignSpend),
      marketplaceAds: money(marketplaceAds),
      expenses: m(advertisingExpenses),
      total: m(advertisingTotal),
    },
    contributionAfterAds: m(contributionAfterAds),
    operatingExpenses,
    operatingProfit: m(operatingProfit),
    otherIncome: m(otherIncome),
    financeCosts: m(financeCosts),
    incomeTax: m(incomeTax),
    netProfit: m(netProfit),
    netProfitIsEstimate: incomeTax === null || incomeTax.isZero(),
    totalExpenses: m(totalExpenses),
    margins: {
      gross: margin(grossProfit),
      contribution: margin(contributionAfterAds ?? contributionBeforeAds),
      operating: margin(operatingProfit),
      net: margin(netProfit),
    },
    excluded: {
      inventoryPurchases: money(excludedTreatment("inventory_purchase")),
      capitalExpenditure: money(excludedTreatment("capital")),
      alreadyDeductedExpenses: money(alreadyDeducted),
      advertisingNotInProfit: money(useMetrics ? advertisingExpensesAll : campaignSpendAll),
      taxesWithheld: money(component("tax_withheld").negated()),
      unclassifiedSettlement: money(component("excluded_unclassified")),
      recoverableGstOnExpenses: money(recoverableGst),
    },
    counts: {
      lines: c(() => true),
      orders: count(orders, (r) => r.orders),
      units: count(orders, (r) => r.units),
      deliveredLines: c(inSet(sets.delivered)),
      netSoldLines,
      returnedLines,
      rtoLines,
      cancelledLines: c((r) => r.status === "cancelled"),
      lostLines: c((r) => r.status === "lost"),
      openLines: c((r) => r.status === "pending" || r.status === "shipped"),
      unknownLines: c((r) => r.status === "unknown"),
      shippedOutcomeLines,
      missingCostLines: count(orders, (r) => r.missingCostLines, (r) => sets.netSold.includes(r.status) || sets.loss.includes(r.status)),
      actualCostLines: count(orders, (r) => r.actualCostLines),
    },
    rates: {
      returnRtoRate: percentOf(returnedLines + rtoLines, shippedOutcomeLines),
      averageOrderValue: m(safeDivide(netSales, netSoldLines)),
    },
    advertisingMetrics: {
      ...adBase,
      spendPercentOfSales: advertisingTotal === null ? null : percentOf(advertisingTotal, netSales),
      blendedRoas: blendedRoas === null ? null : blendedRoas.toDecimalPlaces(2).toFixed(2),
      costPerOrder: m(costPerOrder),
    },
    settledSaleReference: money(component("revenue_reference")),
    scope,
  };
}

// ---- Combining and bucketing inputs ------------------------------------------------

/** Re-sums aggregates by their natural keys (used to roll days up into buckets). */
export function mergeInputs(parts: FinancialInputs[]): FinancialInputs {
  const orders = new Map<string, OrderAggregate>();
  const settlements = new Map<string, SettlementAggregate>();
  const expenses = new Map<string, ExpenseAggregate>();
  const ads = new Map<string, AdAggregate>();
  const cash = new Map<string, CashAggregate>();

  for (const p of parts) {
    for (const r of p.orders) {
      const prev = orders.get(r.status);
      orders.set(
        r.status,
        prev
          ? {
              status: r.status,
              lines: prev.lines + r.lines,
              orders: prev.orders + r.orders,
              units: prev.units + r.units,
              listedAmount: money(dec(prev.listedAmount).plus(r.listedAmount)),
              saleAmount: money(dec(prev.saleAmount).plus(r.saleAmount)),
              saleAmountExclGst: money(dec(prev.saleAmountExclGst).plus(r.saleAmountExclGst)),
              materialCost: money(dec(prev.materialCost).plus(r.materialCost)),
              packagingCost: money(dec(prev.packagingCost).plus(r.packagingCost)),
              otherCost: money(dec(prev.otherCost).plus(r.otherCost)),
              lineCost: money(dec(prev.lineCost).plus(r.lineCost)),
              missingCostLines: prev.missingCostLines + r.missingCostLines,
              actualCostLines: prev.actualCostLines + r.actualCostLines,
            }
          : { ...r },
      );
    }
    for (const r of p.settlements) {
      const prev = settlements.get(r.transactionType);
      settlements.set(
        r.transactionType,
        prev
          ? {
              transactionType: r.transactionType,
              amount: money(dec(prev.amount).plus(r.amount)),
              items: prev.items + r.items,
              linkedItems: prev.linkedItems + r.linkedItems,
            }
          : { ...r },
      );
    }
    for (const r of p.expenses) {
      const k = `${r.categoryId}|${r.reflectedInSettlement}`;
      const prev = expenses.get(k);
      expenses.set(
        k,
        prev
          ? {
              ...prev,
              amount: money(dec(prev.amount).plus(r.amount)),
              recoverableTax: money(dec(prev.recoverableTax).plus(r.recoverableTax)),
              entries: prev.entries + r.entries,
            }
          : { ...r },
      );
    }
    for (const r of p.ads) {
      const prev = ads.get(r.platform);
      ads.set(
        r.platform,
        prev
          ? {
              platform: r.platform,
              spend: money(dec(prev.spend).plus(r.spend)),
              impressions: prev.impressions + r.impressions,
              reach: prev.reach + r.reach,
              clicks: prev.clicks + r.clicks,
              linkClicks: prev.linkClicks + r.linkClicks,
              purchases: money(dec(prev.purchases).plus(r.purchases)),
              attributedRevenue: money(dec(prev.attributedRevenue).plus(r.attributedRevenue)),
            }
          : { ...r },
      );
    }
    for (const r of p.cash) {
      const k = `${r.direction}|${r.txnType}`;
      const prev = cash.get(k);
      cash.set(
        k,
        prev ? { ...prev, amount: money(dec(prev.amount).plus(r.amount)), entries: prev.entries + r.entries } : { ...r },
      );
    }
  }
  return {
    orders: [...orders.values()],
    settlements: [...settlements.values()],
    expenses: [...expenses.values()],
    ads: [...ads.values()],
    cash: [...cash.values()],
  };
}

// ---- Cash flow ------------------------------------------------------------------

export type CashFlowSummary = {
  inflows: { txnType: CashTxnType; amount: Money; entries: number }[];
  outflows: { txnType: CashTxnType; amount: Money; entries: number }[];
  totalIn: Money;
  totalOut: Money;
  net: Money;
  operatingNet: Money; // excludes capital, owner and loan movements
};

const FINANCING: CashTxnType[] = ["capital_injection", "owner_withdrawal", "loan_received", "loan_repayment"];

export function computeCashFlow(cash: CashAggregate[]): CashFlowSummary {
  const group = (direction: "in" | "out") => {
    const m = new Map<CashTxnType, { txnType: CashTxnType; amount: Money; entries: number }>();
    for (const r of cash) {
      if (r.direction !== direction) continue;
      const prev = m.get(r.txnType);
      m.set(r.txnType, {
        txnType: r.txnType,
        amount: money(dec(prev?.amount).plus(r.amount)),
        entries: (prev?.entries ?? 0) + r.entries,
      });
    }
    return [...m.values()].sort((a, b) => dec(b.amount).comparedTo(a.amount));
  };
  const totalIn = sum(cash.filter((r) => r.direction === "in").map((r) => r.amount));
  const totalOut = sum(cash.filter((r) => r.direction === "out").map((r) => r.amount));
  const finIn = sum(cash.filter((r) => r.direction === "in" && FINANCING.includes(r.txnType)).map((r) => r.amount));
  const finOut = sum(cash.filter((r) => r.direction === "out" && FINANCING.includes(r.txnType)).map((r) => r.amount));
  return {
    inflows: group("in"),
    outflows: group("out"),
    totalIn: money(totalIn),
    totalOut: money(totalOut),
    net: money(totalIn.minus(totalOut)),
    operatingNet: money(totalIn.minus(finIn).minus(totalOut.minus(finOut))),
  };
}

// ---- Expense breakdown (for the donut and the expense report) ---------------------

export type BreakdownSlice = { key: string; label: string; amount: Money; href?: string };

export function expenseBreakdown(pnl: ProfitAndLoss): BreakdownSlice[] {
  const slices: BreakdownSlice[] = [
    { key: "materials", label: "Materials", amount: pnl.cogs.materials, href: "products" },
    { key: "packaging", label: "Packaging", amount: pnl.cogs.packaging, href: "products" },
    { key: "other_production", label: "Other production", amount: pnl.cogs.other, href: "products" },
    { key: "direct_expenses", label: "Direct costs (expenses)", amount: pnl.cogs.directExpenses ?? "0.00", href: "expenses" },
    { key: "platform_fees", label: "Platform fees", amount: pnl.variableCosts.platformFees, href: "reconciliation" },
    { key: "shipping", label: "Shipping", amount: pnl.variableCosts.shipping, href: "reconciliation" },
    { key: "return_shipping", label: "Return/RTO shipping", amount: pnl.variableCosts.returnShipping, href: "reconciliation" },
    { key: "penalties", label: "Penalties", amount: pnl.variableCosts.penalties, href: "reconciliation" },
    { key: "return_losses", label: "Return/RTO product loss", amount: pnl.variableCosts.returnLosses, href: "orders?status=rto" },
    { key: "adjustments", label: "Other platform adjustments", amount: pnl.variableCosts.adjustments, href: "reconciliation" },
    { key: "variable_expenses", label: "Other selling costs", amount: pnl.variableCosts.expenses ?? "0.00", href: "expenses" },
    { key: "advertising", label: "Advertising", amount: pnl.advertising.total ?? "0.00", href: "advertising" },
    ...(pnl.operatingExpenses?.lines ?? []).map((l) => ({
      key: `opex_${l.slug}`,
      label: l.name,
      amount: l.amount,
      href: `expenses?category=${encodeURIComponent(l.categoryId)}`,
    })),
    { key: "finance", label: "Finance costs", amount: pnl.financeCosts ?? "0.00", href: "expenses" },
    { key: "tax", label: "Income tax", amount: pnl.incomeTax ?? "0.00", href: "expenses" },
  ];
  return slices.filter((s) => dec(s.amount).greaterThan(0));
}
