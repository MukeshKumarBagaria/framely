// The common internal format every adapter normalizes into. These objects are
// stored in document_import_rows.normalized and read by the SQL commit
// functions, so the snake_case keys here are a contract with the migration.
import { z } from "zod";
import { isIsoDate } from "../domain/dates";
import { ORDER_STATUSES, SALES_CHANNELS, SETTLEMENT_TYPES } from "../domain/statuses";

export const moneyString = z.string().regex(/^-?\d{1,12}\.\d{2}$/, "must be an amount with two decimals");
const isoDate = z.string().refine(isIsoDate, "must be a valid YYYY-MM-DD date");
const shortText = (max: number) => z.string().max(max).nullable();

export const orderLineSchema = z.object({
  kind: z.literal("order_line"),
  channel: z.enum(SALES_CHANNELS),
  external_order_id: z.string().min(1).max(100),
  external_line_id: z.string().min(1).max(100),
  order_date: isoDate,
  delivered_on: isoDate.nullable(),
  status: z.enum(ORDER_STATUSES),
  raw_status: z.string().max(100),
  sku: shortText(100),
  product_name: shortText(500),
  size: shortText(100),
  catalog_id: shortText(100),
  packet_id: shortText(100),
  customer_state: shortText(100),
  order_source: shortText(100),
  quantity: z.number().int().min(1).max(10_000),
  listed_unit_price: moneyString.nullable(),
  discounted_unit_price: moneyString.nullable(),
  listed_amount: moneyString,
  sale_amount: moneyString,
  price_basis: z.enum(["per_unit", "line_total"]),
});
export type OrderLineRecord = z.infer<typeof orderLineSchema>;

export const settlementLineSchema = z.object({
  kind: z.literal("settlement_line"),
  platform: z.enum(["meesho", "other"]),
  settlement_kind: z.enum(["payout", "fee_statement"]),
  external_settlement_id: z.string().min(1).max(150),
  settlement_date: isoDate.nullable(),
  transaction_date: isoDate.nullable(),
  external_line_id: shortText(100),
  external_reference: shortText(150),
  description: shortText(500),
  components: z
    .array(z.object({ type: z.enum(SETTLEMENT_TYPES), amount: moneyString }))
    .min(1)
    .refine((c) => new Set(c.map((x) => x.type)).size === c.length, "each component type may appear once per row"),
  net_amount: moneyString,
});
export type SettlementLineRecord = z.infer<typeof settlementLineSchema>;

export const returnEventSchema = z.object({
  kind: z.literal("return_event"),
  channel: z.enum(SALES_CHANNELS),
  external_line_id: z.string().min(1).max(100),
  event_type: z.enum(["return", "rto"]),
  status: z.enum(["return_requested", "returned", "rto"]),
  raw_status: z.string().max(200),
  event_date: isoDate.nullable(),
  reason: shortText(500),
});
export type ReturnEventRecord = z.infer<typeof returnEventSchema>;

export const adMetricSchema = z.object({
  kind: z.literal("ad_metric"),
  ad_account_external_id: shortText(100),
  ad_account_name: shortText(200),
  metric_date: isoDate,
  campaign_name: z.string().max(300),
  adset_name: z.string().max(300),
  ad_name: z.string().max(300),
  campaign_id: shortText(100),
  adset_id: shortText(100),
  ad_id: shortText(100),
  spend: moneyString,
  impressions: z.number().int().min(0),
  reach: z.number().int().min(0).nullable(),
  clicks: z.number().int().min(0),
  link_clicks: z.number().int().min(0).nullable(),
  purchases: moneyString,
  attributed_revenue: moneyString,
  attribution_window: shortText(100),
});
export type AdMetricRecord = z.infer<typeof adMetricSchema>;

export const normalizedRecordSchema = z.discriminatedUnion("kind", [
  orderLineSchema,
  settlementLineSchema,
  returnEventSchema,
  adMetricSchema,
]);
export type NormalizedRecord = z.infer<typeof normalizedRecordSchema>;
