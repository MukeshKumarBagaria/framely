import { z } from "zod";
import { formatDateIN } from "@/business-analysis/domain/dates";
import { RECON_STATUSES } from "@/business-analysis/domain/statuses";
import { filtersSchema, pageSchema } from "@/business-analysis/schemas";
import { pageContext } from "@/business-analysis/server/page-guard";
import { resolveFilters } from "@/business-analysis/server/services/dashboard-service";
import { getReconciliationSummary, listReconciliationLines, listSettlements, listUnlinkedItems } from "@/business-analysis/server/services/reconciliation-service";
import { getSettingsAt } from "@/business-analysis/server/services/settings-service";
import { ExportMenu } from "@/business-analysis/ui/export-menu";
import { GlobalFilters } from "@/business-analysis/ui/global-filters";
import { PageHeader } from "@/business-analysis/ui/kit";
import { ReconciliationView } from "@/business-analysis/ui/reconciliation-view";

const query = filtersSchema.merge(pageSchema).extend({
  reconStatus: z.enum(RECON_STATUSES).optional().catch(undefined),
  view: z.enum(["lines", "unlinked", "settlements"]).default("lines").catch("lines"),
});

export default async function ReconciliationPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await pageContext();
  const raw = Object.fromEntries(Object.entries(await searchParams).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
  const q = query.parse(raw);
  const { period } = resolveFilters(ctx, q, "last_30_days");
  const { settings } = await getSettingsAt(ctx, period.current.to);
  const summary = await getReconciliationSummary(ctx, period.current, settings);
  let lines: Awaited<ReturnType<typeof listReconciliationLines>> = { rows: [], total: 0 };
  let unlinked: Awaited<ReturnType<typeof listUnlinkedItems>> = { rows: [], total: 0 };
  let settlements: Awaited<ReturnType<typeof listSettlements>> = [];
  if (q.view === "unlinked") unlinked = await listUnlinkedItems(ctx, period.current, q.page, q.pageSize);
  else if (q.view === "settlements") settlements = await listSettlements(ctx, period.current);
  else lines = await listReconciliationLines(ctx, period.current, settings, { status: q.reconStatus, search: q.search, page: q.page, pageSize: q.pageSize });
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Meesho reconciliation" description="Orders against what Meesho says it paid and what reached your bank. Differences, missing settlements and duplicates are listed, never silently absorbed." actions={<ExportMenu report="reconciliation" />} />
      <GlobalFilters periodLabel={`Orders from ${formatDateIN(period.current.from)} to ${formatDateIN(period.current.to)}`} show={{}} defaultPreset="last_30_days" />
      <ReconciliationView view={q.view} summary={summary} lines={lines.rows} unlinked={unlinked.rows as never} settlements={settlements} total={q.view === "unlinked" ? unlinked.total : lines.total} page={q.page} pageSize={q.pageSize} canWrite={ctx.can("writer")} tolerance={String(settings.settlements.reconciliationTolerance)} />
    </div>
  );
}
