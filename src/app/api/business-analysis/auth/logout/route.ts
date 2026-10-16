import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { assertSameOrigin, errorResponse } from "@/business-analysis/server/http";
import { createUserClient } from "@/business-analysis/server/supabase";

export async function POST(req: NextRequest) {
  const requestId = randomUUID();
  try {
    assertSameOrigin(req);
    const supabase = await createUserClient();
    // Revokes the refresh token server-side and clears the session cookies.
    await supabase.auth.signOut({ scope: "local" });
    return NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
