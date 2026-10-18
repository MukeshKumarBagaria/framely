import { formatDateIN } from "@/business-analysis/domain/dates";
import { ADAPTERS } from "@/business-analysis/imports/registry";
import { filtersSchema, pageSchema } from "@/business-analysis/schemas";
import { getServerEnv } from "@/business-analysis/server/env";
import { pageContext } from "@/business-analysis/server/page-guard";
import { resolveFilters } from "@/business-analysis/server/services/dashboard-service";
import { listImports } from "@/business-analysis/server/services/import-service";
import { ExportMenu, type ExportReport } from "@/business-analysis/ui/export-menu";
import { GlobalFilters } from "@/business-analysis/ui/global-filters";
import { ImportHistory, UploadPanel, type ImportListRow } from "@/business-analysis/ui/import-center";
import { Card, PageHeader } from "@/business-analysis/ui/kit";

const REPORTS: [ExportReport, string, string][] = [
  ["profit_loss", "Profit and loss statement", "Revenue, costs and profit with the assumptions used"],
  ["weekly_summary", "Weekly business summary", "Week-by-week sales, costs and profit"],
  ["monthly_report", "Monthly financial report", "Month-by-month figures"],
  ["product_profitability", "Product profitability", "Contribution by SKU"],
  ["expense_breakdown", "Expense breakdown", "Costs by category"],
  ["reconciliation", "Meesho reconciliation", "Orders against settlements"],
  ["inventory", "Inventory report", "Stock and valuation"],
  ["cash_flow", "Cash flow statement", "Money in and out by payment date"],
];

export default async function ImportsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await pageContext();
  const raw = Object.fromEntries(Object.entries(await searchParams).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
  const q = filtersSchema.merge(pageSchema).parse(raw);
  const { period } = resolveFilters(ctx, q, "this_month");
  const canImport = ctx.can("writer");
  const history = canImport ? await listImports(ctx, q.page, 25) : null;
  const adapters = Object.values(ADAPTERS).map((a) => ({ reportType: a.reportType, label: a.label, description: a.description }));
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Reports & imports" description="Bring in Meesho and Meta reports, then export statements. Every export uses the same calculations as the dashboard." />
      {canImport && <UploadPanel adapters={adapters} maxMb={getServerEnv().maxUploadMb} presetType={typeof raw.type === "string" ? raw.type : undefined} />}
      {history && <ImportHistory rows={history.rows as unknown as ImportListRow[]} total={history.total} />}
      <Card title="Supported reports" subtitle="Each type has its own parser; columns are matched by name, and you can adjust the mapping before importing.">
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {adapters.map((a) => <li key={a.reportType} className="rounded-lg border border-zinc-800 p-3"><p className="text-sm font-medium text-zinc-100">{a.label}</p><p className="text-xs text-zinc-500">{a.description}</p></li>)}
        </ul>
      </Card>
      <section aria-label="Download reports" className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-zinc-100">Download statements</h2>
        <GlobalFilters periodLabel={`${period.current.label} · ${formatDateIN(period.current.from)} – ${formatDateIN(period.current.to)}`} show={{ channel: true, sku: true, status: true, settlement: true }} defaultPreset="this_month" />
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {REPORTS.map(([key, title, desc]) => (
            <li key={key} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-3">
              <div className="min-w-0"><p className="text-sm font-medium text-zinc-100">{title}</p><p className="truncate text-xs text-zinc-500">{desc}</p></div>
              <ExportMenu report={key} />
            </li>
          ))}
        </ul>
        <p className="text-xs text-zinc-500">PDFs state the period, assumptions and limitations. Figures marked estimated are not audited accounting statements.</p>
      </section>
    </div>
  );
}
