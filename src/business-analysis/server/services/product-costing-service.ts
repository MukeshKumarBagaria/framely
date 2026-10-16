import "server-only";
import { recipeUnitCost, type CostVersion, type RecipeComponent } from "../../domain/costing";
import { todayIn } from "../../domain/dates";
import type { BusinessContext } from "../auth";
import { rpcOne } from "../db";
import { AppError, fromDatabaseError, unwrap } from "../errors";

export type ProductRow = {
  id: string;
  name: string;
  sku: string;
  variant: string | null;
  pack_size: number;
  dimensions: string | null;
  channel: string;
  selling_price: number | null;
  gst_rate: number | null;
  hsn_code: string | null;
  status: string;
  notes: string | null;
};

export type RecipeItemRow = {
  id: string;
  recipe_id: string;
  material_id: string | null;
  description: string | null;
  component_type: "material" | "packaging" | "other";
  quantity: number;
  unit: string;
  wastage_percent: number;
  unit_cost_override: number | null;
};

export type RecipeRow = {
  id: string;
  product_id: string;
  version: number;
  effective_from: string;
  status: "draft" | "active";
  notes: string | null;
  activated_at: string | null;
  created_at: string;
  product_recipe_items: RecipeItemRow[];
};

async function allCostVersions(ctx: BusinessContext): Promise<CostVersion[]> {
  const res = await ctx.supabase
    .from("material_cost_versions")
    .select("material_id, effective_from, unit_cost")
    .eq("business_id", ctx.businessId)
    .order("effective_from")
    .limit(10_000);
  return (unwrap(res) as { material_id: string; effective_from: string; unit_cost: number }[]).map((v) => ({
    materialId: v.material_id, effectiveFrom: v.effective_from, unitCost: String(v.unit_cost),
  }));
}

const toComponents = (items: RecipeItemRow[]): RecipeComponent[] =>
  items.map((i) => ({
    materialId: i.material_id,
    componentType: i.component_type,
    quantity: String(i.quantity),
    wastagePercent: String(i.wastage_percent),
    unitCostOverride: i.unit_cost_override === null ? null : String(i.unit_cost_override),
  }));

/** Products with their current recipe and its unit cost today (estimated standard cost). */
export async function listProductsWithCosts(ctx: BusinessContext) {
  const today = todayIn(ctx.business.timeZone);
  const [productsRes, recipesRes, versions] = await Promise.all([
    ctx.supabase.from("products").select("*").eq("business_id", ctx.businessId).order("name").limit(2000),
    ctx.supabase.from("product_recipes").select("*, product_recipe_items(*)").eq("business_id", ctx.businessId)
      .order("effective_from", { ascending: false }).order("version", { ascending: false }).limit(5000),
    allCostVersions(ctx),
  ]);
  const products = unwrap(productsRes) as ProductRow[];
  const recipes = unwrap(recipesRes) as RecipeRow[];
  return products.map((p) => {
    const mine = recipes.filter((r) => r.product_id === p.id);
    const current = mine.find((r) => r.status === "active" && r.effective_from <= today) ?? null;
    const cost = current ? recipeUnitCost(toComponents(current.product_recipe_items), versions, today) : null;
    return { product: p, recipes: mine, currentRecipe: current, unitCost: cost };
  });
}

export async function saveProduct(ctx: BusinessContext, id: string | null, input: Record<string, unknown>) {
  const res = id
    ? await ctx.supabase.from("products").update(input).eq("id", id).eq("business_id", ctx.businessId).select("id").single()
    : await ctx.supabase.from("products").insert({ ...input, business_id: ctx.businessId }).select("id").single();
  return unwrap(res) as { id: string };
}

export async function saveMaterial(ctx: BusinessContext, id: string | null, input: Record<string, unknown> & { initial_unit_cost?: string | null; initial_cost_date?: string | null }) {
  const { initial_unit_cost, initial_cost_date, ...fields } = input;
  const res = id
    ? await ctx.supabase.from("materials").update(fields).eq("id", id).eq("business_id", ctx.businessId).select("id").single()
    : await ctx.supabase.from("materials").insert({ ...fields, business_id: ctx.businessId }).select("id").single();
  const row = unwrap(res) as { id: string };
  if (!id && initial_unit_cost) {
    await addCostVersion(ctx, { material_id: row.id, effective_from: initial_cost_date ?? todayIn(ctx.business.timeZone), unit_cost: initial_unit_cost, note: "Opening price" });
  }
  return row;
}

