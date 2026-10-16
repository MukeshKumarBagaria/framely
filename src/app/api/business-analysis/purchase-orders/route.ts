import { purchaseOrderSchema } from "@/business-analysis/schemas";
import { apiRoute, readJson } from "@/business-analysis/server/http";
import { listPurchaseOrders, savePurchaseOrder } from "@/business-analysis/server/services/inventory-service";

export const GET = apiRoute({}, async ({ ctx }) => ({ purchaseOrders: await listPurchaseOrders(ctx) }));

export const POST = apiRoute({ minRole: "writer" }, async ({ req, ctx }) => ({ id: await savePurchaseOrder(ctx, await readJson(req, purchaseOrderSchema)) }));
