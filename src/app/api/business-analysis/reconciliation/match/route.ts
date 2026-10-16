import { matchSchema } from "@/business-analysis/schemas";
import { apiRoute, readJson } from "@/business-analysis/server/http";
import { matchItem } from "@/business-analysis/server/services/reconciliation-service";

/** Links (or unlinks, with order_item_id null) a settlement line to an order line. */
export const POST = apiRoute({ minRole: "writer" }, async ({ req, ctx }) => {
  const input = await readJson(req, matchSchema);
  await matchItem(ctx, input.settlement_item_id, input.order_item_id);
  return { ok: true };
});
