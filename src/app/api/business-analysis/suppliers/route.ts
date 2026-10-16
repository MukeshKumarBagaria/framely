import { supplierSchema } from "@/business-analysis/schemas";
import { apiRoute, readJson } from "@/business-analysis/server/http";
import { listSuppliers, saveSupplier } from "@/business-analysis/server/services/inventory-service";

export const GET = apiRoute({}, async ({ ctx }) => ({ suppliers: await listSuppliers(ctx) }));

export const POST = apiRoute({ minRole: "writer" }, async ({ req, ctx }) => saveSupplier(ctx, null, await readJson(req, supplierSchema)));
