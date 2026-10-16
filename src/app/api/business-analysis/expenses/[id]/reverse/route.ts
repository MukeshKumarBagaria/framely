import { z } from "zod";
import { reverseExpenseSchema } from "@/business-analysis/schemas";
import { apiRoute, readJson } from "@/business-analysis/server/http";
import { reverseExpense } from "@/business-analysis/server/services/expense-service";

/** Reverses an expense with an offsetting entry instead of deleting it. */
export const POST = apiRoute<{ id: string }>({ minRole: "writer" }, async ({ req, ctx, params }) => ({
  reversalId: await reverseExpense(ctx, z.string().uuid().parse(params.id), await readJson(req, reverseExpenseSchema)),
}));
