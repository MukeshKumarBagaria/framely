import { z } from "zod";
import { materialSchema } from "@/business-analysis/schemas";
import { apiRoute, readJson } from "@/business-analysis/server/http";
import { saveMaterial } from "@/business-analysis/server/services/product-costing-service";

export const PATCH = apiRoute<{ id: string }>({ minRole: "writer" }, async ({ req, ctx, params }) => {
  const { initial_unit_cost: _c, initial_cost_date: _d, ...input } = await readJson(req, materialSchema);
  return saveMaterial(ctx, z.string().uuid().parse(params.id), { ...input, reorder_threshold: Number(input.reorder_threshold) });
});
