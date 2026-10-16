import { z } from "zod";
import { recipeItemSchema } from "@/business-analysis/schemas";
import { apiRoute, readJson } from "@/business-analysis/server/http";
import { activateRecipe, replaceDraftItems } from "@/business-analysis/server/services/product-costing-service";

const body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("activate") }),
  z.object({ action: z.literal("update_items"), items: z.array(recipeItemSchema).min(1).max(50) }),
]);

export const PATCH = apiRoute<{ id: string }>({ minRole: "writer" }, async ({ req, ctx, params }) => {
  const id = z.string().uuid().parse(params.id);
  const input = await readJson(req, body);
  if (input.action === "activate") return activateRecipe(ctx, id);
  await replaceDraftItems(ctx, id, input.items.map((i) => ({
    material_id: i.material_id,
    description: i.description ?? null,
    component_type: i.component_type,
    quantity: Number(i.quantity),
    unit: i.unit,
    wastage_percent: i.wastage_percent,
    unit_cost_override: i.unit_cost_override === null || i.unit_cost_override === undefined ? null : Number(i.unit_cost_override),
  })));
  return { ok: true };
});
