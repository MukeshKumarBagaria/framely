import { costVersionSchema } from "@/business-analysis/schemas";
import { apiRoute, readJson } from "@/business-analysis/server/http";
import { addCostVersion } from "@/business-analysis/server/services/product-costing-service";

/** A new material price from a date. Orders already costed keep their snapshot. */
export const POST = apiRoute({ minRole: "writer" }, async ({ req, ctx }) => addCostVersion(ctx, await readJson(req, costVersionSchema)));
