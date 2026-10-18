import { formatDateIN, formatShortDate } from "@/business-analysis/domain/dates";
import { dec, percentOf } from "@/business-analysis/domain/money";
import { filtersSchema, pageSchema } from "@/business-analysis/schemas";
import { pageContext } from "@/business-analysis/server/page-guard";
import { campaignSummary, listAdAccounts, listAdMetrics, totalsOf } from "@/business-analysis/server/services/advertising-service";
import { getPeriodPnl } from "@/business-analysis/server/services/dashboard-service";
import { AdvertisingView, type Daily } from "@/business-analysis/ui/advertising-view";
import { GlobalFilters } from "@/business-analysis/ui/global-filters";
import { PageHeader } from "@/business-analysis/ui/kit";

export default async function AdvertisingPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await pageContext();
  const raw = Object.fromEntries(Object.entries(await searchParams).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
  const q = filtersSchema.merge(pageSchema).parse(raw);
  const period = await getPeriodPnl(ctx, { preset: q.preset, from: q.from, to: q.to });
  const range = period.filters.period.current;
  const [accounts, campaigns, metrics] = await Promise.all([
    listAdAccounts(ctx),
    campaignSummary(ctx, range),
    listAdMetrics(ctx, { from: range.from, to: range.to, page: q.page, pageSize: q.pageSize, search: q.search }),
  ]);
  const totals = totalsOf(campaigns);
  const daily: Daily[] = [...period.days.entries()]
    .filter(([, i]) => i.ads.length > 0)
    .map(([day, i]) => ({
      day,
      label: formatShortDate(day),
      spend: i.ads.reduce((t, a) => t.plus(a.spend), dec(0)).toNumber(),
      attributedRevenue: i.ads.reduce((t, a) => t.plus(a.attributedRevenue), dec(0)).toNumber(),
      clicks: i.ads.reduce((t, a) => t + a.clicks, 0),
    }))
    .sort((a, b) => a.day.localeCompare(b.day));
  const { pnl } = period;
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Advertising" description="Meta Ads spend and performance. Spend counts toward profit once; it is never added again as an allocated per-order cost." />
      <GlobalFilters periodLabel={`${range.label} · ${formatDateIN(range.from)} – ${formatDateIN(range.to)}`} show={{}} defaultPreset="last_30_days" />
      <AdvertisingView
        accounts={accounts}
        totals={totals}
        campaigns={campaigns}
        metrics={metrics.rows as never}
        metricsTotal={metrics.total}
        daily={daily}
        netSales={pnl.revenue.netSales}
        contributionAfterAds={pnl.contributionAfterAds}
        spendPercentOfSales={percentOf(totals.spend, pnl.revenue.netSales)}
        canWrite={ctx.can("writer")}
      />
    </div>
  );
}
