import "server-only";
import { redirect } from "next/navigation";
import { getBusinessContext, requireBusiness, type BusinessContext, type MinRole } from "./auth";
import { ConfigurationError } from "./env";
import { AppError } from "./errors";

// Server pages call this instead of reading the session themselves. It turns
// every failure into a state the layout can render (or a redirect to login),
// so a page never has to handle "not signed in" itself.

export type GuardFailure =
  | { ok: false; kind: "not_configured"; issues: string[] }
  | { ok: false; kind: "not_authorized" }
  | { ok: false; kind: "no_business"; email: string }
  | { ok: false; kind: "error"; message: string };

export async function guard(): Promise<{ ok: true; ctx: BusinessContext } | GuardFailure> {
  try {
    return { ok: true, ctx: await getBusinessContext() };
  } catch (e) {
    if (e instanceof ConfigurationError) return { ok: false, kind: "not_configured", issues: e.issues };
    if (e instanceof AppError) {
      if (e.code === "unauthenticated") redirect("/business-analysis/login");
      if (e.code === "session_expired") redirect("/business-analysis/login?reason=expired");
      if (e.code === "not_authorized") return { ok: false, kind: "not_authorized" };
      if (e.code === "no_business") {
        const { getSessionUser } = await import("./auth");
        const { user } = await getSessionUser();
        return { ok: false, kind: "no_business", email: user.email };
      }
      return { ok: false, kind: "error", message: e.message };
    }
    throw e;
  }
}

/**
 * For pages: the business context, or a redirect. The layout has already
 * rendered the explanation for non-redirect failures, so pages only see ok.
 */
export async function pageContext(min: MinRole = "viewer"): Promise<BusinessContext> {
  const ctx = await requireBusiness(min).catch((e) => {
    if (e instanceof AppError && (e.code === "unauthenticated" || e.code === "session_expired")) redirect("/business-analysis/login");
    throw e;
  });
  return ctx;
}
