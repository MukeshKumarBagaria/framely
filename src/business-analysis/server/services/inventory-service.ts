import "server-only";
import { statusSets, type BusinessSettings } from "../../domain/accounting-policy";
import { addDays, todayIn } from "../../domain/dates";
import { computeStockPositions, estimatedConsumption, isBelowReorder, type LedgerMovement, type RecipeUsage } from "../../domain/inventory";
import { dec, money } from "../../domain/money";
import type { MovementType } from "../../domain/statuses";
import type { BusinessContext } from "../auth";
import { rpcAll, rpcOne } from "../db";
import { AppError, unwrap } from "../errors";

type MovementRow = {
  id: string;
  material_id: string | null;
  product_id: string | null;
  movement_type: MovementType;
  quantity: number | string;
  unit_cost: number | string | null;
  movement_date: string;
  reference_type: string | null;
  reference_id: string | null;
  notes: string | null;
  created_at: string;
  voided_at: string | null;
};

const MOVEMENT_COLUMNS = "id, material_id, product_id, movement_type, quantity, unit_cost, movement_date, reference_type, reference_id, notes, created_at, voided_at";

async function allMovements(ctx: BusinessContext, asOf: string): Promise<MovementRow[]> {
  const out: MovementRow[] = [];
  for (let from = 0; ; from += 1000) {
    const res = await ctx.supabase
      .from("inventory_movements")
      .select(MOVEMENT_COLUMNS)
      .eq("business_id", ctx.businessId)
      .is("voided_at", null)
      .lte("movement_date", asOf)
      .order("movement_date")
      .order("created_at")
      .order("id")
      .range(from, from + 999);
    const rows = unwrap(res) as MovementRow[];
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}

const toLedger = (m: MovementRow, itemId: string): LedgerMovement => ({
  id: m.id,
  itemId,
  movementType: m.movement_type,
  quantity: String(m.quantity),
  unitCost: m.unit_cost === null ? null : String(m.unit_cost),
  movementDate: m.movement_date,
  createdAt: m.created_at,
});

export type MaterialRow = {
  id: string;
  name: string;
  sku: string | null;
  category: string;
  unit: string;
  reorder_threshold: number | string;
  default_supplier_id: string | null;
  is_active: boolean;
  notes: string | null;
};

export type InventoryItem = {
  materialId: string;
  name: string;
  sku: string | null;
  category: string;
  unit: string;
  isActive: boolean;
  reorderThreshold: string;
  quantity: string;
  averageUnitCost: string | null;
  value: string;
  inbound: string;
  outbound: string;
  lastMovementDate: string | null;
  wentNegative: boolean;
  estimatedUsage: string | null;
  estimatedQuantity: string | null;
  estimatedValue: string | null;
  belowReorder: boolean;
};

export type InventorySnapshot = {
  asOf: string;
  items: InventoryItem[];
  products: { productId: string; quantity: string; value: string; averageUnitCost: string | null }[];
  totalValue: string;
  totalEstimatedValue: string | null;
  isEstimate: boolean;
  lowStock: InventoryItem[];
};

export async function listMaterials(ctx: BusinessContext): Promise<MaterialRow[]> {
  const res = await ctx.supabase
    .from("materials")
    .select("id, name, sku, category, unit, reorder_threshold, default_supplier_id, is_active, notes")
    .eq("business_id", ctx.businessId)
    .order("name");
  return unwrap(res) as MaterialRow[];
}

type RecipeItemRow = { material_id: string | null; quantity: number | string; wastage_percent: number | string; recipe_id: string };
type RecipeRow = { id: string; product_id: string; effective_from: string; version: number };

/** Recipes in force on `on`, as product → material usage per unit. */
export async function recipesInForce(ctx: BusinessContext, on: string): Promise<Map<string, RecipeUsage[]>> {
  const recipes = unwrap(
    await ctx.supabase
      .from("product_recipes")
      .select("id, product_id, effective_from, version")
      .eq("business_id", ctx.businessId)
      .eq("status", "active")
      .lte("effective_from", on)
      .order("effective_from", { ascending: false })
      .order("version", { ascending: false })
      .limit(2000),
  ) as RecipeRow[];
  const current = new Map<string, string>();
  for (const r of recipes) if (!current.has(r.product_id)) current.set(r.product_id, r.id);
  if (current.size === 0) return new Map();
  const items = unwrap(
    await ctx.supabase
      .from("product_recipe_items")
      .select("recipe_id, material_id, quantity, wastage_percent")
      .in("recipe_id", [...current.values()]),
  ) as RecipeItemRow[];
  const byRecipe = new Map<string, RecipeUsage[]>();
  for (const i of items) {
    if (!i.material_id) continue;
    const list = byRecipe.get(i.recipe_id) ?? [];
    list.push({ materialId: i.material_id, quantityPerUnit: String(i.quantity), wastagePercent: String(i.wastage_percent) });
    byRecipe.set(i.recipe_id, list);
  }
  return new Map([...current].map(([productId, recipeId]) => [productId, byRecipe.get(recipeId) ?? []]));
}

/**
 * Stock on a date from the ledger, valued at moving weighted average. In
 * "estimate_from_orders" mode each material also gets an estimate that
 * deducts recipe usage of units shipped after its last stock count/opening
 * balance — labelled as an estimate, never presented as counted stock.
 */
export async function getInventorySnapshot(ctx: BusinessContext, settings: BusinessSettings, asOf?: string): Promise<InventorySnapshot> {
  const date = asOf ?? todayIn(ctx.business.timeZone);
  const [materials, movements] = await Promise.all([listMaterials(ctx), allMovements(ctx, date)]);
  const materialMoves = movements.filter((m) => m.material_id).map((m) => toLedger(m, m.material_id!));
  const productMoves = movements.filter((m) => m.product_id).map((m) => toLedger(m, m.product_id!));
  const positions = computeStockPositions(materialMoves, date);
  const productPositions = computeStockPositions(productMoves, date);

  const estimating = settings.inventory.trackingMode === "estimate_from_orders";
  const estimates = new Map<string, string>();
  if (estimating && materialMoves.length > 0) {
    // Baseline per material: last opening balance or stock count.
    const baseline = new Map<string, string>();
    for (const m of movements) {
      if (!m.material_id) continue;
      if (m.movement_type === "opening" || m.reference_type === "stock_count") {
        const prev = baseline.get(m.material_id);
        if (!prev || m.movement_date > prev) baseline.set(m.material_id, m.movement_date);
      }
    }
    const recipes = await recipesInForce(ctx, date);
    const shipped = statusSets(settings).shippedOutcome.concat(["shipped"]);
    const sinceDates = [...new Set(baseline.values())];
    for (const since of sinceDates) {
      const from = addDays(since, 1);
      if (from > date) continue;
      const units = await rpcAll<{ product_id: string; units: number }>(ctx.supabase, "shipped_units_by_product", {
        p_business_id: ctx.businessId, p_from: from, p_to: date, p_statuses: shipped,
      }, ["product_id"]);
      const usage = estimatedConsumption(new Map(units.map((u) => [u.product_id, Number(u.units)])), recipes);
      for (const [materialId, qty] of usage) {
        if (baseline.get(materialId) === since) estimates.set(materialId, qty);
      }
    }
  }

  const items: InventoryItem[] = materials.map((mat) => {
    const p = positions.get(mat.id);
    const quantity = p?.quantity ?? "0.000";
    const usage = estimating ? estimates.get(mat.id) ?? "0.000" : null;
    const estQty = usage === null ? null : dec(quantity).minus(usage).toDecimalPlaces(3).toFixed(3);
    const avg = p?.averageUnitCost ?? null;
    const estValue = estQty === null ? null : money(dec(estQty).greaterThan(0) && avg ? dec(estQty).times(avg) : 0);
    const threshold = String(mat.reorder_threshold);
    return {
      materialId: mat.id,
      name: mat.name,
      sku: mat.sku,
      category: mat.category,
      unit: mat.unit,
      isActive: mat.is_active,
      reorderThreshold: threshold,
      quantity,
      averageUnitCost: avg,
      value: p?.value ?? "0.00",
      inbound: p?.inbound ?? "0.000",
      outbound: p?.outbound ?? "0.000",
      lastMovementDate: p?.lastMovementDate ?? null,
      wentNegative: p?.wentNegative ?? false,
      estimatedUsage: usage,
      estimatedQuantity: estQty,
      estimatedValue: estValue,
      belowReorder: mat.is_active && isBelowReorder(estQty ?? quantity, threshold),
    };
  });

  const totalValue = money(items.reduce((t, i) => t.plus(i.value), dec(0)).plus(
    [...productPositions.values()].reduce((t, p) => t.plus(p.value), dec(0))));
  const totalEstimatedValue = estimating
    ? money(items.reduce((t, i) => t.plus(i.estimatedValue ?? i.value), dec(0)))
    : null;

  return {
    asOf: date,
    items,
    products: [...productPositions.values()].map((p) => ({ productId: p.itemId, quantity: p.quantity, value: p.value, averageUnitCost: p.averageUnitCost })),
    totalValue,
    totalEstimatedValue,
    isEstimate: estimating && materialMoves.length > 0,
    lowStock: items.filter((i) => i.belowReorder),
  };
}

export async function listMovements(ctx: BusinessContext, opts: { materialId?: string; page: number; pageSize: number }) {
  let q = ctx.supabase
    .from("inventory_movements")
    .select(`${MOVEMENT_COLUMNS}, materials(name, unit), products(name, sku)`, { count: "exact" })
    .eq("business_id", ctx.businessId)
    .order("movement_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (opts.materialId) q = q.eq("material_id", opts.materialId);
  const from = (opts.page - 1) * opts.pageSize;
  const res = await q.range(from, from + opts.pageSize - 1);
  return { rows: unwrap(res) as (MovementRow & { materials: { name: string; unit: string } | null; products: { name: string; sku: string } | null })[], total: res.count ?? 0 };
}

export async function recordMovement(ctx: BusinessContext, payload: Record<string, unknown>) {
  return rpcOne<string>(ctx.supabase, "record_inventory_movement", { p_business_id: ctx.businessId, p_payload: payload });
}

export async function voidMovement(ctx: BusinessContext, id: string, reason: string) {
  return rpcOne(ctx.supabase, "void_inventory_movement", { p_id: id, p_reason: reason });
}

export async function recordProduction(ctx: BusinessContext, input: { product_id: string; quantity: number; date: string; notes?: string | null; add_finished_goods: boolean }) {
  return rpcOne<string>(ctx.supabase, "record_production", {
    p_business_id: ctx.businessId, p_product_id: input.product_id, p_quantity: input.quantity, p_date: input.date,
    p_notes: input.notes ?? null, p_add_finished_goods: input.add_finished_goods,
  });
}

// ---- Suppliers and purchase orders -------------------------------------------------

export async function listSuppliers(ctx: BusinessContext) {
  const res = await ctx.supabase.from("suppliers").select("*").eq("business_id", ctx.businessId).order("name");
  return unwrap(res) as { id: string; name: string; contact_name: string | null; phone: string | null; email: string | null; gstin: string | null; address: string | null; notes: string | null; is_active: boolean }[];
}

export async function saveSupplier(ctx: BusinessContext, id: string | null, input: Record<string, unknown>) {
  const res = id
    ? await ctx.supabase.from("suppliers").update(input).eq("id", id).eq("business_id", ctx.businessId).select("id").single()
    : await ctx.supabase.from("suppliers").insert({ ...input, business_id: ctx.businessId }).select("id").single();
  return unwrap(res);
}

export async function listPurchaseOrders(ctx: BusinessContext) {
  const res = await ctx.supabase
    .from("purchase_orders")
    .select("*, suppliers(name), purchase_order_items(id, material_id, quantity, unit_price, tax_rate, line_subtotal, tax_amount, materials(name, unit))")
    .eq("business_id", ctx.businessId)
    .order("order_date", { ascending: false })
    .limit(200);
  return unwrap(res) as {
    id: string; po_number: string; order_date: string; expected_date: string | null; status: string; subtotal: number; tax_total: number; total: number;
    payment_status: string; payment_date: string | null; received_on: string | null; notes: string | null; supplier_id: string;
    suppliers: { name: string } | null;
    purchase_order_items: { id: string; material_id: string; quantity: number; unit_price: number; tax_rate: number; line_subtotal: number; tax_amount: number; materials: { name: string; unit: string } | null }[];
  }[];
}

export async function savePurchaseOrder(ctx: BusinessContext, payload: Record<string, unknown>) {
  return rpcOne<string>(ctx.supabase, "save_purchase_order", { p_business_id: ctx.businessId, p_payload: payload });
}

export async function actOnPurchaseOrder(
  ctx: BusinessContext,
  id: string,
  action: { action: "receive"; received_on: string; update_material_costs: boolean } | { action: "pay"; paid_on: string; method: string; reference?: string | null } | { action: "cancel" },
) {
  switch (action.action) {
    case "receive":
      return rpcOne(ctx.supabase, "receive_purchase_order", { p_po_id: id, p_received_on: action.received_on, p_update_material_costs: action.update_material_costs });
    case "pay":
      return rpcOne(ctx.supabase, "pay_purchase_order", { p_po_id: id, p_paid_on: action.paid_on, p_method: action.method, p_reference: action.reference ?? null });
    case "cancel":
      return rpcOne(ctx.supabase, "cancel_purchase_order", { p_po_id: id });
    default:
      throw new AppError("bad_request", "Unknown action");
  }
}
