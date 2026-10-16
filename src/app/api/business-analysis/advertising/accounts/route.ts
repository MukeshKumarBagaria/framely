import { adAccountSchema } from "@/business-analysis/schemas";
import { apiRoute, readJson } from "@/business-analysis/server/http";
import { listAdAccounts, saveAdAccount } from "@/business-analysis/server/services/advertising-service";

export const GET = apiRoute({}, async ({ ctx }) => ({ accounts: await listAdAccounts(ctx) }));

export const POST = apiRoute({ minRole: "writer" }, async ({ req, ctx }) => saveAdAccount(ctx, null, await readJson(req, adAccountSchema)));
