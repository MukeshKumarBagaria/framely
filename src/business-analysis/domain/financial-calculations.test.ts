import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, settingsSchema, type BusinessSettings } from "./accounting-policy";
import {
  computeCashFlow,
  computeProfitAndLoss,
  EMPTY_INPUTS,
  expenseBreakdown,
  mergeInputs,
  type ExpenseAggregate,
  type FinancialInputs,
  type OrderAggregate,
} from "./financial-calculations";
import { dec } from "./money";
import type { OrderStatus } from "./statuses";

function order(status: OrderStatus, lines: number, listed: string, sale: string, saleExcl: string, material: string, packaging = "0.00", extra: Partial<OrderAggregate> = {}): OrderAggregate {
  const lineCost = dec(material).plus(packaging).toFixed(2);
  return {
    status, lines, orders: lines, units: lines,
    listedAmount: listed, saleAmount: sale, saleAmountExclGst: saleExcl,
    materialCost: material, packagingCost: packaging, otherCost: "0.00", lineCost,
    missingCostLines: 0, actualCostLines: 0, ...extra,
  };
}

function expense(slug: string, treatment: ExpenseAggregate["treatment"], amount: string, extra: Partial<ExpenseAggregate> = {}): ExpenseAggregate {
  return { categoryId: `cat-${slug}`, categorySlug: slug, categoryName: slug, treatment, reflectedInSettlement: false, amount, recoverableTax: "0.00", entries: 1, ...extra };
}

const settings = (patch: Record<string, unknown> = {}): BusinessSettings => settingsSchema.parse(patch);

// A month with every kind of event. Expected values are worked by hand in
// the comments so a reader can audit the rules.
const FIXTURE: FinancialInputs = {
  orders: [
    order("delivered", 10, "5000.00", "4200.00", "4000.00", "1000.00", "200.00"),
    order("returned", 1, "500.00", "420.00", "400.00", "120.00"),
    order("rto", 2, "1000.00", "840.00", "800.00", "240.00"),
    order("cancelled", 3, "1500.00", "1260.00", "1200.00", "360.00"),
    order("shipped", 1, "500.00", "420.00", "400.00", "120.00"),
  ],
  settlements: [
    { transactionType: "sale", amount: "3800.00", items: 9, linkedItems: 9 },
    { transactionType: "commission", amount: "-200.00", items: 9, linkedItems: 9 },
    { transactionType: "shipping_fee", amount: "-150.00", items: 9, linkedItems: 9 },
    { transactionType: "return_shipping_fee", amount: "-80.00", items: 2, linkedItems: 2 },
    { transactionType: "tcs", amount: "-20.00", items: 9, linkedItems: 9 },
    { transactionType: "tds", amount: "-5.00", items: 9, linkedItems: 9 },
    { transactionType: "claim", amount: "50.00", items: 1, linkedItems: 1 },
    { transactionType: "adjustment", amount: "-10.00", items: 1, linkedItems: 1 },
    { transactionType: "unclassified", amount: "100.00", items: 1, linkedItems: 0 },
    { transactionType: "ads_fee", amount: "-100.00", items: 1, linkedItems: 0 },
  ],
  expenses: [
    expense("rent", "operating", "1180.00", { recoverableTax: "180.00" }),
    expense("raw_materials", "inventory_purchase", "5000.00"),
    expense("shipping", "variable_selling", "150.00", { reflectedInSettlement: true }),
    expense("advertising", "advertising", "300.00"),
    expense("equipment", "capital", "2000.00"),
    expense("finance_costs", "finance_cost", "50.00"),
  ],
  ads: [{ platform: "meta", spend: "400.00", impressions: 20000, reach: 15000, clicks: 400, linkClicks: 300, purchases: "4.00", attributedRevenue: "1600.00" }],
  cash: [
    { direction: "in", txnType: "other_income", amount: "70.00", entries: 1 },
    { direction: "in", txnType: "settlement_payout", amount: "3485.00", entries: 2 },
    { direction: "out", txnType: "expense_payment", amount: "8680.00", entries: 6 },
    { direction: "in", txnType: "capital_injection", amount: "10000.00", entries: 1 },
  ],
};

