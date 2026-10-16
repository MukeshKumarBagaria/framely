import { z } from "zod";
import { orderItemPatchSchema } from "@/business-analysis/schemas";
import { apiRoute, readJson } from "@/business-analysis/server/http";
import { getOrderLine, updateOrderLine } from "@/business-analysis/server/services/order-service";
import { getCurrentSettings } from "@/business-analysis/server/services/settings-service";

const id = z.string().uuid();

export const GET = apiRoute<{ id: string }>({}, async ({ ctx, params }) => {
  const { settings } = await getCurrentSettings(ctx);
  return getOrderLine(ctx, id.parse(params.id), settings);
});

/** Manual status change or recorded actual production cost (with status history and audit). */
export const PATCH = apiRoute<{ id: string }>({ minRole: "writer" }, async ({ req, ctx, params }) => {
  const input = await readJson(req, orderItemPatchSchema);
  await updateOrderLine(ctx, id.parse(params.id), input);
  return { ok: true };
});
