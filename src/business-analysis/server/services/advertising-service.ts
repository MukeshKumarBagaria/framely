import "server-only";
import { computeAdMetrics } from "../../domain/ad-metrics";
import { dec, money } from "../../domain/money";
import type { BusinessContext } from "../auth";
import { rpcAll } from "../db";
import { unwrap } from "../errors";
import { toCount, toMoney } from "../mappers";

export async function listAdAccounts(ctx: BusinessContext) {
  const res = await ctx.supabase.from("ad_accounts").select("id, platform, name, external_account_id, is_active, created_at")
    .eq("business_id", ctx.businessId).order("created_at");
  return unwrap(res) as { id: string; platform: string; name: string; external_account_id: string; is_active: boolean; created_at: string }[];
}

export async function saveAdAccount(ctx: BusinessContext, id: string | null, input: Record<string, unknown>) {
  const res = id
    ? await ctx.supabase.from("ad_accounts").update(input).eq("id", id).eq("business_id", ctx.businessId).select("id").single()
    : await ctx.supabase.from("ad_accounts").insert({ ...input, business_id: ctx.businessId }).select("id").single();
  return unwrap(res);
}

type CampaignRow = {
  ad_account_id: string; campaign_name: string; days: number; spend: number; impressions: number; reach: number | null;
  clicks: number; link_clicks: number | null; purchases: number; attributed_revenue: number;
};

export async function campaignSummary(ctx: BusinessContext, range: { from: string; to: string }) {
  const rows = await rpcAll<CampaignRow>(ctx.supabase, "ad_campaign_summary", { p_business_id: ctx.businessId, p_from: range.from, p_to: range.to }, ["ad_account_id", "campaign_name"]);
  return rows
    .map((r) => {
      const metrics = computeAdMetrics({
        spend: toMoney(r.spend), impressions: toCount(r.impressions), clicks: toCount(r.clicks),
        purchases: toMoney(r.purchases), attributedRevenue: toMoney(r.attributed_revenue),
      });
      return { adAccountId: r.ad_account_id, campaign: r.campaign_name || "(no campaign name)", days: toCount(r.days), reach: toCount(r.reach), linkClicks: toCount(r.link_clicks), ...metrics };
    })
    .sort((a, b) => dec(b.spend).comparedTo(a.spend));
}

export async function listAdMetrics(ctx: BusinessContext, q: { from: string; to: string; page: number; pageSize: number; search?: string | null }) {
  let query = ctx.supabase.from("ad_campaign_metrics")
    .select("id, ad_account_id, metric_date, campaign_name, adset_name, ad_name, spend, impressions, reach, clicks, link_clicks, purchases, attributed_revenue, attribution_window, source, notes, voided_at, ad_accounts(name)", { count: "exact" })
    .eq("business_id", ctx.businessId)
    .is("voided_at", null)
    .gte("metric_date", q.from)
    .lte("metric_date", q.to)
    .order("metric_date", { ascending: false })
    .order("spend", { ascending: false });
  if (q.search) {
    const s = q.search.replace(/[%,()*]/g, " ").trim();
    if (s) query = query.or(`campaign_name.ilike.%${s}%,adset_name.ilike.%${s}%,ad_name.ilike.%${s}%`);
  }
  const from = (q.page - 1) * q.pageSize;
  const res = await query.range(from, from + q.pageSize - 1);
  return { rows: unwrap(res) as Record<string, unknown>[], total: res.count ?? 0 };
}

/** Manual daily entry. Same key as imports, so re-entering a day updates it instead of adding a second row. */
export async function saveAdMetric(ctx: BusinessContext, input: Record<string, unknown> & { ad_account_id: string }) {
  const res = await ctx.supabase.from("ad_campaign_metrics")
    .upsert({ ...input, business_id: ctx.businessId, source: "manual", voided_at: null },
      { onConflict: "business_id,ad_account_id,metric_date,campaign_name,adset_name,ad_name" })
    .select("id")
    .single();
  return unwrap(res);
}

export async function voidAdMetric(ctx: BusinessContext, id: string) {
  const res = await ctx.supabase.from("ad_campaign_metrics").update({ voided_at: new Date().toISOString() })
    .eq("id", id).eq("business_id", ctx.businessId).select("id").single();
  return unwrap(res);
}

export function totalsOf(rows: ReturnType<typeof computeAdMetrics>[]) {
  return computeAdMetrics({
    spend: money(rows.reduce((t, r) => t.plus(r.spend), dec(0))),
    impressions: rows.reduce((t, r) => t + r.impressions, 0),
    clicks: rows.reduce((t, r) => t + r.clicks, 0),
    purchases: money(rows.reduce((t, r) => t.plus(r.purchases), dec(0))),
    attributedRevenue: money(rows.reduce((t, r) => t.plus(r.attributedRevenue), dec(0))),
  });
}
