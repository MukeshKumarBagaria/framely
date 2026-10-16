import { materialSchema } from "@/business-analysis/schemas";
import { apiRoute, readJson } from "@/business-analysis/server/http";
import { listMaterials } from "@/business-analysis/server/services/inventory-service";
import { listCostVersions, saveMaterial } from "@/business-analysis/server/services/product-costing-service";

export const GET = apiRoute({}, async ({ ctx }) => ({ materials: await listMaterials(ctx), costVersions: await listCostVersions(ctx) }));

export const POST = apiRoute({ minRole: "writer" }, async ({ req, ctx }) => {
  const input = await readJson(req, materialSchema);
  return saveMaterial(ctx, null, { ...input, reorder_threshold: Number(input.reorder_threshold) });
});
