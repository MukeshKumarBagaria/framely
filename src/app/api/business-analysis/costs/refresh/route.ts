import { refreshCostsSchema } from "@/business-analysis/schemas";
import { apiRoute, readJson } from "@/business-analysis/server/http";
import { refreshOrderCosts } from "@/business-analysis/server/services/product-costing-service";

export const maxDuration = 60;

/** Explicitly re-snapshots order costs for a period (never touches recorded actual costs). */
export const POST = apiRoute({ minRole: "writer" }, async ({ req, ctx }) => refreshOrderCosts(ctx, await readJson(req, refreshCostsSchema)));
