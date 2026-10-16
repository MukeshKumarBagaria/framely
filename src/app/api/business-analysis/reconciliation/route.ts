import { z } from "zod";
import { RECON_STATUSES } from "@/business-analysis/domain/statuses";
import { filtersSchema, pageSchema } from "@/business-analysis/schemas";
import { apiRoute, readQuery } from "@/business-analysis/server/http";
import { resolveFilters } from "@/business-analysis/server/services/dashboard-service";
import {
  getReconciliationSummary,
  listReconciliationLines,
  listSettlements,
  listUnlinkedItems,
} from "@/business-analysis/server/services/reconciliation-service";
import { getSettingsAt } from "@/business-analysis/server/services/settings-service";

const query = filtersSchema.merge(pageSchema).extend({
  reconStatus: z.enum(RECON_STATUSES).optional().catch(undefined),
  view: z.enum(["lines", "unlinked", "settlements"]).default("lines"),
});

export const GET = apiRoute({}, async ({ req, ctx }) => {
  const q = readQuery(req, query);
  const { period } = resolveFilters(ctx, q);
  const { settings } = await getSettingsAt(ctx, period.current.to);
  const summary = await getReconciliationSummary(ctx, period.current, settings);
  if (q.view === "unlinked") return { period, summary, ...(await listUnlinkedItems(ctx, period.current, q.page, q.pageSize)) };
  if (q.view === "settlements") return { period, summary, rows: await listSettlements(ctx, period.current) };
  return { period, summary, ...(await listReconciliationLines(ctx, period.current, settings, { status: q.reconStatus, search: q.search, page: q.page, pageSize: q.pageSize })) };
});
