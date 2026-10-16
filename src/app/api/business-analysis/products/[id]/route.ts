import { z } from "zod";
import { productSchema } from "@/business-analysis/schemas";
import { apiRoute, readJson } from "@/business-analysis/server/http";
import { saveProduct } from "@/business-analysis/server/services/product-costing-service";

export const PATCH = apiRoute<{ id: string }>({ minRole: "writer" }, async ({ req, ctx, params }) => {
  const input = await readJson(req, productSchema);
  return saveProduct(ctx, z.string().uuid().parse(params.id), input);
});