describe("computeProfitAndLoss — revenue on delivery (default)", () => {
  const pnl = computeProfitAndLoss(FIXTURE, DEFAULT_SETTINGS);

  it("excludes cancellations from gross order value and revenue", () => {
    expect(pnl.revenue.grossOrderValue).toBe("7000.00"); // 5000 + 500 + 1000 + 500
    expect(pnl.revenue.recognizedRevenue).toBe("4400.00"); // delivered 4000 + returned 400
  });

  it("deducts customer returns and never recognises RTO", () => {
    expect(pnl.revenue.salesReturns).toBe("400.00");
    expect(pnl.revenue.netSales).toBe("4000.00");
    expect(pnl.revenue.gstOnNetSales).toBe("200.00");
  });

  it("charges COGS only for kept sales, and RTO/return product cost as a loss", () => {
    expect(pnl.cogs).toMatchObject({ materials: "1000.00", packaging: "200.00", total: "1200.00" });
    expect(pnl.grossProfit).toBe("2800.00");
    expect(pnl.variableCosts.returnLosses).toBe("360.00"); // 120 + 240, no recovery
  });

  it("takes platform deductions from settlements, excluding TCS/TDS and the sale itself", () => {
    expect(pnl.variableCosts).toMatchObject({
      platformFees: "200.00",
      shipping: "150.00",
      returnShipping: "80.00",
      claims: "50.00",
      adjustments: "10.00",
      total: "750.00", // 200 + 150 + 80 + 360 − 50 + 10
    });
    expect(pnl.contributionBeforeAds).toBe("2050.00");
    expect(pnl.excluded.taxesWithheld).toBe("25.00");
    expect(pnl.excluded.unclassifiedSettlement).toBe("100.00");
    expect(pnl.settledSaleReference).toBe("3800.00");
  });

  it("counts campaign spend once and keeps advertising expenses out of profit", () => {
    expect(pnl.advertising).toMatchObject({ campaignSpend: "400.00", marketplaceAds: "100.00", expenses: "0.00", total: "500.00" });
    expect(pnl.excluded.advertisingNotInProfit).toBe("300.00");
    expect(pnl.contributionAfterAds).toBe("1550.00");
  });

  it("nets recoverable GST out of expenses and excludes stock, capex and platform-deducted costs", () => {
    expect(pnl.operatingExpenses?.total).toBe("1000.00");
    expect(pnl.operatingProfit).toBe("550.00");
    expect(pnl.excluded).toMatchObject({
      inventoryPurchases: "5000.00",
      capitalExpenditure: "2000.00",
      alreadyDeductedExpenses: "150.00",
      recoverableGstOnExpenses: "180.00",
    });
  });

  it("labels net profit as an estimate when no income tax is recorded", () => {
    expect(pnl.otherIncome).toBe("70.00");
    expect(pnl.financeCosts).toBe("50.00");
    expect(pnl.netProfit).toBe("570.00");
    expect(pnl.netProfitIsEstimate).toBe(true);
  });

  it("reconciles: net sales − total expenses + other income = net profit", () => {
    expect(pnl.totalExpenses).toBe("3500.00");
    expect(dec(pnl.revenue.netSales).minus(pnl.totalExpenses!).plus(pnl.otherIncome!).toFixed(2)).toBe(pnl.netProfit);
  });

  it("computes margins, rates and AOV against net sales", () => {
    expect(pnl.margins.gross).toBe("70.00");
    expect(pnl.margins.net).toBe("14.25");
    expect(pnl.rates.returnRtoRate).toBe("23.08"); // 3 of 13 lines with an outcome
    expect(pnl.rates.averageOrderValue).toBe("400.00");
    expect(pnl.counts).toMatchObject({ deliveredLines: 10, netSoldLines: 10, cancelledLines: 3, openLines: 1, shippedOutcomeLines: 13 });
  });

  it("computes advertising ratios", () => {
    expect(pnl.advertisingMetrics).toMatchObject({
      cpm: "20.00", cpc: "1.00", ctr: "2.00", roas: "4.00", costPerPurchase: "100.00",
      spendPercentOfSales: "12.50", blendedRoas: "8.40", costPerOrder: "50.00",
    });
  });
});

