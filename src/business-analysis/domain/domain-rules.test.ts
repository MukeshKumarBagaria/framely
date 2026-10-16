import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, readSettings, statusSets } from "./accounting-policy";
import { computeAdMetrics } from "./ad-metrics";
import { allocateExactly, allocatedAdCost } from "./allocation";
import { recipeUnitCost } from "./costing";
import { computeStockPositions, estimatedConsumption, type LedgerMovement } from "./inventory";
import { compare } from "./kpis";
import { normalizeOrderStatus } from "./statuses";

describe("Meesho status normalisation", () => {
  it.each([
    ["DELIVERED", "delivered"],
    ["CANCELLED", "cancelled"],
    ["RTO_LOCKED", "rto"],
    ["rto complete", "rto"],
    ["RTO_SOMETHING_NEW", "rto"],
    ["Ready to Ship", "pending"],
    ["DOOR_STEP_EXCHANGED", "exchanged"],
    ["RETURN_REQUESTED", "return_requested"],
    ["Returned", "returned"],
    ["SHIPPED", "shipped"],
  ])("%s → %s", (raw, status) => {
    expect(normalizeOrderStatus(raw)).toMatchObject({ status, recognized: true });
  });

  it("flags unknown wording instead of guessing", () => {
    expect(normalizeOrderStatus("DISPUTE_RAISED")).toMatchObject({ status: "unknown", recognized: false });
    expect(normalizeOrderStatus("")).toMatchObject({ status: "unknown", recognized: false });
  });

  it("honours custom aliases from settings", () => {
    expect(normalizeOrderStatus("DISPUTE_RAISED", { "Dispute Raised": "delivered" })).toMatchObject({ status: "delivered" });
  });
});

describe("accounting policy", () => {
  it("fills defaults for missing keys and survives garbage", () => {
    expect(readSettings({ revenue: { recognition: "on_order" } }).revenue).toEqual({ recognition: "on_order", dateBasis: "order_date" });
    expect(readSettings({ revenue: { recognition: "whenever" } })).toEqual(DEFAULT_SETTINGS);
    expect(readSettings(null)).toEqual(DEFAULT_SETTINGS);
  });

  it("never counts cancelled or unknown lines as sales", () => {
    for (const recognition of ["on_delivery", "on_order"] as const) {
      const sets = statusSets(readSettings({ revenue: { recognition } }));
      expect(sets.recognized).not.toContain("cancelled");
      expect(sets.recognized).not.toContain("unknown");
      expect(sets.netSold).not.toContain("rto");
      expect(sets.netSold).not.toContain("returned");
    }
  });
});

describe("advertising ratios", () => {
  it("returns null instead of dividing by zero", () => {
    const m = computeAdMetrics({ spend: "0.00", impressions: 0, clicks: 0, purchases: "0.00", attributedRevenue: "0.00" });
    expect(m).toMatchObject({ cpm: null, cpc: null, ctr: null, roas: null, costPerPurchase: null });
  });

  it("handles spend with no clicks or purchases", () => {
    const m = computeAdMetrics({ spend: "500.00", impressions: 10000, clicks: 0, purchases: "0.00", attributedRevenue: "0.00" });
    expect(m.cpm).toBe("50.00");
    expect(m.cpc).toBeNull();
    expect(m.ctr).toBe("0.00");
    expect(m.roas).toBe("0.00");
    expect(m.costPerPurchase).toBeNull();
  });
});

describe("advertising allocation", () => {
  const sets = statusSets(DEFAULT_SETTINGS);
  const basis = { totalSpend: "1000.00", periodNetSales: "10000.00", periodNetSoldLines: 20 };

  it("allocates by revenue share or equally per kept sale", () => {
    expect(allocatedAdCost({ status: "delivered", revenueExclGst: "500.00" }, { ...basis, method: "revenue_weighted" }, sets)).toBe("50.00");
    expect(allocatedAdCost({ status: "delivered", revenueExclGst: "500.00" }, { ...basis, method: "delivered_order_weighted" }, sets)).toBe("50.00");
  });

  it("allocates nothing to lost sales or when disabled", () => {
    expect(allocatedAdCost({ status: "rto", revenueExclGst: "500.00" }, { ...basis, method: "revenue_weighted" }, sets)).toBeNull();
    expect(allocatedAdCost({ status: "delivered", revenueExclGst: "500.00" }, { ...basis, method: "none" }, sets)).toBeNull();
  });

  it("splits a total so rounded parts add back exactly", () => {
    const parts = allocateExactly("100.00", ["1", "1", "1"]);
    expect(parts).toEqual(["33.34", "33.33", "33.33"]);
    expect(allocateExactly("0.05", ["1", "2"])).toEqual(["0.02", "0.03"]);
  });
});

