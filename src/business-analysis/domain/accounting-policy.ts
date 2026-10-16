// Business settings and the accounting policy derived from them. Settings are
// stored as versioned JSON (business_settings.settings) and always read back
// through this schema, so a missing key falls back to a documented default
// and an invalid one is rejected instead of silently changing a number.
import { z } from "zod";
import { DATE_PRESETS } from "./periods";
import type { OrderStatus } from "./statuses";

export const REPORT_TYPES = [
  "meesho_orders",
  "meesho_settlements",
  "meesho_returns",
  "platform_fees",
  "meta_ads",
] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

const percent = z.number().min(0).max(100);
const rupees = z.number().min(0).max(10_000_000);

export const settingsSchema = z.object({
  general: z
    .object({
      defaultDatePreset: z.enum(DATE_PRESETS).default("this_month"),
    })
    .prefault({}),

  revenue: z
    .object({
      // on_delivery: revenue when an order is delivered (default; matches
      // when the marketplace owes you). on_order: when placed, with RTO,
      // returns and losses reversed.
      recognition: z.enum(["on_delivery", "on_order"]).default("on_delivery"),
      // order_date, or recognition_date (= delivery date where a report
      // provides it, otherwise the order date).
      dateBasis: z.enum(["order_date", "recognition_date"]).default("order_date"),
    })
    .prefault({}),

  gst: z
    .object({
      // null = not configured yet. Revenue then includes any GST and the
      // dashboard says so.
      registered: z.boolean().nullable().default(null),
      defaultRatePercent: z.number().min(0).max(28).nullable().default(null),
    })
    .prefault({}),

  costs: z
    .object({
      // Share of a returned/RTO item's production cost recovered by
      // restocking it. Personalised frames are usually not resellable → 0.
      returnedGoodsRecoveryPercent: percent.default(0),
    })
    .prefault({}),

  settlements: z
    .object({
      // order_date matches platform deductions to the order they belong to.
      feeDateBasis: z.enum(["order_date", "settlement_date"]).default("order_date"),
      reconciliationTolerance: rupees.default(1),
      expectedSettlementLagDays: z.number().int().min(0).max(120).default(15),
    })
    .prefault({}),

  advertising: z
    .object({
      // ad_metrics: ad cost comes from campaign data (manual or imported);
      // advertising expenses then only affect cash. expenses: the opposite.
      costSource: z.enum(["ad_metrics", "expenses"]).default("ad_metrics"),
      allocationMethod: z.enum(["none", "revenue_weighted", "delivered_order_weighted"]).default("revenue_weighted"),
      maxSpendPercentOfSales: percent.default(20),
      minRoas: z.number().min(0).max(100).default(2),
    })
    .prefault({}),

  inventory: z
    .object({
      // production_records: stock is consumed only by recorded production.
      // estimate_from_orders: also show an estimated stock that deducts
      // recipe usage for shipped orders (clearly labelled as an estimate).
      trackingMode: z.enum(["production_records", "estimate_from_orders"]).default("estimate_from_orders"),
    })
    .prefault({}),

  thresholds: z
    .object({
      rtoRatePercent: percent.default(15),
      expenseIncreasePercent: z.number().min(0).max(1000).default(25),
      expenseIncreaseMinAmount: rupees.default(1000),
      marginDropPoints: percent.default(5),
      largeExpenseMultiplier: z.number().min(1).max(100).default(3),
      largeExpenseMinAmount: rupees.default(5000),
      importStaleDays: z.number().int().min(1).max(90).default(7),
    })
    .prefault({}),

  imports: z
    .object({
      maxUploadMb: z.number().int().min(1).max(50).optional(),
      meeshoOrders: z
        .object({
          // Whether "Supplier Listed/Discounted Price" is per unit or for the
          // whole sub-order line. Meesho sub-orders are almost always
          // quantity 1, where both readings agree; rows with quantity > 1
          // are flagged so the assumption is visible.
          priceBasis: z.enum(["per_unit", "line_total"]).default("per_unit"),
          dateOrder: z.enum(["auto", "dmy", "mdy"]).default("auto"),
        })
        .prefault({}),
      // Extra header aliases per report type and field, for when a platform
      // renames a column: { meesho_orders: { sub_order_no: ["Suborder ID"] } }.
      customAliases: z.partialRecord(z.enum(REPORT_TYPES), z.record(z.string(), z.array(z.string().max(200)).max(20))).default({}),
      // Extra status wording → normalized status.
      statusAliases: z.record(z.string().max(100), z.enum([
        "pending", "shipped", "delivered", "return_requested", "returned", "rto", "cancelled", "exchanged", "lost",
      ])).default({}),
    })
    .prefault({}),
});

