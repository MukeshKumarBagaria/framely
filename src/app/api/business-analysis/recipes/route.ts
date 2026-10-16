import { recipeSchema } from "@/business-analysis/schemas";
import { apiRoute, readJson } from "@/business-analysis/server/http";
import { createRecipeVersion } from "@/business-analysis/server/services/product-costing-service";

/** Creates a new recipe version (draft, or active immediately). Active versions are never edited. */
export const POST = apiRoute({ minRole: "writer" }, async ({ req, ctx }) => {
  const input = await readJson(req, recipeSchema);
  return createRecipeVersion(ctx, {
    product_id: input.product_id,
    effective_from: input.effective_from,
    notes: input.notes ?? null,
    activate: input.activate,
    items: input.items.map((i) => ({
      material_id: i.material_id,
      description: i.description ?? null,
      component_type: i.component_type,
      quantity: Number(i.quantity),
      unit: i.unit,
      wastage_percent: i.wastage_percent,
      unit_cost_override: i.unit_cost_override === null || i.unit_cost_override === undefined ? null : Number(i.unit_cost_override),
    })),
  });
});
