// Estimated advertising cost per order line. Meta does not report which
// Meesho orders an ad produced, so any per-order ad cost is an allocation of
// the period's total spend by a configured rule. Allocations are always shown
// as estimates and are never added to totals: the business-level P&L already
// counts the full spend once.
import type { BusinessSettings, StatusSets } from "./accounting-policy";
import { dec, money, type Money } from "./money";
import type { OrderStatus } from "./statuses";

export type AllocationBasis = {
  method: BusinessSettings["advertising"]["allocationMethod"];
  totalSpend: Money;
  /** Net sales (excl. GST) of the whole period, not just the visible page. */
  periodNetSales: Money;
  periodNetSoldLines: number;
};

export type AllocationLine = { status: OrderStatus; revenueExclGst: Money };

/**
 * Allocated ad cost for one line, or null when the method is "none" or the
 * line was not a kept sale. Lines from a filtered page use period-level
 * rates, so a line's allocation does not depend on which page it is on.
 */
export function allocatedAdCost(line: AllocationLine, basis: AllocationBasis, sets: StatusSets): Money | null {
  if (basis.method === "none") return null;
  if (!sets.netSold.includes(line.status)) return null;
  const spend = dec(basis.totalSpend);
  if (spend.isZero()) return "0.00";
  if (basis.method === "revenue_weighted") {
    const total = dec(basis.periodNetSales);
    if (total.lessThanOrEqualTo(0)) return null;
    return money(spend.times(line.revenueExclGst).dividedBy(total));
  }
  if (basis.periodNetSoldLines <= 0) return null;
  return money(spend.dividedBy(basis.periodNetSoldLines));
}

/**
 * Allocates a total across weights with the largest-remainder method so the
 * rounded parts add back to the total exactly (used for allocation reports).
 */
export function allocateExactly(total: Money, weights: Money[]): Money[] {
  const t = dec(total);
  const w = weights.map((x) => dec(x));
  const wSum = w.reduce((a, b) => a.plus(b), dec(0));
  if (weights.length === 0) return [];
  if (wSum.lessThanOrEqualTo(0)) return weights.map(() => "0.00");
  const totalPaise = t.times(100).toDecimalPlaces(0);
  const raw = w.map((x) => totalPaise.times(x).dividedBy(wSum));
  const floors = raw.map((r) => r.floor());
  let remainder = totalPaise.minus(floors.reduce((a, b) => a.plus(b), dec(0))).toNumber();
  const order = raw
    .map((r, i) => ({ i, frac: r.minus(r.floor()) }))
    .sort((a, b) => b.frac.comparedTo(a.frac) || a.i - b.i);
  const paise = floors.map((f) => f);
  for (const { i } of order) {
    if (remainder <= 0) break;
    paise[i] = paise[i].plus(1);
    remainder--;
  }
  return paise.map((p) => money(p.dividedBy(100)));
}
