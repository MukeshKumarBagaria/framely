import { formatDateIN } from "@/business-analysis/domain/dates";
import { formatINR } from "@/business-analysis/domain/money";
import { orderListSchema } from "@/business-analysis/schemas";
import { pageContext } from "@/business-analysis/server/page-guard";
import { distinctSkus, listOrderLines } from "@/business-analysis/server/services/order-service";
import { ExportMenu } from "@/business-analysis/ui/export-menu";
import { GlobalFilters } from "@/business-analysis/ui/global-filters";
import { PageHeader } from "@/business-analysis/ui/kit";
import { OrdersView } from "@/business-analysis/ui/orders-view";

type SP = Record<string, string | string[] | undefined>;

export default async function OrdersPage({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await pageContext();
  const raw = Object.fromEntries(Object.entries(await searchParams).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
  const q = orderListSchema.parse(raw);
  const [result, skus] = await Promise.all([listOrderLines(ctx, q), distinctSkus(ctx)]);
  const p = result.period;
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Orders"
        description={`${result.total.toLocaleString("en-IN")} order lines · period net sales ${formatINR(result.pnl.revenue.netSales, { decimals: 0 })}. Raw report values are kept separately from the normalised accounting values shown here.`}
        actions={<ExportMenu report="orders" formats={["csv", "xlsx"]} />}
      />
      <GlobalFilters periodLabel={`${p.current.label} · ${formatDateIN(p.current.from)} – ${formatDateIN(p.current.to)}`} skus={skus} defaultPreset="last_30_days" />
      <OrdersView rows={result.rows} total={result.total} page={q.page} pageSize={q.pageSize} canWrite={ctx.can("writer")} allocation={String(result.allocation)} />
    </div>
  );
}
