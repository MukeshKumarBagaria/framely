import { productSchema } from "@/business-analysis/schemas";
import { apiRoute, readJson } from "@/business-analysis/server/http";
import { listProductsWithCosts, saveProduct } from "@/business-analysis/server/services/product-costing-service";

export const GET = apiRoute({}, async ({ ctx }) => ({ products: await listProductsWithCosts(ctx) }));

export const POST = apiRoute({ minRole: "writer" }, async ({ req, ctx }) => {
  const input = await readJson(req, productSchema);
  return saveProduct(ctx, null, input);
});
