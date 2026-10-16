// Recipe (standard) cost of one finished unit. Mirrors the SQL function
// business_analysis.recipe_unit_cost(), which is what actually snapshots
// order costs; this copy powers the live preview while editing a draft
// recipe and is checked against the SQL version in the database tests.
import { dec, type Money } from "./money";

export type CostVersion = { materialId: string; effectiveFrom: string; unitCost: string };

export type RecipeComponent = {
  materialId: string | null;
  componentType: "material" | "packaging" | "other";
  quantity: string;
  wastagePercent: string;
  unitCostOverride: string | null;
};

export type UnitCost = {
  material: string;
  packaging: string;
  other: string;
  total: string;
  missingComponents: number;
  components: { index: number; unitCost: string | null; lineCost: string | null }[];
};

/** The material price in force on `on` (latest effective_from ≤ on), or null. */
export function materialCostOn(versions: CostVersion[], materialId: string, on: string): string | null {
  let best: CostVersion | null = null;
  for (const v of versions) {
    if (v.materialId !== materialId || v.effectiveFrom > on) continue;
    if (!best || v.effectiveFrom > best.effectiveFrom) best = v;
  }
  return best?.unitCost ?? null;
}

export function recipeUnitCost(components: RecipeComponent[], versions: CostVersion[], on: string): UnitCost {
  const totals = { material: dec(0), packaging: dec(0), other: dec(0) };
  let missing = 0;
  const lines = components.map((c, index) => {
    const unit = c.unitCostOverride ?? (c.materialId ? materialCostOn(versions, c.materialId, on) : null);
    if (unit === null) {
      missing++;
      return { index, unitCost: null, lineCost: null };
    }
    const qty = dec(c.quantity).times(dec(1).plus(dec(c.wastagePercent).dividedBy(100)));
    const cost = qty.times(unit);
    totals[c.componentType] = totals[c.componentType].plus(cost);
    return { index, unitCost: unit, lineCost: cost.toDecimalPlaces(4).toFixed(4) };
  });
  const f = (d: ReturnType<typeof dec>) => d.toDecimalPlaces(4).toFixed(4);
  return {
    material: f(totals.material),
    packaging: f(totals.packaging),
    other: f(totals.other),
    total: f(totals.material.plus(totals.packaging).plus(totals.other)),
    missingComponents: missing,
    components: lines,
  };
}

export function unitMargin(sellingPriceExclGst: Money, unitCost: string): { amount: string; percent: string | null } {
  const price = dec(sellingPriceExclGst);
  const amount = price.minus(unitCost);
  return {
    amount: amount.toDecimalPlaces(2).toFixed(2),
    percent: price.isZero() ? null : amount.dividedBy(price).times(100).toDecimalPlaces(1).toFixed(1),
  };
}
