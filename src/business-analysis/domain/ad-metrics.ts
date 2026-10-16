// Advertising performance ratios. Each ratio is null when its denominator is
// zero: "no clicks" must read as "CPC not available", never ₹0 or Infinity.
//
// These describe the ad platform's own attribution. Meta-attributed purchase
// value is not Meesho revenue: the datasets overlap partially and attribution
// windows over- and under-count, so ROAS here is a platform metric only.
import { dec, money, safeDivide, type Money } from "./money";

export type AdTotals = {
  spend: Money;
  impressions: number;
  clicks: number;
  linkClicks?: number;
  purchases: Money;
  attributedRevenue: Money;
};

export type AdMetrics = {
  spend: Money;
  impressions: number;
  clicks: number;
  purchases: Money;
  attributedRevenue: Money;
  /** spend ÷ impressions × 1,000 */
  cpm: Money | null;
  /** spend ÷ clicks */
  cpc: Money | null;
  /** clicks ÷ impressions × 100 */
  ctr: string | null;
  /** attributed purchase value ÷ spend */
  roas: string | null;
  /** spend ÷ attributed purchases */
  costPerPurchase: Money | null;
};

export function computeAdMetrics(t: AdTotals): AdMetrics {
  const cpm = safeDivide(dec(t.spend).times(1000), t.impressions);
  const cpc = safeDivide(t.spend, t.clicks);
  const ctr = safeDivide(dec(t.clicks).times(100), t.impressions);
  const roas = safeDivide(t.attributedRevenue, t.spend);
  const cpa = safeDivide(t.spend, t.purchases);
  return {
    spend: money(t.spend),
    impressions: t.impressions,
    clicks: t.clicks,
    purchases: money(t.purchases),
    attributedRevenue: money(t.attributedRevenue),
    cpm: cpm === null ? null : money(cpm),
    cpc: cpc === null ? null : money(cpc),
    ctr: ctr === null ? null : ctr.toDecimalPlaces(2).toFixed(2),
    roas: roas === null ? null : roas.toDecimalPlaces(2).toFixed(2),
    costPerPurchase: cpa === null ? null : money(cpa),
  };
}