describe("computeProfitAndLoss — policy variations", () => {
  it("recognises on order and reverses RTO, returns and losses", () => {
    const pnl = computeProfitAndLoss(FIXTURE, settings({ revenue: { recognition: "on_order" } }));
    expect(pnl.revenue.recognizedRevenue).toBe("5600.00"); // all but cancelled
    expect(pnl.revenue.salesReturns).toBe("1200.00"); // returned 400 + RTO 800
    expect(pnl.revenue.netSales).toBe("4400.00"); // delivered + shipped
    expect(pnl.cogs.total).toBe("1320.00");
  });

  it("applies a recovery percentage to returned goods", () => {
    const pnl = computeProfitAndLoss(FIXTURE, settings({ costs: { returnedGoodsRecoveryPercent: 25 } }));
    expect(pnl.variableCosts.returnLosses).toBe("270.00"); // 360 × 75%
  });

  it("switches the advertising cost source without double counting", () => {
    const pnl = computeProfitAndLoss(FIXTURE, settings({ advertising: { costSource: "expenses" } }));
    expect(pnl.advertising).toMatchObject({ campaignSpend: "0.00", expenses: "300.00", total: "400.00" });
    expect(pnl.excluded.advertisingNotInProfit).toBe("400.00");
  });

  it("removes an expense from profit once it is marked as deducted by the platform", () => {
    const base = { ...EMPTY_INPUTS, expenses: [expense("shipping", "variable_selling", "150.00")] };
    expect(computeProfitAndLoss(base, DEFAULT_SETTINGS).variableCosts.expenses).toBe("150.00");
    const deducted = { ...EMPTY_INPUTS, expenses: [expense("shipping", "variable_selling", "150.00", { reflectedInSettlement: true })] };
    expect(computeProfitAndLoss(deducted, DEFAULT_SETTINGS).variableCosts.expenses).toBe("0.00");
  });

  it("reports business-level lines as unavailable for a segment", () => {
    const pnl = computeProfitAndLoss(FIXTURE, DEFAULT_SETTINGS, { segment: true });
    expect(pnl.contributionBeforeAds).toBe("2050.00");
    expect(pnl.operatingProfit).toBeNull();
    expect(pnl.netProfit).toBeNull();
    expect(pnl.totalExpenses).toBeNull();
    expect(pnl.advertising.total).toBeNull();
    expect(pnl.margins.net).toBeNull();
  });

  it("returns empty, not NaN, for a period with no data", () => {
    const pnl = computeProfitAndLoss(EMPTY_INPUTS, DEFAULT_SETTINGS);
    expect(pnl.revenue.netSales).toBe("0.00");
    expect(pnl.margins.gross).toBeNull();
    expect(pnl.rates.averageOrderValue).toBeNull();
    expect(pnl.rates.returnRtoRate).toBeNull();
    expect(pnl.advertisingMetrics.roas).toBeNull();
    expect(pnl.netProfit).toBe("0.00");
  });

  it("is additive: the P&L of merged days equals the sum of daily P&Ls", () => {
    const dayA: FinancialInputs = {
      orders: [FIXTURE.orders[0], FIXTURE.orders[2]],
      settlements: FIXTURE.settlements.slice(0, 5),
      expenses: FIXTURE.expenses.slice(0, 3),
      ads: FIXTURE.ads,
      cash: FIXTURE.cash.slice(0, 1),
    };
    const dayB: FinancialInputs = {
      orders: [FIXTURE.orders[1], FIXTURE.orders[3], FIXTURE.orders[4], FIXTURE.orders[0]],
      settlements: FIXTURE.settlements.slice(3),
      expenses: FIXTURE.expenses.slice(2),
      ads: FIXTURE.ads,
      cash: FIXTURE.cash.slice(1),
    };
    const a = computeProfitAndLoss(dayA, DEFAULT_SETTINGS);
    const b = computeProfitAndLoss(dayB, DEFAULT_SETTINGS);
    const merged = computeProfitAndLoss(mergeInputs([dayA, dayB]), DEFAULT_SETTINGS);
    for (const pick of [
      (p: typeof a) => p.revenue.netSales,
      (p: typeof a) => p.cogs.total,
      (p: typeof a) => p.variableCosts.total,
      (p: typeof a) => p.netProfit!,
      (p: typeof a) => p.totalExpenses!,
    ]) {
      expect(dec(pick(a)).plus(pick(b)).toFixed(2)).toBe(pick(merged));
    }
  });
});

describe("cash flow", () => {
  it("separates operating cash from financing movements", () => {
    const cf = computeCashFlow(FIXTURE.cash);
    expect(cf.totalIn).toBe("13555.00");
    expect(cf.totalOut).toBe("8680.00");
    expect(cf.net).toBe("4875.00");
    expect(cf.operatingNet).toBe("-5125.00"); // excludes the 10,000 capital injection
  });
});

describe("expense breakdown", () => {
  it("lists only positive cost lines that add up to total expenses", () => {
    const pnl = computeProfitAndLoss(FIXTURE, DEFAULT_SETTINGS);
    const slices = expenseBreakdown(pnl);
    const total = slices.reduce((t, s) => t.plus(s.amount), dec(0));
    // Breakdown omits the claims credit (−50), which reduces the total.
    expect(total.minus(50).toFixed(2)).toBe(pnl.totalExpenses);
    expect(slices.every((s) => dec(s.amount).greaterThan(0))).toBe(true);
  });
});