export async function addCostVersion(ctx: BusinessContext, input: { material_id: string; effective_from: string; unit_cost: string; note?: string | null }) {
  const res = await ctx.supabase
    .from("material_cost_versions")
    .upsert({ ...input, business_id: ctx.businessId, source: "manual" }, { onConflict: "material_id,effective_from" })
    .select("id")
    .single();
  return unwrap(res);
}

export async function listCostVersions(ctx: BusinessContext, materialId?: string) {
  let q = ctx.supabase.from("material_cost_versions").select("id, material_id, effective_from, unit_cost, source, note, created_at")
    .eq("business_id", ctx.businessId).order("effective_from", { ascending: false }).limit(2000);
  if (materialId) q = q.eq("material_id", materialId);
  return unwrap(await q) as { id: string; material_id: string; effective_from: string; unit_cost: number; source: string; note: string | null; created_at: string }[];
}

/**
 * Creates a new recipe version. Recipes are history: an active version is
 * never edited; a correction is a new version (it may share the effective
 * date, and then supersedes the older one from that date).
 */
export async function createRecipeVersion(
  ctx: BusinessContext,
  input: { product_id: string; effective_from: string; notes?: string | null; activate: boolean; items: Omit<RecipeItemRow, "id" | "recipe_id">[] },
) {
  const latest = unwrap(
    await ctx.supabase.from("product_recipes").select("version").eq("business_id", ctx.businessId).eq("product_id", input.product_id)
      .order("version", { ascending: false }).limit(1).maybeSingle(),
  ) as { version: number } | null;
  const recipe = unwrap(
    await ctx.supabase.from("product_recipes").insert({
      business_id: ctx.businessId, product_id: input.product_id, version: (latest?.version ?? 0) + 1,
      effective_from: input.effective_from, notes: input.notes ?? null, status: "draft",
    }).select("id").single(),
  ) as { id: string };

  const items = input.items.map((i) => ({ ...i, business_id: ctx.businessId, recipe_id: recipe.id }));
  const ins = await ctx.supabase.from("product_recipe_items").insert(items);
  if (ins.error) throw fromDatabaseError(ins.error);

  if (input.activate) await activateRecipe(ctx, recipe.id);
  return recipe;
}

export async function replaceDraftItems(ctx: BusinessContext, recipeId: string, items: Omit<RecipeItemRow, "id" | "recipe_id">[]) {
  const recipe = unwrap(
    await ctx.supabase.from("product_recipes").select("id, status").eq("business_id", ctx.businessId).eq("id", recipeId).maybeSingle(),
  ) as { id: string; status: string } | null;
  if (!recipe) throw new AppError("not_found", "Recipe not found.");
  if (recipe.status !== "draft") throw new AppError("conflict", "Active recipes cannot be edited; create a new version.");
  // Delete-then-insert of draft components. Drafts are not used for costing,
  // so a failure midway leaves no financial effect; the user simply retries.
  const del = await ctx.supabase.from("product_recipe_items").delete().eq("recipe_id", recipeId).eq("business_id", ctx.businessId);
  if (del.error) throw fromDatabaseError(del.error);
  const ins = await ctx.supabase.from("product_recipe_items").insert(items.map((i) => ({ ...i, business_id: ctx.businessId, recipe_id: recipeId })));
  if (ins.error) throw fromDatabaseError(ins.error);
}

export async function activateRecipe(ctx: BusinessContext, recipeId: string) {
  const res = await ctx.supabase.from("product_recipes").update({ status: "active" }).eq("id", recipeId).eq("business_id", ctx.businessId).eq("status", "draft").select("id").maybeSingle();
  const row = unwrap(res);
  if (!row) throw new AppError("conflict", "Only draft recipes can be activated.");
  return row;
}

/** Runs the database re-costing in batches until every line in range has been visited. */
export async function refreshOrderCosts(ctx: BusinessContext, input: { from: string; to: string; mode: "missing_only" | "all_estimates"; runStartedAt: string }) {
  let processed = 0;
  let estimated = 0;
  for (let i = 0; i < 200; i++) {
    const r = await rpcOne<{ processed: number; estimated: number; remaining: number }>(ctx.supabase, "refresh_order_costs", {
      p_business_id: ctx.businessId, p_from: input.from, p_to: input.to, p_mode: input.mode, p_run_started_at: input.runStartedAt, p_limit: 1000,
    });
    processed += r.processed;
    estimated += r.estimated;
    if (r.remaining === 0 || r.processed === 0) return { processed, estimated, remaining: r.remaining };
  }
  return { processed, estimated, remaining: -1 };
}
