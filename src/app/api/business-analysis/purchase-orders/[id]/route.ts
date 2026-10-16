import { z } from "zod";
import { poActionSchema, purchaseOrderSchema } from "@/business-analysis/schemas";
import { apiRoute, readJson } from "@/business-analysis/server/http";
import { actOnPurchaseOrder, savePurchaseOrder } from "@/business-analysis/server/services/inventory-service";

const id = z.string().uuid();

/** Edits a draft/ordered purchase order (items are replaced atomically). */
export const PATCH = apiRoute<{ id: string }>({ minRole: "writer" }, async ({ req, ctx, params }) => {
  const input = await readJson(req, purchaseOrderSchema);
  return { id: await savePurchaseOrder(ctx, { ...input, id: id.parse(params.id) }) };
});

/** receive → stock in at cost; pay → one cash outflow; cancel. */
export const POST = apiRoute<{ id: string }>({ minRole: "writer" }, async ({ req, ctx, params }) => {
  await actOnPurchaseOrder(ctx, id.parse(params.id), await readJson(req, poActionSchema));
  return { ok: true };
});
