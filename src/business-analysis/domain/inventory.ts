// Stock positions from the inventory ledger, valued at moving weighted
// average cost: each receipt re-averages the unit cost; each issue leaves it
// unchanged and removes value at the current average.
//
// When consumption happens: only a recorded production run consumes
// materials (business_analysis.record_production). Dispatching an order never
// moves stock. If production is not recorded, `estimateStock` shows an
// explicitly labelled estimate that deducts recipe usage for shipped orders.
import { dec, money, type Decimal, type Money } from "./money";
import type { MovementType } from "./statuses";

export type LedgerMovement = {
  id: string;
  itemId: string; // material or product id
  movementType: MovementType;
  quantity: string; // signed
  unitCost: string | null;
  movementDate: string;
  createdAt: string;
};

export type StockPosition = {
  itemId: string;
  quantity: string;
  averageUnitCost: Money | null;
  value: Money;
  inbound: string;
  outbound: string;
  lastMovementDate: string | null;
  /** Stock went below zero at some point: issues were recorded before receipts. */
  wentNegative: boolean;
};

function qty(d: Decimal): string {
  return d.toDecimalPlaces(3).toFixed(3);
}

export function computeStockPositions(movements: LedgerMovement[], asOf?: string): Map<string, StockPosition> {
  const sorted = movements
    .filter((m) => !asOf || m.movementDate <= asOf)
    .slice()
    .sort((a, b) =>
      a.movementDate === b.movementDate
        ? a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)
        : a.movementDate.localeCompare(b.movementDate),
    );

  type State = { q: Decimal; value: Decimal; avg: Decimal | null; inbound: Decimal; outbound: Decimal; last: string | null; neg: boolean };
  const state = new Map<string, State>();

  for (const m of sorted) {
    const s = state.get(m.itemId) ?? {
      q: dec(0), value: dec(0), avg: null, inbound: dec(0), outbound: dec(0), last: null, neg: false,
    };
    const q = dec(m.quantity);
    if (q.greaterThan(0)) {
      // Receipts carry their own cost; a positive adjustment without one is
      // valued at the current average (or zero if there is none yet).
      const unit = m.unitCost !== null ? dec(m.unitCost) : (s.avg ?? dec(0));
      s.value = s.value.plus(q.times(unit));
      s.q = s.q.plus(q);
      s.inbound = s.inbound.plus(q);
      s.avg = s.q.greaterThan(0) ? s.value.dividedBy(s.q) : unit;
    } else {
      const unit = s.avg ?? dec(0);
      s.q = s.q.plus(q);
      s.value = s.value.plus(q.times(unit));
      s.outbound = s.outbound.plus(q.abs());
      if (s.q.lessThan(0)) s.neg = true;
      if (s.q.isZero()) s.value = dec(0);
    }
    s.last = m.movementDate;
    state.set(m.itemId, s);
  }

  const out = new Map<string, StockPosition>();
  for (const [itemId, s] of state) {
    out.set(itemId, {
      itemId,
      quantity: qty(s.q),
      averageUnitCost: s.avg === null ? null : s.avg.toDecimalPlaces(4).toFixed(4),
      value: money(s.q.lessThanOrEqualTo(0) ? 0 : s.value),
      inbound: qty(s.inbound),
      outbound: qty(s.outbound),
      lastMovementDate: s.last,
      wentNegative: s.neg,
    });
  }
  return out;
}

export type RecipeUsage = { materialId: string; quantityPerUnit: string; wastagePercent: string };

/**
 * Material usage implied by shipped units, from each product's recipe.
 * Returns materialId → quantity. Used only for the labelled estimate.
 */
export function estimatedConsumption(
  shippedUnitsByProduct: Map<string, number>,
  recipes: Map<string, RecipeUsage[]>,
): Map<string, string> {
  const totals = new Map<string, Decimal>();
  for (const [productId, units] of shippedUnitsByProduct) {
    for (const item of recipes.get(productId) ?? []) {
      const used = dec(units).times(item.quantityPerUnit).times(dec(1).plus(dec(item.wastagePercent).dividedBy(100)));
      totals.set(item.materialId, (totals.get(item.materialId) ?? dec(0)).plus(used));
    }
  }
  return new Map([...totals].map(([k, v]) => [k, qty(v)]));
}

export function isBelowReorder(quantity: string, threshold: string): boolean {
  const t = dec(threshold);
  return t.greaterThan(0) && dec(quantity).lessThanOrEqualTo(t);
}
