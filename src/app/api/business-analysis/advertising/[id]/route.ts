import { z } from "zod";
import { apiRoute } from "@/business-analysis/server/http";
import { voidAdMetric } from "@/business-analysis/server/services/advertising-service";

/** Voids an ad-metric row (kept for audit; excluded from all totals). */
export const DELETE = apiRoute<{ id: string }>({ minRole: "writer" }, async ({ ctx, params }) => voidAdMetric(ctx, z.string().uuid().parse(params.id)));
