import { manualOrderSchema, orderListSchema } from "@/business-analysis/schemas";
import { apiRoute, readJson, readQuery } from "@/business-analysis/server/http";
import { createManualOrder, listOrderLines } from "@/business-analysis/server/services/order-service";

export const GET = apiRoute({}, async ({ req, ctx }) => {
  const q = readQuery(req, orderListSchema);
  const result = await listOrderLines(ctx, q);
  return { rows: result.rows, total: result.total, page: q.page, pageSize: q.pageSize, period: result.period, allocation: result.allocation };
});

/** Manual orders for direct/WhatsApp sales that do not come from a marketplace report. */
export const POST = apiRoute({ minRole: "writer" }, async ({ req, ctx }) => {
  const input = await readJson(req, manualOrderSchema);
  return { id: await createManualOrder(ctx, input) };
});
