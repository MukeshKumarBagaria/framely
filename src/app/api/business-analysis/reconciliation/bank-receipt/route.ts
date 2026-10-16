import { bankReceiptSchema } from "@/business-analysis/schemas";
import { apiRoute, readJson } from "@/business-analysis/server/http";
import { recordBankReceipt } from "@/business-analysis/server/services/reconciliation-service";
import { getCurrentSettings } from "@/business-analysis/server/services/settings-service";

/**
 * Records what actually reached the bank for a settlement. It confirms the
 * settlement's existing cash entry rather than adding a second one.
 */
export const POST = apiRoute({ minRole: "writer" }, async ({ req, ctx }) => {
  const input = await readJson(req, bankReceiptSchema);
  const { settings } = await getCurrentSettings(ctx);
  return { status: await recordBankReceipt(ctx, input, settings) };
});
