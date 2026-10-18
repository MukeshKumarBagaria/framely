import { formatDateIN } from "@/business-analysis/domain/dates";
import { expenseListSchema } from "@/business-analysis/schemas";
import { pageContext } from "@/business-analysis/server/page-guard";
import { resolveFilters } from "@/business-analysis/server/services/dashboard-service";
import { listCategories, listExpenses } from "@/business-analysis/server/services/expense-service";
import { ExpensesView } from "@/business-analysis/ui/expenses-view";
import { ExportMenu } from "@/business-analysis/ui/export-menu";
import { GlobalFilters } from "@/business-analysis/ui/global-filters";
import { PageHeader } from "@/business-analysis/ui/kit";

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await pageContext();
  const raw = Object.fromEntries(Object.entries(await searchParams).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
  const q = expenseListSchema.parse(raw);
  const { period } = resolveFilters(ctx, q, "this_month");
  const [list, categories] = await Promise.all([
    listExpenses(ctx, { from: period.current.from, to: period.current.to, category: q.category, paymentStatus: q.paymentStatus, search: q.search, templates: q.recurring === "templates", page: q.page, pageSize: q.pageSize, sort: q.sort, dir: q.dir }),
    listCategories(ctx),
  ]);
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Expenses" description="Every cost, by the date it was incurred. Cash payment is tracked separately, and costs the platform already deducted are flagged so they are never counted twice." actions={<ExportMenu report="expenses" formats={["csv", "xlsx"]} />} />
      <GlobalFilters periodLabel={`${period.current.label} · ${formatDateIN(period.current.from)} – ${formatDateIN(period.current.to)}`} show={{}} defaultPreset="this_month" />
      <ExpensesView rows={list.rows} total={list.total} page={q.page} pageSize={q.pageSize} categories={categories} canWrite={ctx.can("writer")} isTemplates={q.recurring === "templates"} />
    </div>
  );
}
