import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { settingsSchema } from "@/business-analysis/domain/accounting-policy";
import { isValidTimeZone } from "@/business-analysis/domain/dates";
import { bootstrapSchema } from "@/business-analysis/schemas";
import { getSessionUser } from "@/business-analysis/server/auth";
import { rpcOne } from "@/business-analysis/server/db";
import { AppError } from "@/business-analysis/server/errors";
import { assertSameOrigin, errorResponse, readJson } from "@/business-analysis/server/http";

/** First-run: creates the business with the signed-in (allowlisted) user as owner. */
export async function POST(req: NextRequest) {
  const requestId = randomUUID();
  try {
    assertSameOrigin(req);
    const { supabase } = await getSessionUser();
    const input = await readJson(req, bootstrapSchema);
    if (!isValidTimeZone(input.timezone)) throw new AppError("bad_request", "Unknown timezone.");
    const settings = settingsSchema.parse({
      gst: { registered: input.gstRegistered, defaultRatePercent: input.gstRegistered ? input.defaultGstRate : null },
    });
    const id = await rpcOne<string>(supabase, "bootstrap_business", { p_name: input.name, p_timezone: input.timezone, p_settings: settings });
    return NextResponse.json({ id });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
