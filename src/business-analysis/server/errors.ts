// Error types and the mapping from database errors to safe client messages.
// Clients never see stack traces, SQL, or internal identifiers.

export type AppErrorCode =
  | "unauthenticated"
  | "session_expired"
  | "not_authorized"
  | "no_business"
  | "forbidden"
  | "not_configured"
  | "bad_request"
  | "not_found"
  | "conflict"
  | "too_large"
  | "rate_limited"
  | "unsupported"
  | "internal";

const STATUS: Record<AppErrorCode, number> = {
  unauthenticated: 401,
  session_expired: 401,
  not_authorized: 403,
  no_business: 403,
  forbidden: 403,
  not_configured: 503,
  bad_request: 400,
  not_found: 404,
  conflict: 409,
  too_large: 413,
  rate_limited: 429,
  unsupported: 415,
  internal: 500,
};

export class AppError extends Error {
  constructor(
    public readonly code: AppErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
  get status(): number {
    return STATUS[this.code];
  }
}

type PgLikeError = { code?: string; message?: string; details?: string | null; hint?: string | null };

/**
 * Postgres errors raised by the business_analysis functions carry messages
 * written for users (e.g. "this expense cannot be reversed"); those pass
 * through. Constraint and system errors are replaced with generic text.
 */
export function fromDatabaseError(error: PgLikeError, fallback = "The database rejected this request."): AppError {
  const code = error.code ?? "";
  const message = error.message ?? fallback;
  switch (code) {
    case "28000":
      return new AppError("unauthenticated", "Please sign in again.");
    case "42501":
      return new AppError("forbidden", /row-level security/i.test(message) ? "You do not have access to this record." : message);
    case "P0002":
      return new AppError("not_found", message);
    case "22023":
    case "P0001":
      return new AppError("bad_request", message);
    case "55000":
      return new AppError("conflict", message);
    case "23505":
      return new AppError("conflict", "A record with the same identifying details already exists.");
    case "23503":
      return new AppError("bad_request", "This refers to a record that does not exist or is still in use.");
    case "23514":
    case "23502":
    case "22P02":
    case "22007":
    case "22008":
      return new AppError("bad_request", "Some values are invalid or out of range.");
    case "PGRST116":
      return new AppError("not_found", "Not found.");
    case "PGRST106":
    case "3F000":
      return new AppError("not_configured", "The business_analysis schema is not exposed. Add it under Project Settings → Data API → Exposed schemas.");
    case "42P01":
    case "42883":
      return new AppError("not_configured", "The business analysis database objects are missing. Run the migration in the Supabase SQL editor.");
    case "57014":
      return new AppError("internal", "The query took too long. Try a shorter date range.");
    default:
      return new AppError("internal", fallback);
  }
}

/**
 * Unwraps a Supabase { data, error } response, throwing a safe AppError.
 * Returns `unknown` unless a row type is given: without generated database
 * types supabase-js mis-infers embedded relations, so each call site states
 * the shape it selected.
 */
export function unwrap<T = unknown>(result: { data: unknown; error: PgLikeError | null }, fallback?: string): T {
  if (result.error) throw fromDatabaseError(result.error, fallback);
  return result.data as T;
}
