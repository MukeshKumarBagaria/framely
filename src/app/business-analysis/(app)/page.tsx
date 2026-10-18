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
import { Card, EmptyState, LinkButton, Notice, PageHeader } from "@/business-analysis/ui/kit";
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
  const HERO = ["recognized_revenue", "net_profit", "settled_amount", "profit_margin"];
  const hero = HERO.map((key) => data.kpis.find((k) => k.key === key)).filter((k): k is NonNullable<typeof k> => Boolean(k));
  const rest = data.kpis.filter((k) => !HERO.includes(k.key));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Overview"
        description="Sales, profit and cash for the selected period. They are tracked separately because they are not the same thing."
        actions={<ExportMenu report="profit_loss" label="Export P&L" />}
      />
      <GlobalFilters periodLabel={`${period.current.label} · ${formatDateIN(period.current.from)} – ${formatDateIN(period.current.to)}`} comparisonLabel={`${period.previous.label} (${formatDateIN(period.previous.from)} – ${formatDateIN(period.previous.to)})`} skus={skus} defaultPreset="this_month" />

      {data.segment && (
        <Notice tone="info" title="Filtered view">
          Shop-wide costs (rent, salaries, software, ads not tied to an order) cannot be split by SKU, channel or status, so profit here is <strong>contribution</strong>: net sales minus product cost and selling deductions. Clear the filters to see operating and net profit.
        </Notice>
      )}
      <section aria-label="Headline figures" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {hero.map((k) => (
          <KpiCard key={k.key} kpi={k} size="hero" />
        ))}
      </section>

      {noData ? (
        <Card>
          <EmptyState
            title="No sales, costs or cash recorded in this period"
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <LinkButton href="/business-analysis/imports" variant="primary">Import a Meesho report</LinkButton>
                <LinkButton href="/business-analysis/products">Set up product costs</LinkButton>
                <LinkButton href="/business-analysis/expenses">Add an expense</LinkButton>
              </div>
            }
          >
            Start by adding your product costs, then import your Meesho orders and payment reports. Every figure here comes from your own records; nothing is estimated from thin air.
          </EmptyState>
        </Card>
      ) : (
        <>
          <section aria-label="More figures" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {rest.map((k) => (
              <KpiCard key={k.key} kpi={k} />
            ))}
          </section>
          {pnl.netProfitIsEstimate && !data.segment && (
            <p className="-mt-2 text-xs text-zinc-500">Net profit is an estimate before unrecorded adjustments (no income tax recorded). Estimates are not audited figures.</p>
          )}

          {data.insights.length > 0 && (
            <Card title="Things to check" subtitle="Rule-based flags from your data. They point to what to look at, not to causes.">
              <ul className="flex flex-col divide-y divide-zinc-800">
                {data.insights.map((i) => {
                  const Icon = i.severity === "critical" ? AlertTriangle : i.severity === "warning" ? TriangleAlert : Info;
                  return (
                    <li key={i.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${i.severity === "critical" ? "text-rose-400" : i.severity === "warning" ? "text-amber-400" : "text-sky-400"}`} aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-zinc-100">{i.title}</p>
                        <p className="text-[13px] text-zinc-500">{i.detail}</p>
                      </div>
                      {i.href && (
                        <Link href={baHref(i.href)} className="shrink-0 text-[13px] font-medium text-sky-400 hover:underline">
                          Review
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}

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
        </>
      )}
    </div>
  );
}
