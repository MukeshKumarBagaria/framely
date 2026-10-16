import { z } from "zod";
import { expenseCategorySchema } from "@/business-analysis/schemas";
import { apiRoute, readJson } from "@/business-analysis/server/http";
import { saveCategory } from "@/business-analysis/server/services/expense-service";

/** Changing a category's treatment changes where it lands in the P&L, so it is admin-only. */
export const PATCH = apiRoute<{ id: string }>({ minRole: "admin" }, async ({ req, ctx, params }) =>
  saveCategory(ctx, z.string().uuid().parse(params.id), await readJson(req, expenseCategorySchema)));
