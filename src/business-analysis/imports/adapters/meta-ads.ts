// Meta Ads Manager export (Reports → Export table data as CSV/XLSX).
// Export with a "Day" breakdown so each row is one day; summary rows covering
// several days are rejected because their spend cannot be dated.
import { detectDateOrder, type DateOrder } from "../../domain/dates";
import { dec, money } from "../../domain/money";
import { adMetricSchema, type AdMetricRecord } from "../normalized";
import type { ImportAdapter, Issue } from "../types";
import { amount, date, identifier, integer, text } from "./common";

export const metaAdsAdapter: ImportAdapter<AdMetricRecord> = {
  reportType: "meta_ads",
  platform: "meta",
  label: "Meta Ads report",
  description: "Daily campaign spend and results from Meta Ads Manager (export with a Day breakdown).",
  fields: [
    { key: "day", label: "Day", kind: "date", aliases: ["Date", "Reporting Date"] },
    { key: "reporting_starts", label: "Reporting starts", kind: "date", aliases: ["Reporting Start"] },
    { key: "reporting_ends", label: "Reporting ends", kind: "date", aliases: ["Reporting End"] },
    { key: "spend", label: "Amount spent (INR)", kind: "amount", required: true, aliases: ["Amount spent", "Spend", "Cost"] },
    { key: "campaign", label: "Campaign name", kind: "text", aliases: ["Campaign"] },
    { key: "adset", label: "Ad set name", kind: "text", aliases: ["Ad Set", "Adset name"] },
    { key: "ad", label: "Ad name", kind: "text", aliases: ["Ad"] },
    { key: "campaign_id", label: "Campaign ID", kind: "text", aliases: [] },
    { key: "adset_id", label: "Ad set ID", kind: "text", aliases: [] },
    { key: "ad_id", label: "Ad ID", kind: "text", aliases: [] },
    { key: "account_id", label: "Account ID", kind: "text", aliases: ["Ad account ID"] },
    { key: "account_name", label: "Account name", kind: "text", aliases: ["Ad account name"] },
    { key: "impressions", label: "Impressions", kind: "integer", aliases: [] },
    { key: "reach", label: "Reach", kind: "integer", aliases: [] },
    { key: "clicks", label: "Clicks (all)", kind: "integer", aliases: ["Clicks"] },
    { key: "link_clicks", label: "Link clicks", kind: "integer", aliases: ["Outbound clicks"] },
    { key: "purchases", label: "Purchases", kind: "number", aliases: ["Website purchases", "Results"] },
    { key: "purchase_value", label: "Purchases conversion value", kind: "amount",
      aliases: ["Purchase conversion value", "Website purchases conversion value", "Purchase value"] },
    { key: "attribution", label: "Attribution setting", kind: "text", aliases: ["Attribution"] },
  ],
  prepare(rows) {
    const d = detectDateOrder(rows.flatMap((r) => [r.day, r.reporting_starts]));
    const warnings: Issue[] = [];
    if (rows.length > 0 && rows.every((r) => r.day === null || r.day === undefined) && rows.some((r) => r.reporting_starts)) {
      warnings.push({ code: "no_day_breakdown", message: "No Day column: only rows whose reporting start and end are the same day can be imported." });
    }
    return { file: { dateOrder: d.order }, warnings };
  },
  normalize(row, ctx) {
    const errors: Issue[] = [];
    const warnings: Issue[] = [];
    const order = (ctx.file.dateOrder as DateOrder) ?? "dmy";
    let day = date(row, "day", errors, "Day", order, ctx.timeZone);
    if (!day) {
      const start = date(row, "reporting_starts", errors, "Reporting starts", order, ctx.timeZone);
      const end = date(row, "reporting_ends", errors, "Reporting ends", order, ctx.timeZone);
      if (start && (!end || end === start)) day = start;
      else if (start && end) {
        errors.push({ code: "multi_day_row", message: `This row covers ${start} to ${end}. Export the report with a Day breakdown.` });
      } else if (errors.length === 0) {
        errors.push({ code: "missing_value", field: "day", message: "No date for this row" });
      }
    }
    const spend = amount(row, "spend", errors, "Amount spent", true);
    if (spend && dec(spend).isNegative()) errors.push({ code: "negative_amount", field: "spend", message: "Spend is negative" });
    const impressions = integer(row, "impressions", errors, "Impressions", { min: 0 }) ?? 0;
    const reach = integer(row, "reach", errors, "Reach", { min: 0 });
    const clicks = integer(row, "clicks", errors, "Clicks", { min: 0 }) ?? 0;
    const linkClicks = integer(row, "link_clicks", errors, "Link clicks", { min: 0 });
    const purchases = amount(row, "purchases", errors, "Purchases") ?? "0.00";
    const value = amount(row, "purchase_value", errors, "Purchase value") ?? "0.00";

    const campaign = text(row, "campaign", 300) ?? "";
    // Meta adds a totals row with no campaign/ad set/ad; importing it would
    // double the day's spend.
    const isTotal = !campaign && !text(row, "adset") && !text(row, "ad") && /total|all/i.test(String(row.campaign ?? row.day ?? ""));
    if (isTotal) errors.push({ code: "summary_row", message: "Totals row skipped" });

    if (errors.length > 0 || !day || spend === null) return { record: null, errors, warnings };
    if (impressions === 0 && dec(spend).greaterThan(0)) {
      warnings.push({ code: "spend_without_impressions", message: "Spend recorded with no impressions." });
    }

    const record: AdMetricRecord = {
      kind: "ad_metric",
      ad_account_external_id: identifier(row, "account_id"),
      ad_account_name: text(row, "account_name", 200),
      metric_date: day,
      campaign_name: campaign,
      adset_name: text(row, "adset", 300) ?? "",
      ad_name: text(row, "ad", 300) ?? "",
      campaign_id: identifier(row, "campaign_id"),
      adset_id: identifier(row, "adset_id"),
      ad_id: identifier(row, "ad_id"),
      spend: money(spend),
      impressions,
      reach,
      clicks,
      link_clicks: linkClicks,
      purchases: money(purchases),
      attributed_revenue: money(value),
      attribution_window: text(row, "attribution", 100),
    };
    const valid = adMetricSchema.safeParse(record);
    if (!valid.success) {
      return { record: null, errors: valid.error.issues.map((i) => ({ code: "invalid_record", message: `${i.path.join(".")}: ${i.message}` })), warnings };
    }
    const key = [record.ad_account_external_id ?? "", day, record.campaign_name, record.adset_name, record.ad_name].join("|");
    return { record: valid.data, errors, warnings, naturalKey: key, fingerprintBasis: record };
  },
};
