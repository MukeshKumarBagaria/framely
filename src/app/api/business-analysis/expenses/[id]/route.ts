import { z } from "zod";
import { expenseSchema } from "@/business-analysis/schemas";
import { AppError, unwrap } from "@/business-analysis/server/errors";
import { apiRoute, readJson } from "@/business-analysis/server/http";
import { expenseAudit, saveExpense } from "@/business-analysis/server/services/expense-service";

const id = z.string().uuid();

export const GET = apiRoute<{ id: string }>({}, async ({ ctx, params }) => {
  const expenseId = id.parse(params.id);
  const expense = unwrap(await ctx.supabase.from("expenses").select("*, expense_categories(name, slug, treatment)").eq("business_id", ctx.businessId).eq("id", expenseId).maybeSingle());
  if (!expense) throw new AppError("not_found", "Expense not found.");
  const cash = unwrap(await ctx.supabase.from("cash_transactions").select("id, txn_date, direction, txn_type, amount, voided_at, void_reason").eq("business_id", ctx.businessId).eq("linked_expense_id", expenseId));
  return { expense, cash, audit: await expenseAudit(ctx, expenseId) };
});

/** Edits an active expense; the change is captured in the audit log with before/after values. */
export const PATCH = apiRoute<{ id: string }>({ minRole: "writer" }, async ({ req, ctx, params }) => ({
  id: await saveExpense(ctx, id.parse(params.id), await readJson(req, expenseSchema)),
}));
