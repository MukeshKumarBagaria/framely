"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { BreakdownSlice } from "../domain/financial-calculations";
import { ORDER_STATUS_LABELS, type OrderStatus } from "../domain/statuses";
import type { SeriesRow, SkuRow } from "../server/services/dashboard-service";
import { dec } from "../domain/money";
import { formatShortDate } from "../domain/dates";
import { ChartCard, COLORS, ComboChart, Donut, GroupedBars, HorizontalBars, TrendChart } from "./charts";
import { baHref } from "./links";

const STATUS_COLORS: Partial<Record<OrderStatus, string>> = {
  delivered: "var(--ba-profit)", shipped: "var(--ba-revenue)", pending: "var(--ba-costs)", cancelled: "var(--ba-muted)",
  rto: "var(--ba-loss)", returned: "var(--ba-cash-out)", return_requested: "var(--ba-cat-9)", exchanged: "var(--ba-ads)", lost: "var(--ba-cat-5)", unknown: "var(--color-zinc-600)",
};

type Props = {
  series: SeriesRow[];
  weekly: SeriesRow[];
  monthly: SeriesRow[];
  breakdown: BreakdownSlice[];
  statuses: { status: OrderStatus; lines: number }[];
  skus: SkuRow[];
  query: string;
  segment: boolean;
  hasAds: boolean;
};

