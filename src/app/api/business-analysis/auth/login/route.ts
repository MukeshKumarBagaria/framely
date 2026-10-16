import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { loginSchema } from "@/business-analysis/schemas";
import { getServerEnv, isEmailAllowed } from "@/business-analysis/server/env";
import { assertSameOrigin, clientIp, errorResponse, readJson } from "@/business-analysis/server/http";
import { log } from "@/business-analysis/server/logger";
import { loginLimiterByAccount, loginLimiterByIp } from "@/business-analysis/server/rate-limit";
import { createUserClient } from "@/business-analysis/server/supabase";

// One message for every failure (wrong password, unknown user, not on the
// allowlist), and a minimum response time, so the endpoint does not reveal
// which emails are authorised.
const GENERIC = "Incorrect email or password, or this account is not authorised.";
const MIN_FAILURE_MS = 600;

export async function POST(req: NextRequest) {
  const requestId = randomUUID();
  const started = Date.now();
  const fail = async (status: number, message: string, headers: Record<string, string> = {}) => {
    const wait = MIN_FAILURE_MS - (Date.now() - started);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    return NextResponse.json({ error: { code: status === 429 ? "rate_limited" : "unauthenticated", message, requestId } }, { status, headers });
  };
  try {
    assertSameOrigin(req);
    const { email, password } = await readJson(req, loginSchema);
    const ip = clientIp(req);
    const byIp = loginLimiterByIp.hit(ip);
    const byAccount = loginLimiterByAccount.hit(`${ip}|${email}`);
    if (!byIp.allowed || !byAccount.allowed) {
      const retry = Math.max(byIp.retryAfterSeconds, byAccount.retryAfterSeconds);
      log.warn("login_rate_limited", { requestId, retry });
      return fail(429, `Too many attempts. Try again in ${Math.ceil(retry / 60)} minute(s).`, { "Retry-After": String(retry) });
    }

    const env = getServerEnv();
    if (!isEmailAllowed(email, env.allowedEmails)) {
      log.warn("login_not_allowlisted", { requestId });
      return fail(401, GENERIC);
    }

    const supabase = await createUserClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      log.warn("login_failed", { requestId, status: error.status });
      return fail(401, GENERIC);
    }
    loginLimiterByAccount.reset(`${ip}|${email}`);
    log.info("login_succeeded", { requestId });
    return NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
