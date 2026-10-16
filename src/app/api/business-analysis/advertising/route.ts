import { adMetricSchema, filtersSchema, pageSchema } from "@/business-analysis/schemas";
import { apiRoute, readJson, readQuery } from "@/business-analysis/server/http";
import { campaignSummary, listAdMetrics, saveAdMetric, totalsOf } from "@/business-analysis/server/services/advertising-service";
import { resolveFilters } from "@/business-analysis/server/services/dashboard-service";

export const GET = apiRoute({}, async ({ req, ctx }) => {
  const q = readQuery(req, filtersSchema.merge(pageSchema));
  const { period } = resolveFilters(ctx, q);
  const [campaigns, metrics] = await Promise.all([
    campaignSummary(ctx, period.current),
    listAdMetrics(ctx, { from: period.current.from, to: period.current.to, page: q.page, pageSize: q.pageSize, search: q.search }),
  ]);
  return { period, totals: totalsOf(campaigns), campaigns, ...metrics };
});

/** Manual daily entry; re-entering the same day/campaign updates it instead of duplicating. */
export const POST = apiRoute({ minRole: "writer" }, async ({ req, ctx }) => saveAdMetric(ctx, await readJson(req, adMetricSchema)));