describe("historical product costs", () => {
  const versions = [
    { materialId: "frame", effectiveFrom: "2026-01-01", unitCost: "40.00" },
    { materialId: "frame", effectiveFrom: "2026-07-01", unitCost: "55.00" },
    { materialId: "box", effectiveFrom: "2026-01-01", unitCost: "12.00" },
  ];
  const components = [
    { materialId: "frame", componentType: "material" as const, quantity: "1", wastagePercent: "0", unitCostOverride: null },
    { materialId: "box", componentType: "packaging" as const, quantity: "1", wastagePercent: "10", unitCostOverride: null },
    { materialId: null, componentType: "other" as const, quantity: "1", wastagePercent: "0", unitCostOverride: "5.00" },
  ];

  it("uses the price in force on the order date, not today's", () => {
    expect(recipeUnitCost(components, versions, "2026-06-30").total).toBe("58.2000"); // 40 + 13.2 + 5
    expect(recipeUnitCost(components, versions, "2026-07-01").total).toBe("73.2000"); // 55 + 13.2 + 5
  });

  it("reports components with no price instead of costing them at zero", () => {
    const result = recipeUnitCost(components, versions, "2025-12-31");
    expect(result.missingComponents).toBe(2);
  });
});

describe("inventory ledger", () => {
  let seq = 0;
  const mv = (movementType: LedgerMovement["movementType"], quantity: string, unitCost: string | null, movementDate: string): LedgerMovement => ({
    id: `m${++seq}`, itemId: "frame", movementType, quantity, unitCost, movementDate, createdAt: `2026-01-01T00:00:0${seq % 10}Z`,
  });

  it("values stock at moving weighted average cost", () => {
    const pos = computeStockPositions([
      mv("purchase", "100", "10.00", "2026-04-01"),
      mv("purchase", "100", "20.00", "2026-04-05"),
      mv("consumption", "-50", null, "2026-04-06"),
    ]).get("frame")!;
    expect(pos.quantity).toBe("150.000");
    expect(pos.averageUnitCost).toBe("15.0000");
    expect(pos.value).toBe("2250.00");
  });

  it("is point-in-time when given an as-of date", () => {
    const movements = [mv("opening", "10", "5.00", "2026-04-01"), mv("wastage", "-4", null, "2026-04-10")];
    expect(computeStockPositions(movements, "2026-04-09").get("frame")!.quantity).toBe("10.000");
    expect(computeStockPositions(movements).get("frame")!.quantity).toBe("6.000");
  });

  it("flags stock that went negative", () => {
    const pos = computeStockPositions([mv("consumption", "-5", null, "2026-04-01"), mv("purchase", "10", "3.00", "2026-04-02")]).get("frame")!;
    expect(pos.wentNegative).toBe(true);
    expect(pos.quantity).toBe("5.000");
  });

  it("estimates material usage from shipped units and recipes", () => {
    const usage = estimatedConsumption(new Map([["p1", 10]]), new Map([["p1", [{ materialId: "frame", quantityPerUnit: "2", wastagePercent: "5" }]]]));
    expect(usage.get("frame")).toBe("21.000");
  });
});

describe("KPI comparison", () => {
  it("shows no percentage against a zero base", () => {
    expect(compare("100.00", "0.00", true)).toMatchObject({ absolute: "100.00", percent: null, reason: "zero_base", tone: "positive" });
  });

  it("is unavailable when either side is undefined", () => {
    expect(compare(null, "10.00", true)).toMatchObject({ absolute: null, percent: null, reason: "unavailable" });
  });

  it("colours changes by whether they are good for the business", () => {
    expect(compare("120", "100", false).tone).toBe("negative"); // expenses up
    expect(compare("80", "100", false)).toMatchObject({ tone: "positive", percent: "-20.0" });
    expect(compare("-50", "-100", true)).toMatchObject({ tone: "positive", percent: "50.0" }); // loss narrowed
  });
});
