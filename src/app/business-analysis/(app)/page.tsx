import Link from "next/link";
import { AlertTriangle, Info, TriangleAlert } from "lucide-react";
import { formatDateIN } from "@/business-analysis/domain/dates";
import { formatINR, formatPercent } from "@/business-analysis/domain/money";
import { filtersSchema } from "@/business-analysis/schemas";
import { pageContext } from "@/business-analysis/server/page-guard";
import { getDashboard } from "@/business-analysis/server/services/dashboard-service";
import { distinctSkus } from "@/business-analysis/server/services/order-service";
import { ExportMenu } from "@/business-analysis/ui/export-menu";
import { GlobalFilters } from "@/business-analysis/ui/global-filters";
import { Badge, Card, EmptyState, Notice, PageHeader } from "@/business-analysis/ui/kit";
import { KpiCard } from "@/business-analysis/ui/kpi-card";
import { baHref } from "@/business-analysis/ui/links";
import { OverviewCharts } from "@/business-analysis/ui/overview-charts";

type SP = Record<string, string | string[] | undefined>;
const flat = (sp: SP) => Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));

export default async function OverviewPage({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await pageContext();
  const filters = filtersSchema.parse(flat(await searchParams));
  const [data, skus] = await Promise.all([getDashboard(ctx, filters), distinctSkus(ctx)]);
  const { pnl, period } = data;
  const noData = pnl.counts.lines === 0 && data.cash.totalIn === "0.00" && data.cash.totalOut === "0.00";
  const sev = { critical: "negative", warning: "warning", info: "info" } as const;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Overview"
        description={`${data.businessName} — sales, accounting profit and cash are shown separately; they are not the same thing.`}
        actions={<ExportMenu report="profit_loss" label="Export P&L" />}
      />
      <GlobalFilters periodLabel={`${period.current.label} · ${formatDateIN(period.current.from)} – ${formatDateIN(period.current.to)}`} comparisonLabel={`${period.previous.label} (${formatDateIN(period.previous.from)} – ${formatDateIN(period.previous.to)})`} skus={skus} defaultPreset="this_month" />

      {data.segment && (
        <Notice tone="info" title="Filtered view">
          Shop-wide costs (rent, salaries, software, ads not tied to an order) cannot be split by SKU, channel or status, so profit here is <strong>contribution</strong>: net sales minus product cost and selling deductions. Clear the filters to see operating and net profit.
        </Notice>
      )}
      {noData && (
        <Card>
          <EmptyState title="No financial data in this period" action={<Link href="/business-analysis/imports" className="text-sm text-sky-400 underline">Import a Meesho report</Link>}>
            Import order, settlement or return reports, or add expenses and ad spend, then the figures below fill in. Nothing here is estimated from thin air.
          </EmptyState>
        </Card>
      )}

      <section aria-label="Key figures" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {data.kpis.map((k) => (
          <KpiCard key={k.key} kpi={k} />
        ))}
      </section>

      {pnl.netProfitIsEstimate && !data.segment && (
        <p className="text-xs text-zinc-500">Net profit is an estimate before unrecorded adjustments: no income tax is recorded for this period. Estimates are not audited accounting figures.</p>
      )}

      <Card title="Business insights" subtitle="Rule-based and explained by the data; they point to things to check, not causes.">
        {data.insights.length === 0 ? (
          <p className="text-sm text-zinc-400">Nothing unusual stands out for this period.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-zinc-800/80">
            {data.insights.map((i) => {
              const Icon = i.severity === "critical" ? AlertTriangle : i.severity === "warning" ? TriangleAlert : Info;
              return (
                <li key={i.id} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${i.severity === "critical" ? "text-rose-400" : i.severity === "warning" ? "text-amber-400" : "text-sky-400"}`} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-100">
                      {i.title} <Badge tone={sev[i.severity]}>{i.severity}</Badge>
                    </p>
                    <p className="text-[13px] text-zinc-400">{i.detail}</p>
                  </div>
                  {i.href && (
                    <Link href={baHref(i.href)} className="shrink-0 text-xs text-sky-400 hover:underline">
                      Review
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <OverviewCharts
        series={data.series}
        weekly={data.weekly}
        monthly={data.monthly}
        breakdown={data.expenseBreakdown}
        statuses={data.statusDistribution}
        skus={data.skus}
        query={data.query}
        segment={data.segment}
        hasAds={data.series.some((s) => s.adSpend > 0 || s.attributedRevenue > 0)}
      />

      <Card title="Profit and loss summary" subtitle={`Basis: ${data.profitBasis === "net" ? "accrual (recognised sales), not cash" : "contribution only"}`}>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
          {[
            ["Net sales (excl. GST)", pnl.revenue.netSales],
            ["Cost of goods sold", pnl.cogs.total],
            ["Gross profit", pnl.grossProfit],
            ["Selling costs (fees, shipping, returns)", pnl.variableCosts.total],
            ["Contribution before ads", pnl.contributionBeforeAds],
            ["Advertising", pnl.advertising.total],
            ["Operating expenses", pnl.operatingExpenses?.total ?? null],
            ["Operating profit", pnl.operatingProfit],
            ["Net profit (estimated)", pnl.netProfit],
          ].map(([label, value]) => (
            <div key={String(label)} className="flex justify-between gap-4 border-b border-zinc-800/60 py-1.5">
              <dt className="text-zinc-400">{String(label)}</dt>
              <dd className="tabular-nums text-zinc-100">{value === null ? "—" : formatINR(String(value))}</dd>
            </div>
          ))}
          <div className="flex justify-between gap-4 py-1.5">
            <dt className="text-zinc-400">Net margin</dt>
            <dd className="tabular-nums text-zinc-100">{formatPercent(pnl.margins.net)}</dd>
          </div>
        </dl>
        <details className="mt-3 text-xs text-zinc-500">
          <summary className="cursor-pointer text-zinc-400">Assumptions used (settings effective {formatDateIN(data.settingsEffectiveFrom)})</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {data.policyNotes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </details>
      </Card>
    </div>
  );
}
