import { z } from "zod";
import { cashTxnSchema, filtersSchema, pageSchema } from "@/business-analysis/schemas";
import { apiRoute, readJson, readQuery } from "@/business-analysis/server/http";
import { getCashFlow, listCashTransactions, recordCashTransaction } from "@/business-analysis/server/services/cash-flow-service";
import { resolveFilters } from "@/business-analysis/server/services/dashboard-service";
import { getCurrentSettings } from "@/business-analysis/server/services/settings-service";

export const GET = apiRoute({}, async ({ req, ctx }) => {
  const q = readQuery(req, filtersSchema.merge(pageSchema).extend({ direction: z.enum(["in", "out"]).optional().catch(undefined) }));
  const { period } = resolveFilters(ctx, q);
  const { settings } = await getCurrentSettings(ctx);
  const [flow, txns] = await Promise.all([
    getCashFlow(ctx, period.current, settings),
    listCashTransactions(ctx, { from: period.current.from, to: period.current.to, page: q.page, pageSize: q.pageSize, direction: q.direction }),
  ]);
  return { period, ...flow, ...txns };
});

/** Manual cash movements (other income, capital, loans, withdrawals). System entries come from their source records. */
export const POST = apiRoute({ minRole: "writer" }, async ({ req, ctx }) => ({ id: await recordCashTransaction(ctx, await readJson(req, cashTxnSchema)) }));