export type BusinessSettings = z.infer<typeof settingsSchema>;
export type BusinessSettingsInput = z.input<typeof settingsSchema>;

export const DEFAULT_SETTINGS: BusinessSettings = settingsSchema.parse({});

/** Reads stored settings JSON, tolerating unknown keys and filling defaults. */
export function readSettings(raw: unknown): BusinessSettings {
  const parsed = settingsSchema.safeParse(raw ?? {});
  return parsed.success ? parsed.data : DEFAULT_SETTINGS;
}

export type StatusSets = {
  /** Lines whose revenue is recognised before any reversal. */
  recognized: OrderStatus[];
  /** Recognised lines later reversed (sales returns). */
  reversed: OrderStatus[];
  /** recognized − reversed: revenue kept, cost of goods sold. */
  netSold: OrderStatus[];
  /** Produced and shipped but the sale was lost: cost is a return/RTO loss. */
  loss: OrderStatus[];
  /** Lines the marketplace should pay for (used by reconciliation). */
  expectedSettlement: OrderStatus[];
  /** Denominator of the return/RTO rate: orders that left the building and reached an outcome. */
  shippedOutcome: OrderStatus[];
  delivered: OrderStatus[];
};

/**
 * The single definition of which order statuses count as what. SQL functions
 * receive these arrays as parameters rather than hard-coding them.
 */
export function statusSets(settings: BusinessSettings): StatusSets {
  const onDelivery = settings.revenue.recognition === "on_delivery";
  const recognized: OrderStatus[] = onDelivery
    ? ["delivered", "exchanged", "return_requested", "returned"]
    : ["pending", "shipped", "delivered", "exchanged", "return_requested", "returned", "rto", "lost"];
  const reversed: OrderStatus[] = onDelivery ? ["returned"] : ["returned", "rto", "lost"];
  return {
    recognized,
    reversed,
    netSold: recognized.filter((s) => !reversed.includes(s)),
    loss: ["returned", "rto", "lost"],
    expectedSettlement: ["delivered", "exchanged", "return_requested"],
    shippedOutcome: ["delivered", "exchanged", "return_requested", "returned", "rto", "lost"],
    delivered: ["delivered", "exchanged", "return_requested"],
  };
}

/** Human-readable statement of the assumptions behind a report. */
export function describePolicy(settings: BusinessSettings, effectiveFrom: string | null): string[] {
  const lines = [
    settings.revenue.recognition === "on_delivery"
      ? "Revenue is recognised when an order is delivered; customer returns are deducted as sales returns."
      : "Revenue is recognised when an order is placed; cancellations are excluded and RTO, returns and lost shipments are deducted.",
    settings.revenue.dateBasis === "order_date"
      ? "Orders are dated by order date."
      : "Orders are dated by delivery date where the report provides it, otherwise by order date.",
    settings.gst.registered === null
      ? "GST is not configured: revenue figures include any GST charged."
      : settings.gst.registered
        ? `Revenue excludes GST at each product's rate (default ${settings.gst.defaultRatePercent ?? "not set"}%).`
        : "Business is not GST-registered: the full selling price is revenue.",
    "Cost of goods sold uses recipe cost snapshots taken when each order line was costed (actual cost where recorded). Material purchases affect cash and inventory, not profit, so they are never counted twice.",
    `Returned and RTO items are treated as a loss of ${100 - settings.costs.returnedGoodsRecoveryPercent}% of their production cost.`,
    settings.settlements.feeDateBasis === "order_date"
      ? "Platform deductions are dated by the order they belong to."
      : "Platform deductions are dated by settlement date.",
    "Platform deductions come only from imported settlement reports; orders without one show no deductions yet.",
    "TCS/TDS withheld by the platform are tax credits, not expenses.",
    settings.advertising.costSource === "ad_metrics"
      ? "Advertising cost comes from campaign data; advertising expenses affect cash only."
      : "Advertising cost comes from advertising expenses; campaign data is used for performance metrics only.",
    "Expenses marked as already deducted by the platform are excluded from profit and cash, because the settlement already contains them.",
    "Equipment purchases are capital expenditure (cash only); depreciation is not recorded.",
  ];
  if (effectiveFrom) lines.unshift(`Settings version effective from ${effectiveFrom}.`);
  return lines;
}
