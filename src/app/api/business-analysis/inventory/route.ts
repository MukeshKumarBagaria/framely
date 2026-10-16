import { z } from "zod";
import { isoDate } from "@/business-analysis/schemas";
import { apiRoute, readQuery } from "@/business-analysis/server/http";
import { getInventorySnapshot } from "@/business-analysis/server/services/inventory-service";
import { getCurrentSettings } from "@/business-analysis/server/services/settings-service";

export const GET = apiRoute({}, async ({ req, ctx }) => {
  const { asOf } = readQuery(req, z.object({ asOf: isoDate.optional() }));
  const { settings } = await getCurrentSettings(ctx);
  return getInventorySnapshot(ctx, settings, asOf);
});
