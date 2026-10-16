import { describePolicy } from "@/business-analysis/domain/accounting-policy";
import { profitAndLossStatement } from "@/business-analysis/domain/statements";
import { filtersSchema } from "@/business-analysis/schemas";
import { apiRoute, readQuery } from "@/business-analysis/server/http";
import { getPeriodPnl } from "@/business-analysis/server/services/dashboard-service";

export const GET = apiRoute({}, async ({ req, ctx }) => {
  const { pnl, filters, settings, settingsEffectiveFrom } = await getPeriodPnl(ctx, readQuery(req, filtersSchema));
  return {
    period: filters.period,
    segment: filters.segment,
    pnl,
    statement: profitAndLossStatement(pnl),
    assumptions: describePolicy(settings, settingsEffectiveFrom),
  };
});
