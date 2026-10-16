import "server-only";
import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z, type ZodType } from "zod";
import { requireBusiness, type BusinessContext, type MinRole } from "./auth";
import { ConfigurationError } from "./env";
import { AppError } from "./errors";
import { log } from "./logger";

// Every /api/business-analysis route goes through apiRoute(), which applies,
// in order: CSRF protection for state-changing methods, authentication and
// role checks, input validation with Zod, and safe error responses.

export const CSRF_HEADER = "x-business-analysis";

/**
 * Cookie-authenticated endpoints must not accept cross-site requests. Two
 * checks: the request must carry a custom header (which a cross-site form or
 * image cannot send without a CORS preflight, and no CORS is configured), and
 * any Origin header must match this site.
 */
export function assertSameOrigin(req: NextRequest) {
  if (req.method === "GET" || req.method === "HEAD") return;
  if (req.headers.get(CSRF_HEADER) !== "1") {
    throw new AppError("forbidden", "Missing request header.");
  }
  const origin = req.headers.get("origin");
  if (origin) {
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    let originHost: string;
    try {
      originHost = new URL(origin).host;
    } catch {
      throw new AppError("forbidden", "Invalid origin.");
    }
    if (!host || originHost !== host) throw new AppError("forbidden", "Cross-site request blocked.");
  }
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") {
    throw new AppError("forbidden", "Cross-site request blocked.");
  }
}

export function errorResponse(error: unknown, requestId: string): NextResponse {
  if (error instanceof AppError) {
    if (error.status >= 500) log.error("request_failed", { requestId, code: error.code, message: error.message });
    return NextResponse.json(
      { error: { code: error.code, message: error.message, details: error.details, requestId } },
      { status: error.status, headers: { "cache-control": "no-store" } },
    );
  }
  if (error instanceof ConfigurationError) {
    log.error("not_configured", { requestId, issues: error.issues });
    return NextResponse.json(
      { error: { code: "not_configured", message: "Business analysis is not configured on the server.", requestId } },
      { status: 503 },
    );
  }
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "bad_request",
          message: "Some fields are invalid.",
          details: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
          requestId,
        },
      },
      { status: 400 },
    );
  }
  log.error("unhandled_error", { requestId, name: (error as Error)?.name, message: (error as Error)?.message });
  return NextResponse.json({ error: { code: "internal", message: "Something went wrong.", requestId } }, { status: 500 });
}

type RouteContext<P> = { params: Promise<P> };

export function apiRoute<P = Record<string, string>>(
  options: { minRole?: MinRole },
  handler: (args: { req: NextRequest; ctx: BusinessContext; params: P; requestId: string }) => Promise<Response | unknown>,
) {
  return async (req: NextRequest, route: RouteContext<P>): Promise<Response> => {
    const requestId = randomUUID();
    const started = Date.now();
    try {
      assertSameOrigin(req);
      const ctx = await requireBusiness(options.minRole ?? "viewer");
      const params = (await route.params) ?? ({} as P);
      const result = await handler({ req, ctx, params, requestId });
      log.debug("request", { requestId, method: req.method, path: req.nextUrl.pathname, ms: Date.now() - started });
      if (result instanceof Response) return result;
      return NextResponse.json(result ?? { ok: true }, { headers: { "cache-control": "no-store" } });
    } catch (error) {
      return errorResponse(error, requestId);
    }
  };
}

const MAX_JSON_BYTES = 1_000_000;

export async function readJson<T>(req: NextRequest, schema: ZodType<T>): Promise<T> {
  const length = Number(req.headers.get("content-length") ?? 0);
  if (length > MAX_JSON_BYTES) throw new AppError("too_large", "Request body is too large.");
  if (!(req.headers.get("content-type") ?? "").includes("application/json")) {
    throw new AppError("unsupported", "Expected a JSON body.");
  }
  let body: unknown;
  try {
    const text = await req.text();
    if (text.length > MAX_JSON_BYTES) throw new AppError("too_large", "Request body is too large.");
    body = text ? JSON.parse(text) : {};
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw new AppError("bad_request", "Malformed JSON.");
  }
  return schema.parse(body);
}

export function readQuery<T>(req: NextRequest, schema: ZodType<T>): T {
  return schema.parse(Object.fromEntries(req.nextUrl.searchParams.entries()));
}

export function clientIp(req: NextRequest): string {
  return (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
}
