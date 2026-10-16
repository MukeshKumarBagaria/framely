import { z } from "zod";
import { supplierSchema } from "@/business-analysis/schemas";
import { apiRoute, readJson } from "@/business-analysis/server/http";
import { saveSupplier } from "@/business-analysis/server/services/inventory-service";

export const PATCH = apiRoute<{ id: string }>({ minRole: "writer" }, async ({ req, ctx, params }) =>
  saveSupplier(ctx, z.string().uuid().parse(params.id), await readJson(req, supplierSchema)));
