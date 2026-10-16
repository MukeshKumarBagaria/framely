import { productionSchema } from "@/business-analysis/schemas";
import { apiRoute, readJson } from "@/business-analysis/server/http";
import { recordProduction } from "@/business-analysis/server/services/inventory-service";

/** Consumes recipe materials for a production run — the only place production consumes stock. */
export const POST = apiRoute({ minRole: "writer" }, async ({ req, ctx }) => ({ batchId: await recordProduction(ctx, await readJson(req, productionSchema)) }));
