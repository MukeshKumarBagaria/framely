import { expenseListSchema, expenseSchema } from "@/business-analysis/schemas";
import { apiRoute, readJson, readQuery } from "@/business-analysis/server/http";
import { resolveFilters } from "@/business-analysis/server/services/dashboard-service";
import { listExpenses, saveExpense } from "@/business-analysis/server/services/expense-service";

export const GET = apiRoute({}, async ({ req, ctx }) => {
  const q = readQuery(req, expenseListSchema);
  const { period } = resolveFilters(ctx, q);
  const result = await listExpenses(ctx, {
    from: period.current.from, to: period.current.to, category: q.category, paymentStatus: q.paymentStatus,
    search: q.search, templates: q.recurring === "templates", page: q.page, pageSize: q.pageSize, sort: q.sort, dir: q.dir,
  });
  return { ...result, page: q.page, pageSize: q.pageSize, period };
});

export const POST = apiRoute({ minRole: "writer" }, async ({ req, ctx }) => ({ id: await saveExpense(ctx, null, await readJson(req, expenseSchema)) }));
