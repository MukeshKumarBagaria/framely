import "server-only";
import { cache } from "react";
import type { MemberRole } from "../domain/statuses";
import { getServerEnv, isEmailAllowed } from "./env";
import { AppError, fromDatabaseError } from "./errors";
import { createUserClient, type DbClient } from "./supabase";

// Authorization has three independent layers, all enforced on the server:
//   1. A valid Supabase session (JWT verified by getClaims()).
//   2. The email is on BUSINESS_ANALYSIS_ALLOWED_EMAILS (fail closed).
//   3. An active business_members row — the same check every RLS policy and
//      RPC makes again inside Postgres, so a bug here cannot leak data.

export type MinRole = "viewer" | "writer" | "admin" | "owner";

const RANK: Record<MemberRole, number> = { viewer: 0, accountant: 1, admin: 2, owner: 3 };
const MIN_RANK: Record<MinRole, number> = { viewer: 0, writer: 1, admin: 2, owner: 3 };

export function roleAtLeast(role: MemberRole, min: MinRole): boolean {
  return RANK[role] >= MIN_RANK[min];
}

export type SessionUser = { id: string; email: string };

export type BusinessContext = {
  supabase: DbClient;
  user: SessionUser;
  businessId: string;
  role: MemberRole;
  business: { name: string; timeZone: string; fyStartMonth: number };
  can: (min: MinRole) => boolean;
};

/** The signed-in, allowlisted user, or an AppError explaining why not. Cached per request. */
export const getSessionUser = cache(async (): Promise<{ supabase: DbClient; user: SessionUser }> => {
  const env = getServerEnv();
  const supabase = await createUserClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) {
    const expired = Boolean(error && /expired|refresh/i.test(error.message));
    throw new AppError(expired ? "session_expired" : "unauthenticated", expired ? "Your session has expired. Sign in again." : "Sign in to continue.");
  }
  const email = String(data.claims.email ?? "");
  if (!isEmailAllowed(email, env.allowedEmails)) {
    throw new AppError("not_authorized", "This account is not authorised for business analysis.");
  }
  return { supabase, user: { id: data.claims.sub, email: email.toLowerCase() } };
});

type MembershipRow = {
  business_id: string;
  role: MemberRole;
  business_profiles: { name: string; timezone: string; financial_year_start_month: number } | null;
};

export const getBusinessContext = cache(async (): Promise<BusinessContext> => {
  const { supabase, user } = await getSessionUser();
  const res = await supabase
    .from("business_members")
    .select("business_id, role, business_profiles(name, timezone, financial_year_start_month)")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<MembershipRow>();
  if (res.error) throw fromDatabaseError(res.error);
  if (!res.data) throw new AppError("no_business", "Set up your business to continue.");
  const profile = res.data.business_profiles;
  const role = res.data.role;
  return {
    supabase,
    user,
    businessId: res.data.business_id,
    role,
    business: {
      name: profile?.name ?? "Business",
      timeZone: profile?.timezone ?? getServerEnv().timeZone,
      fyStartMonth: profile?.financial_year_start_month ?? 4,
    },
    can: (min) => roleAtLeast(role, min),
  };
});

export async function requireBusiness(min: MinRole = "viewer"): Promise<BusinessContext> {
  const ctx = await getBusinessContext();
  if (!ctx.can(min)) {
    throw new AppError("forbidden", `This action needs the ${min === "writer" ? "accountant" : min} role or higher.`);
  }
  return ctx;
}
