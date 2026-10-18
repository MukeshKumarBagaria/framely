"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus, Upload } from "lucide-react";
import { formatDateIN } from "../domain/dates";
import { dec, formatCount, formatINR } from "../domain/money";
import { api, errorMessage } from "./api";
import { ChartCard, COLORS, ComboChart } from "./charts";
import { Amt } from "./format";
import { FormModal, ReasonModal, clean, todayInput } from "./forms";
import { Badge, Button, Card, EmptyState, Notice, Stat } from "./kit";
import { useToast } from "./overlay";
import { useUrlState } from "./use-url-state";

export type AdAccount = { id: string; platform: string; name: string; external_account_id: string; is_active: boolean };
export type Campaign = { adAccountId: string; campaign: string; days: number; spend: string; impressions: number; clicks: number; purchases: string; attributedRevenue: string; cpm: string | null; cpc: string | null; ctr: string | null; roas: string | null; costPerPurchase: string | null };
export type Totals = Omit<Campaign, "adAccountId" | "campaign" | "days">;
export type MetricRow = { id: string; ad_account_id: string; metric_date: string; campaign_name: string; adset_name: string; ad_name: string; spend: number; impressions: number; clicks: number; purchases: number; attributed_revenue: number; source: string; ad_accounts: { name: string } | null };
export type Daily = { day: string; label: string; spend: number; attributedRevenue: number; clicks: number };

const dash = (v: string | null, f: (x: string) => string) => (v === null ? <span className="text-zinc-600" title="Not available: the denominator is zero">n/a</span> : f(v));

