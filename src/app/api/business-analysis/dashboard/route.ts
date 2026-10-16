import { filtersSchema } from "@/business-analysis/schemas";
import { apiRoute, readQuery } from "@/business-analysis/server/http";
import { getDashboard } from "@/business-analysis/server/services/dashboard-service";

export const GET = apiRoute({}, async ({ req, ctx }) => getDashboard(ctx, readQuery(req, filtersSchema)));