export function OverviewCharts({ series, weekly, monthly, breakdown, statuses, skus, query, segment, hasAds }: Props) {
  const router = useRouter();
  const [period, setPeriod] = useState<"week" | "month">("week");
  const go = (path: string, extra?: Record<string, string>) => {
    const q = new URLSearchParams(query);
    for (const [k, v] of Object.entries(extra ?? {})) q.set(k, v);
    router.push(baHref(`${path}?${q.toString()}`));
  };
  const drill = (row: Record<string, unknown>) => go("orders", { preset: "custom", from: String(row.from), to: String(row.to) });
  const empty = series.length === 0 || series.every((s) => s.lines === 0 && s.netSales === 0 && s.costs === 0 && s.cashIn === 0 && s.cashOut === 0);
  const profitLabel = segment ? "Contribution" : "Net profit";
  const data = series.map((s) => ({ ...s, profit: s.profit ?? 0, lossProfit: s.profit }));
  const skuBars = skus.filter((s) => s.netSoldLines + s.lossLines > 0).map((s) => ({ key: s.sku, label: s.productName ? `${s.sku} · ${s.productName}`.slice(0, 28) : s.sku, value: dec(s.contribution).toNumber() }))
    .sort((a, b) => b.value - a.value);
  const skuShown = skuBars.length > 12 ? [...skuBars.slice(0, 6), ...skuBars.slice(-6)] : skuBars;
  const barWeekly = weekly.map((w) => ({ ...w, label: formatShortDate(w.from) }));
  const barMonthly = monthly.map((m) => ({ ...m, profit: m.profit ?? 0 }));

  const compare = period === "week" ? barWeekly.map((w) => ({ ...w, profit: w.profit ?? 0 })) : barMonthly;

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <div className="xl:col-span-2">
        <ChartCard
          title="Revenue, costs and profit"
          subtitle={segment ? "Filtered view: profit is contribution (before overheads and ads). Click a point to see its orders." : "Net sales, total expenses and net profit. Click a point to see its orders."}
          description="Line chart of net sales, costs and profit across the selected period."
          empty={empty}
          height={300}
        >
          <TrendChart
            data={data}
            xKey="label"
            onPointClick={drill}
            series={[
              { key: "netSales", name: "Net sales", color: COLORS.revenue },
              { key: "costs", name: segment ? "Product & selling costs" : "Total expenses", color: COLORS.costs },
              { key: "profit", name: profitLabel, color: COLORS.profit },
            ]}
          />
        </ChartCard>
      </div>

      <ChartCard title="Sales and order volume" subtitle="Net sales (bars) and order lines (line)" description="Combined bar and line chart of net sales and order lines per period." empty={empty}>
        <ComboChart
          data={series}
          xKey="label"
          onPointClick={drill}
          series={[
            { key: "netSales", name: "Net sales", color: COLORS.revenue, type: "bar", axis: "left" },
            { key: "lines", name: "Order lines", color: COLORS.costs, type: "line", axis: "right", format: "count" },
          ]}
        />
      </ChartCard>

      <ChartCard title="Order status" subtitle="Click a status to see those orders" description="Donut chart of order lines by status." empty={statuses.length === 0}>
        <Donut
          format="count"
          centerLabel="Order lines"
          data={statuses.map((s) => ({ key: s.status, label: ORDER_STATUS_LABELS[s.status], value: s.lines, color: STATUS_COLORS[s.status] }))}
          onSliceClick={(s) => go("orders", { status: s.key })}
        />
      </ChartCard>

      <ChartCard title="Where the money goes" subtitle="Costs by type; click to open the records" description="Donut chart of costs and expenses by category." empty={breakdown.length === 0}>
        <Donut
          data={breakdown.map((b) => ({ key: b.key, label: b.label, value: dec(b.amount).toNumber() }))}
          centerLabel="Total costs"
          onSliceClick={(s) => {
            const b = breakdown.find((x) => x.key === s.key);
            if (b?.href) go(b.href.split("?")[0], Object.fromEntries(new URLSearchParams(b.href.split("?")[1] ?? "")));
          }}
        />
      </ChartCard>

      <ChartCard title="Profit by product" subtitle="Contribution per SKU after product and selling costs" description="Horizontal bar chart of contribution by SKU; losses are red." empty={skuShown.length === 0} height={Math.max(260, skuShown.length * 28 + 40)}>
        <HorizontalBars data={skuShown} onBarClick={(sku) => go("orders", { sku })} />
      </ChartCard>

      <ChartCard title="Cash in vs cash out" subtitle="Money that actually moved, by payment date" description="Grouped bar chart of cash inflows and outflows." empty={series.every((s) => s.cashIn === 0 && s.cashOut === 0)} emptyText="Cash appears once settlements, expenses or purchases are recorded.">
        <GroupedBars
          data={series}
          xKey="label"
          onBarClick={() => router.push(baHref(`cash-flow?${query}`))}
          series={[
            { key: "cashIn", name: "Cash in", color: COLORS.cashIn },
            { key: "cashOut", name: "Cash out", color: COLORS.cashOut },
          ]}
        />
      </ChartCard>

      <ChartCard
        title={period === "week" ? "Last 8 weeks" : "Last 6 months"}
        subtitle="Net sales, costs and profit side by side"
        description="Grouped bar chart comparing net sales, costs and profit by week or month."
        empty={compare.every((w) => w.lines === 0 && w.costs === 0)}
        actions={
          <div role="radiogroup" aria-label="Compare by" className="flex rounded-lg border border-zinc-800 p-0.5 text-xs">
            {(["week", "month"] as const).map((p) => (
              <button key={p} type="button" role="radio" aria-checked={period === p} onClick={() => setPeriod(p)} className={`rounded-md px-2.5 py-1 ${period === p ? "bg-zinc-800 text-zinc-50" : "text-zinc-500 hover:text-zinc-200"}`}>
                {p === "week" ? "Weekly" : "Monthly"}
              </button>
            ))}
          </div>
        }
      >
        <GroupedBars
          data={compare}
          xKey="label"
          onBarClick={drill}
          series={[
            { key: "netSales", name: "Net sales", color: COLORS.revenue },
            { key: "costs", name: "Costs", color: COLORS.costs },
            { key: "profit", name: profitLabel, color: COLORS.profit },
          ]}
        />
      </ChartCard>

      {hasAds && (
        <div className="xl:col-span-2">
          <ChartCard title="Ad spend vs Meta-attributed revenue" subtitle="Attributed revenue is Meta's own claim and can overlap Meesho sales" description="Line chart of daily ad spend and Meta-attributed purchase value." empty={false}>
            <TrendChart
              data={series}
              xKey="label"
              onPointClick={(row) => router.push(baHref(`advertising?preset=custom&from=${row.from}&to=${row.to}`))}
              series={[
                { key: "adSpend", name: "Ad spend", color: COLORS.ads },
                { key: "attributedRevenue", name: "Attributed revenue", color: COLORS.revenue, dashed: true },
              ]}
            />
          </ChartCard>
        </div>
      )}
    </div>
  );
}
