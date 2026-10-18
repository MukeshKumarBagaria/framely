import { z } from "zod";
import { formatDateIN } from "@/business-analysis/domain/dates";
import { filtersSchema, pageSchema } from "@/business-analysis/schemas";
import { pageContext } from "@/business-analysis/server/page-guard";
import { getCashFlow, listCashTransactions } from "@/business-analysis/server/services/cash-flow-service";
import { resolveFilters } from "@/business-analysis/server/services/dashboard-service";
import { getCurrentSettings } from "@/business-analysis/server/services/settings-service";
import { CashFlowView, type Txn } from "@/business-analysis/ui/cash-flow-view";
import { ExportMenu } from "@/business-analysis/ui/export-menu";
import { GlobalFilters } from "@/business-analysis/ui/global-filters";
import { PageHeader } from "@/business-analysis/ui/kit";

export default async function CashFlowPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await pageContext();
  const raw = Object.fromEntries(Object.entries(await searchParams).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
  const q = filtersSchema.merge(pageSchema).extend({ direction: z.enum(["in", "out"]).optional().catch(undefined) }).parse(raw);
  const { period } = resolveFilters(ctx, q, "this_month");
  const { settings } = await getCurrentSettings(ctx);
  const [flow, txns] = await Promise.all([
    getCashFlow(ctx, period.current, settings),
    listCashTransactions(ctx, { from: period.current.from, to: period.current.to, page: q.page, pageSize: q.pageSize, direction: q.direction }),
  ]);
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Cash flow" description="Money that actually moved in and out of the business, by payment date." actions={<ExportMenu report="cash_flow" />} />
      <GlobalFilters periodLabel={`${period.current.label} · ${formatDateIN(period.current.from)} – ${formatDateIN(period.current.to)}`} show={{}} defaultPreset="this_month" />
      <CashFlowView summary={flow.summary} series={flow.series} rows={txns.rows as unknown as Txn[]} total={txns.total} page={q.page} pageSize={q.pageSize} canWrite={ctx.can("writer")} />
    </div>
  );
}
