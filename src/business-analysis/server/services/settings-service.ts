import "server-only";
import { readSettings, settingsSchema, type BusinessSettings } from "../../domain/accounting-policy";
import { todayIn } from "../../domain/dates";
import type { MemberRole } from "../../domain/statuses";
import type { BusinessContext } from "../auth";
import { rpcOne } from "../db";
import { unwrap } from "../errors";

export type SettingsVersion = {
  id: string;
  effectiveFrom: string;
  settings: BusinessSettings;
  note: string | null;
  createdAt: string;
};

type SettingsRow = { id: string; effective_from: string; settings: unknown; note: string | null; created_at: string };

const toVersion = (r: SettingsRow): SettingsVersion => ({
  id: r.id,
  effectiveFrom: r.effective_from,
  settings: readSettings(r.settings),
  note: r.note,
  createdAt: r.created_at,
});

/** The settings version in force on a date (the latest effective on or before it). */
export async function getSettingsAt(ctx: BusinessContext, date: string): Promise<SettingsVersion> {
  const res = await ctx.supabase
    .from("business_settings")
    .select("id, effective_from, settings, note, created_at")
    .eq("business_id", ctx.businessId)
    .lte("effective_from", date)
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle<SettingsRow>();
  const row = unwrap<SettingsRow | null>(res);
  return row ? toVersion(row) : { id: "", effectiveFrom: "2000-01-01", settings: readSettings({}), note: null, createdAt: "" };
}

export async function getCurrentSettings(ctx: BusinessContext): Promise<SettingsVersion> {
  return getSettingsAt(ctx, todayIn(ctx.business.timeZone));
}

export async function listSettingsVersions(ctx: BusinessContext): Promise<SettingsVersion[]> {
  const res = await ctx.supabase
    .from("business_settings")
    .select("id, effective_from, settings, note, created_at")
    .eq("business_id", ctx.businessId)
    .order("effective_from", { ascending: false })
    .limit(100);
  return (unwrap(res) as SettingsRow[]).map(toVersion);
}

/**
 * Saves settings as a version effective from a date. Reports ending before
 * that date keep using the earlier version, so past reports do not change.
 */
export async function saveSettings(ctx: BusinessContext, settings: BusinessSettings, effectiveFrom: string, note: string | null) {
  const clean = settingsSchema.parse(settings);
  const res = await ctx.supabase
    .from("business_settings")
    .upsert(
      { business_id: ctx.businessId, effective_from: effectiveFrom, settings: clean, note },
      { onConflict: "business_id,effective_from" },
    )
    .select("id")
    .single();
  return unwrap(res);
}

export async function updateProfile(
  ctx: BusinessContext,
  input: { name: string; legal_name?: string | null; gstin?: string | null; timezone: string; financial_year_start_month: number },
) {
  const res = await ctx.supabase
    .from("business_profiles")
    .update({
      name: input.name,
      legal_name: input.legal_name ?? null,
      gstin: input.gstin ?? null,
      timezone: input.timezone,
      financial_year_start_month: input.financial_year_start_month,
    })
    .eq("id", ctx.businessId)
    .select("id")
    .single();
  return unwrap(res);
}

export async function getProfile(ctx: BusinessContext) {
  const res = await ctx.supabase
    .from("business_profiles")
    .select("id, name, legal_name, gstin, timezone, financial_year_start_month, currency, created_at")
    .eq("id", ctx.businessId)
    .single();
  return unwrap(res) as {
    id: string; name: string; legal_name: string | null; gstin: string | null; timezone: string;
    financial_year_start_month: number; currency: string; created_at: string;
  };
}

export type Member = { id: string; userId: string; email: string | null; role: MemberRole; isActive: boolean; createdAt: string };

export async function listMembers(ctx: BusinessContext): Promise<Member[]> {
  const res = await ctx.supabase
    .from("business_members")
    .select("id, user_id, email, role, is_active, created_at")
    .eq("business_id", ctx.businessId)
    .order("created_at");
  return (unwrap(res) as { id: string; user_id: string; email: string | null; role: MemberRole; is_active: boolean; created_at: string }[]).map((m) => ({
    id: m.id, userId: m.user_id, email: m.email, role: m.role, isActive: m.is_active, createdAt: m.created_at,
  }));
}

export async function addMember(ctx: BusinessContext, email: string, role: string) {
  return rpcOne<string>(ctx.supabase, "add_member_by_email", { p_business_id: ctx.businessId, p_email: email, p_role: role });
}

export async function updateMember(ctx: BusinessContext, memberId: string, role: string, isActive: boolean) {
  return rpcOne(ctx.supabase, "update_member", { p_member_id: memberId, p_role: role, p_is_active: isActive });
}
