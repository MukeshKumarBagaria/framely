import { z } from "zod";
import { todayIn } from "@/business-analysis/domain/dates";
import { isoDate } from "@/business-analysis/schemas";
import { apiRoute, readJson } from "@/business-analysis/server/http";
import { generateRecurring } from "@/business-analysis/server/services/expense-service";

/** Creates any due occurrences of recurring expenses; safe to run repeatedly. */
export const POST = apiRoute({ minRole: "writer" }, async ({ req, ctx }) => {
  const { until } = await readJson(req, z.object({ until: isoDate.optional() }));
  return { created: await generateRecurring(ctx, until ?? todayIn(ctx.business.timeZone)) };
});