export function AdvertisingView({ accounts, totals, campaigns, metrics, metricsTotal, daily, netSales, contributionAfterAds, spendPercentOfSales, canWrite }: {
  accounts: AdAccount[]; totals: Totals; campaigns: Campaign[]; metrics: MetricRow[]; metricsTotal: number; daily: Daily[];
  netSales: string; contributionAfterAds: string | null; spendPercentOfSales: string | null; canWrite: boolean;
}) {
  const { refresh } = useUrlState();
  const toast = useToast();
  const [entry, setEntry] = useState(false);
  const [accountForm, setAccountForm] = useState(false);
  const [voiding, setVoiding] = useState<MetricRow | null>(null);
  const done = (m: string) => { toast.notify("success", m); refresh(); };
  const hasData = campaigns.length > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {canWrite && (
          <>
            <Link href="/business-analysis/imports?type=meta_ads" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3.5 text-sm font-medium text-zinc-100 hover:border-zinc-500"><Upload className="h-4 w-4" aria-hidden /> Import Meta CSV</Link>
            <Button onClick={() => setAccountForm(true)}>Ad accounts ({accounts.length})</Button>
            <Button variant="primary" onClick={() => setEntry(true)} disabled={accounts.length === 0} title={accounts.length === 0 ? "Add an ad account first" : undefined}><Plus className="h-4 w-4" aria-hidden /> Daily entry</Button>
          </>
        )}
      </div>

      <Notice tone="info" title="How to read these figures">
        Spend is real money and goes into your profit. <strong>Attributed revenue and ROAS are Meta&apos;s own numbers</strong> — they can overlap Meesho sales and are not your Meesho revenue, so they are shown for comparison only.
      </Notice>

      <section aria-label="Advertising summary" className="grid grid-cols-2 gap-4 ba-surface rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Ad spend" value={<Amt v={totals.spend} decimals={0} />} />
        <Stat label="Impressions" value={formatCount(totals.impressions)} />
        <Stat label="Clicks" value={formatCount(totals.clicks)} hint={dash(totals.ctr, (v) => `CTR ${v}%`)} />
        <Stat label="CPM" value={dash(totals.cpm, (v) => formatINR(v))} hint="per 1,000 impressions" />
        <Stat label="CPC" value={dash(totals.cpc, (v) => formatINR(v))} />
        <Stat label="Attributed purchases" value={formatCount(totals.purchases)} />
        <Stat label="Cost / purchase" value={dash(totals.costPerPurchase, (v) => formatINR(v))} />
        <Stat label="ROAS (Meta-attributed)" value={dash(totals.roas, (v) => `${v}×`)} hint="attributed value ÷ spend" />
        <Stat label="Spend as % of sales" value={spendPercentOfSales === null ? "n/a" : `${spendPercentOfSales}%`} hint={`of net sales ${formatINR(netSales, { decimals: 0 })}`} />
        <Stat label="Contribution after ads" value={<Amt v={contributionAfterAds} signed decimals={0} />} hint="sales − product & selling costs − ads" tone={contributionAfterAds === null ? "neutral" : dec(contributionAfterAds).lessThan(0) ? "negative" : "positive"} />
      </section>

      <ChartCard title="Spend vs attributed revenue" subtitle="Daily; attributed revenue is Meta's claim" description="Combined chart of daily ad spend and Meta-attributed purchase value." empty={daily.length === 0} emptyText="Add daily spend or import a Meta report.">
        <ComboChart data={daily} xKey="label" series={[
          { key: "spend", name: "Ad spend", color: COLORS.ads, type: "bar", axis: "left" },
          { key: "attributedRevenue", name: "Attributed revenue", color: COLORS.revenue, type: "line", axis: "left" },
        ]} />
      </ChartCard>

      <Card title="Campaigns" subtitle="Totals for the selected period">
        {!hasData ? <EmptyState title="No advertising data in this period" action={canWrite && accounts.length === 0 ? <Button variant="primary" onClick={() => setAccountForm(true)}>Add an ad account</Button> : undefined}>Enter daily spend by hand or import a Meta Ads Manager CSV. Campaign metrics are never invented.</EmptyState> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-max text-left text-[13px]">
              <thead className="text-xs font-medium text-zinc-500"><tr><th className="px-3 py-2">Campaign</th><th className="px-3 py-2 text-right">Spend</th><th className="px-3 py-2 text-right">Impr.</th><th className="px-3 py-2 text-right">Clicks</th><th className="px-3 py-2 text-right">CTR</th><th className="px-3 py-2 text-right">CPM</th><th className="px-3 py-2 text-right">CPC</th><th className="px-3 py-2 text-right">Purchases</th><th className="px-3 py-2 text-right">Cost/purch.</th><th className="px-3 py-2 text-right">Attrib. revenue</th><th className="px-3 py-2 text-right">ROAS</th></tr></thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.adAccountId + c.campaign} className="border-t border-zinc-800/70">
                    <td className="max-w-64 truncate px-3 py-2" title={c.campaign}>{c.campaign}<div className="text-xs text-zinc-500">{accounts.find((a) => a.id === c.adAccountId)?.name} · {c.days} day(s)</div></td>
                    <td className="px-3 py-2 text-right"><Amt v={c.spend} /></td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatCount(c.impressions)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatCount(c.clicks)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{dash(c.ctr, (v) => `${v}%`)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{dash(c.cpm, (v) => formatINR(v))}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{dash(c.cpc, (v) => formatINR(v))}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatCount(c.purchases)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{dash(c.costPerPurchase, (v) => formatINR(v))}</td>
                    <td className="px-3 py-2 text-right"><Amt v={c.attributedRevenue} /></td>
                    <td className="px-3 py-2 text-right tabular-nums">{dash(c.roas, (v) => `${v}×`)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Daily entries" subtitle={`${metricsTotal.toLocaleString("en-IN")} rows. Re-entering the same day and campaign updates it rather than adding a duplicate.`}>
        {metrics.length === 0 ? <p className="text-sm text-zinc-500">Nothing in this period.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-max text-left text-[13px]">
              <thead className="text-xs font-medium text-zinc-500"><tr><th className="px-3 py-2">Date</th><th className="px-3 py-2">Account</th><th className="px-3 py-2">Campaign / ad set / ad</th><th className="px-3 py-2 text-right">Spend</th><th className="px-3 py-2 text-right">Impr.</th><th className="px-3 py-2 text-right">Clicks</th><th className="px-3 py-2">Source</th><th /></tr></thead>
              <tbody>
                {metrics.map((m) => (
                  <tr key={m.id} className="border-t border-zinc-800/70">
                    <td className="px-3 py-2">{formatDateIN(m.metric_date)}</td>
                    <td className="px-3 py-2 text-zinc-400">{m.ad_accounts?.name}</td>
                    <td className="max-w-72 truncate px-3 py-2" title={[m.campaign_name, m.adset_name, m.ad_name].filter(Boolean).join(" / ")}>{[m.campaign_name, m.adset_name, m.ad_name].filter(Boolean).join(" / ") || <span className="text-zinc-600">(account total)</span>}</td>
                    <td className="px-3 py-2 text-right"><Amt v={m.spend} /></td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatCount(m.impressions)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatCount(m.clicks)}</td>
                    <td className="px-3 py-2"><Badge>{m.source}</Badge></td>
                    <td className="px-3 py-2 text-right">{canWrite && <Button size="sm" variant="ghost" onClick={() => setVoiding(m)}>Void</Button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <FormModal open={entry} onClose={() => setEntry(false)} wide title="Daily advertising entry" description="Spend feeds your profit directly. Attributed purchases and revenue are optional and come from Meta."
        initial={{ ad_account_id: accounts.find((a) => a.is_active)?.id ?? "", metric_date: todayInput(), campaign_name: "", adset_name: "", ad_name: "", spend: "", impressions: "", reach: "", clicks: "", link_clicks: "", purchases: "", attributed_revenue: "", attribution_window: "7-day click, 1-day view", notes: "" }}
        fields={[
          { name: "ad_account_id", label: "Ad account", type: "select", required: true, options: accounts.filter((a) => a.is_active).map((a) => ({ value: a.id, label: a.name })) },
          { name: "metric_date", label: "Date", type: "date", required: true },
          { name: "campaign_name", label: "Campaign" }, { name: "adset_name", label: "Ad set" }, { name: "ad_name", label: "Ad" },
          { name: "spend", label: "Amount spent (₹)", type: "money", required: true },
          { name: "impressions", label: "Impressions", type: "number", min: 0 }, { name: "reach", label: "Reach", type: "number", min: 0 },
          { name: "clicks", label: "Clicks (all)", type: "number", min: 0 }, { name: "link_clicks", label: "Link clicks", type: "number", min: 0 },
          { name: "purchases", label: "Attributed purchases", type: "number", min: 0 }, { name: "attributed_revenue", label: "Attributed purchase value (₹)", type: "money" },
          { name: "attribution_window", label: "Attribution window", wide: true }, { name: "notes", label: "Notes", wide: true },
        ]}
        onSubmit={async (v) => { await api("/advertising", { method: "POST", body: clean(v, ["impressions", "reach", "clicks", "link_clicks"]) }); setEntry(false); done("Ad spend saved."); }} />

      <FormModal open={accountForm} onClose={() => setAccountForm(false)} title="Ad accounts" description={accounts.length ? `Existing: ${accounts.map((a) => a.name).join(", ")}` : "Add the account your spend belongs to."}
        initial={{ platform: "meta", name: "", external_account_id: "", is_active: true }}
        fields={[{ name: "platform", label: "Platform", type: "select", options: [["meta", "Meta (Facebook / Instagram)"], ["google", "Google"], ["meesho_ads", "Meesho Ads"], ["other", "Other"]].map(([value, label]) => ({ value, label })) }, { name: "name", label: "Account name", required: true }, { name: "external_account_id", label: "Account ID", required: true, hint: "Meta Ads Manager account number" }]}
        submitLabel="Add account"
        onSubmit={async (v) => { try { await api("/advertising/accounts", { method: "POST", body: clean(v) }); setAccountForm(false); done("Ad account added."); } catch (e) { throw e instanceof Error ? e : new Error(errorMessage(e)); } }} />

      <ReasonModal open={voiding !== null} onClose={() => setVoiding(null)} title="Void this ad entry?" description="It stays in the database for audit but is excluded from every total." confirmLabel="Void entry"
        onConfirm={async () => { await api(`/advertising/${voiding!.id}`, { method: "DELETE" }); setVoiding(null); done("Entry voided."); }} />
    </div>
  );
}
