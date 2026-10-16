import { expenseCategorySchema } from "@/business-analysis/schemas";
import { apiRoute, readJson } from "@/business-analysis/server/http";
import { listCategories, saveCategory } from "@/business-analysis/server/services/expense-service";

export const GET = apiRoute({}, async ({ ctx }) => ({ categories: await listCategories(ctx) }));

export const POST = apiRoute({ minRole: "admin" }, async ({ req, ctx }) => saveCategory(ctx, null, await readJson(req, expenseCategorySchema)));
