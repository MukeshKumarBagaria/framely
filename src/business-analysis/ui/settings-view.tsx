"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { BusinessSettings } from "../domain/accounting-policy";
import { formatDateIN } from "../domain/dates";
import { DATE_PRESETS, PRESET_LABELS } from "../domain/periods";
import type { Member, SettingsVersion } from "../server/services/settings-service";
import { api, errorMessage, fieldErrors } from "./api";
import { Badge, Button, Card, Field, Input, Notice, Select, Textarea } from "./kit";
import { useToast } from "./overlay";

type Profile = { id: string; name: string; legal_name: string | null; gstin: string | null; timezone: string; financial_year_start_month: number; currency: string };
type MemberRow = Member & { allowlisted: boolean };

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

type Def =
  | { path: string; label: string; kind: "number"; hint?: string; step?: string; int?: boolean }
  | { path: string; label: string; kind: "select"; options: [string, string][]; hint?: string }
  | { path: string; label: string; kind: "gst" };

const SECTIONS: { title: string; blurb: string; defs: Def[] }[] = [
  { title: "Revenue and dates", blurb: "When a sale counts, and which date reports use.", defs: [
    { path: "revenue.recognition", label: "Recognise revenue", kind: "select", options: [["on_delivery", "When delivered (recommended)"], ["on_order", "When ordered (returns and RTO then reverse it)"]] },
    { path: "revenue.dateBasis", label: "Report sales by", kind: "select", options: [["order_date", "Order date"], ["recognition_date", "Delivery date (falls back to order date)"]] },
    { path: "general.defaultDatePreset", label: "Default date range", kind: "select", options: DATE_PRESETS.map((p) => [p, PRESET_LABELS[p]] as [string, string]) },
  ] },
  { title: "GST", blurb: "Decides whether sale prices include GST that belongs to the government rather than to you.", defs: [{ path: "gst", label: "GST", kind: "gst" }] },
  { title: "Returns and costs", blurb: "Assumptions for returned and RTO goods.", defs: [
    { path: "costs.returnedGoodsRecoveryPercent", label: "Cost recovered on returned goods (%)", kind: "number", hint: "Personalised frames are usually not resellable: leave at 0", step: "1" },
  ] },
  { title: "Settlements", blurb: "How Meesho payments are matched to orders.", defs: [
    { path: "settlements.feeDateBasis", label: "Date platform fees by", kind: "select", options: [["order_date", "Order date (matches fees to their sale)"], ["settlement_date", "Settlement date"]] },
    { path: "settlements.reconciliationTolerance", label: "Reconciliation tolerance (₹)", kind: "number", hint: "Differences up to this count as matched", step: "0.5" },
    { path: "settlements.expectedSettlementLagDays", label: "Expected settlement lag (days)", kind: "number", int: true, hint: "Delivered orders unpaid after this are flagged" },
  ] },
  { title: "Advertising", blurb: "Spend is counted once. Allocation to orders is an estimate for analysis only.", defs: [
    { path: "advertising.costSource", label: "Ad cost comes from", kind: "select", options: [["ad_metrics", "Campaign data (manual or imported)"], ["expenses", "Expense entries"]], hint: "The other source then only affects cash, never profit" },
    { path: "advertising.allocationMethod", label: "Per-order ad allocation", kind: "select", options: [["none", "None"], ["revenue_weighted", "By revenue"], ["delivered_order_weighted", "By delivered orders"]] },
    { path: "advertising.maxSpendPercentOfSales", label: "Warn when ad spend exceeds (% of sales)", kind: "number" },
    { path: "advertising.minRoas", label: "Warn when ROAS is below", kind: "number", step: "0.1" },
  ] },
  { title: "Inventory", blurb: "How stock is calculated.", defs: [
    { path: "inventory.trackingMode", label: "Stock tracking", kind: "select", options: [["production_records", "Only recorded movements and production"], ["estimate_from_orders", "Also estimate usage from orders (labelled as estimate)"]] },
  ] },
  { title: "Insight thresholds", blurb: "When the dashboard raises a flag.", defs: [
    { path: "thresholds.rtoRatePercent", label: "High RTO / return rate (%)", kind: "number" },
    { path: "thresholds.expenseIncreasePercent", label: "Expense increase flagged at (%)", kind: "number" },
    { path: "thresholds.expenseIncreaseMinAmount", label: "…and at least (₹)", kind: "number" },
    { path: "thresholds.marginDropPoints", label: "Margin drop flagged at (points)", kind: "number" },
    { path: "thresholds.largeExpenseMultiplier", label: "Unusually large expense (× typical)", kind: "number" },
    { path: "thresholds.largeExpenseMinAmount", label: "…and at least (₹)", kind: "number" },
    { path: "thresholds.importStaleDays", label: "Reports considered stale after (days)", kind: "number", int: true },
  ] },
  { title: "Meesho order import", blurb: "How the supplier price columns are read.", defs: [
    { path: "imports.meeshoOrders.priceBasis", label: "Price columns are", kind: "select", options: [["per_unit", "Per unit"], ["line_total", "For the whole line"]] },
    { path: "imports.meeshoOrders.dateOrder", label: "Date format in order files", kind: "select", options: [["auto", "Detect automatically"], ["dmy", "Day / month / year"], ["mdy", "Month / day / year"]] },
  ] },
];

function getAt(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), obj);
}
function setAt<T>(obj: T, path: string, value: unknown): T {
  const keys = path.split(".");
  const copy = structuredClone(obj) as Record<string, unknown>;
  let cur = copy;
  keys.slice(0, -1).forEach((k) => { cur = (cur[k] ??= {}) as Record<string, unknown>; });
  cur[keys[keys.length - 1]] = value;
  return copy as T;
}

export function SettingsView({ profile, current, versions, members, role, allowedEmailsConfigured }: { profile: Profile; current: SettingsVersion; versions: SettingsVersion[]; members: MemberRow[]; role: string; allowedEmailsConfigured: number }) {
  const router = useRouter();
  const toast = useToast();
  const isAdmin = role === "admin" || role === "owner";
  const isOwner = role === "owner";
  const [p, setP] = useState({ name: profile.name, legal_name: profile.legal_name ?? "", gstin: profile.gstin ?? "", timezone: profile.timezone, financial_year_start_month: String(profile.financial_year_start_month) });
  const [pErr, setPErr] = useState<Record<string, string>>({});
  const [s, setS] = useState<BusinessSettings>(current.settings);
  const [effective, setEffective] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [newMember, setNewMember] = useState({ email: "", role: "viewer" });

  const run = async (key: string, fn: () => Promise<void>, ok: string) => {
    setBusy(key);
    try { await fn(); toast.notify("success", ok); router.refresh(); } catch (e) { setPErr(fieldErrors(e)); toast.notify("error", errorMessage(e)); } finally { setBusy(null); }
  };
  const changed = JSON.stringify(s) !== JSON.stringify(current.settings);

  return (
    <div className="flex flex-col gap-5">
      {!isAdmin && <Notice tone="info">You can view settings. Changing them needs the admin role.</Notice>}

      <Card title="Business" subtitle={`Currency: ${profile.currency}. Dates use DD/MM/YYYY; the financial year starts on 1 ${MONTHS[Number(p.financial_year_start_month) - 1]}.`}>
        <form className="grid grid-cols-1 gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); void run("profile", async () => { await api("/settings", { method: "PATCH", body: { ...p, financial_year_start_month: Number(p.financial_year_start_month), legal_name: p.legal_name || null, gstin: p.gstin || null } }); }, "Business details saved."); }}>
          <Field label="Business name" htmlFor="s-name" error={pErr.name} required><Input id="s-name" value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} disabled={!isAdmin} /></Field>
          <Field label="Legal name" htmlFor="s-legal"><Input id="s-legal" value={p.legal_name} onChange={(e) => setP({ ...p, legal_name: e.target.value })} disabled={!isAdmin} /></Field>
          <Field label="GSTIN" htmlFor="s-gstin" error={pErr.gstin}><Input id="s-gstin" value={p.gstin} onChange={(e) => setP({ ...p, gstin: e.target.value.toUpperCase() })} disabled={!isAdmin} /></Field>
          <Field label="Timezone" htmlFor="s-tz" error={pErr.timezone} hint="Business dates are computed in this timezone; timestamps are stored in UTC."><Input id="s-tz" value={p.timezone} onChange={(e) => setP({ ...p, timezone: e.target.value })} disabled={!isAdmin} /></Field>
          <Field label="Financial year starts in" htmlFor="s-fy"><Select id="s-fy" value={p.financial_year_start_month} onChange={(e) => setP({ ...p, financial_year_start_month: e.target.value })} disabled={!isAdmin}>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</Select></Field>
          {isAdmin && <div className="flex items-end"><Button type="submit" variant="primary" loading={busy === "profile"}>Save business details</Button></div>}
        </form>
      </Card>

      <form onSubmit={(e) => { e.preventDefault(); void run("settings", async () => { await api("/settings", { method: "PUT", body: { settings: s, effectiveFrom: effective, note: note || null } }); }, `Settings saved, effective ${formatDateIN(effective)}.`); }} className="flex flex-col gap-4">
        <Notice tone="info" title="Settings are versioned">Changes apply from the effective date you choose. Reports for earlier periods keep using the settings that were in force then, so history does not move.</Notice>
        {SECTIONS.map((sec) => (
          <Card key={sec.title} title={sec.title} subtitle={sec.blurb}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {sec.defs.map((d) => {
                const id = `s-${d.path.replace(/\./g, "-")}`;
                if (d.kind === "gst") {
                  const reg = s.gst.registered;
                  return (
                    <div key={d.path} className="grid grid-cols-1 gap-3 sm:col-span-2 sm:grid-cols-2">
                      <Field label="GST registration" htmlFor={id}>
                        <Select id={id} value={reg === null ? "" : String(reg)} disabled={!isAdmin} onChange={(e) => setS(setAt(s, "gst.registered", e.target.value === "" ? null : e.target.value === "true"))}>
                          <option value="">Not set (prices treated as GST-inclusive revenue)</option><option value="true">Registered — prices include GST</option><option value="false">Not registered — no GST to separate</option>
                        </Select>
                      </Field>
                      {reg === true && <Field label="Default GST rate (%)" htmlFor={`${id}-rate`} hint="Used when a product has no rate"><Input id={`${id}-rate`} type="number" step="0.5" min={0} max={28} value={s.gst.defaultRatePercent ?? ""} disabled={!isAdmin} onChange={(e) => setS(setAt(s, "gst.defaultRatePercent", e.target.value === "" ? null : Number(e.target.value)))} /></Field>}
                    </div>
                  );
                }
                const val = getAt(s, d.path);
                return d.kind === "select" ? (
                  <Field key={d.path} label={d.label} htmlFor={id} hint={d.hint}><Select id={id} value={String(val ?? "")} disabled={!isAdmin} onChange={(e) => setS(setAt(s, d.path, e.target.value))}>{d.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
                ) : (
                  <Field key={d.path} label={d.label} htmlFor={id} hint={d.hint}><Input id={id} type="number" inputMode="decimal" step={d.step ?? "any"} value={String(val ?? "")} disabled={!isAdmin} onChange={(e) => setS(setAt(s, d.path, e.target.value === "" ? 0 : d.int ? Math.round(Number(e.target.value)) : Number(e.target.value)))} /></Field>
                );
              })}
            </div>
          </Card>
        ))}
        {isAdmin && (
          <Card title="Save">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Effective from" htmlFor="s-eff" required hint="Earlier periods keep the old settings"><Input id="s-eff" type="date" value={effective} onChange={(e) => setEffective(e.target.value)} /></Field>
              <div className="sm:col-span-2"><Field label="Note" htmlFor="s-note"><Textarea id="s-note" value={note} onChange={(e) => setNote(e.target.value)} className="min-h-9" placeholder="What changed and why" /></Field></div>
            </div>
            <div className="mt-3 flex gap-2"><Button type="submit" variant="primary" loading={busy === "settings"} disabled={!changed}>Save settings</Button><Button onClick={() => setS(current.settings)} disabled={!changed}>Reset</Button></div>
          </Card>
        )}
      </form>

      <Card title="Settings history" subtitle="Versions by effective date; each report uses the version in force at the end of its period.">
        <ul className="divide-y divide-zinc-800 text-sm">
          {versions.length === 0 ? <li className="py-1 text-zinc-500">Defaults are in use; nothing has been saved yet.</li> : versions.map((v, i) => (
            <li key={v.id} className="flex justify-between gap-3 py-2"><span>From {formatDateIN(v.effectiveFrom)} {i === 0 && <Badge tone="positive">latest</Badge>}</span><span className="text-zinc-500">{v.note ?? ""}</span></li>
          ))}
        </ul>
      </Card>

      <Card title="Who can sign in" subtitle="Access needs all three: a Supabase login, an email on the server allowlist (BUSINESS_ANALYSIS_ALLOWED_EMAILS), and a role here.">
        {allowedEmailsConfigured === 0 && <Notice tone="negative">The server allowlist is empty, so nobody can sign in.</Notice>}
        <ul className="mt-2 divide-y divide-zinc-800 text-sm">
          {members.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span>{m.email ?? m.userId} {!m.allowlisted && <Badge tone="warning" title="Not on BUSINESS_ANALYSIS_ALLOWED_EMAILS: cannot sign in until added">not on allowlist</Badge>} {!m.isActive && <Badge>inactive</Badge>}</span>
              {isOwner && m.role !== "owner" ? (
                <span className="flex items-center gap-2">
                  <Select aria-label={`Role for ${m.email}`} value={m.role} className="w-36" onChange={(e) => void run(`m-${m.id}`, () => api(`/settings/members/${m.id}`, { method: "PATCH", body: { role: e.target.value, is_active: m.isActive } }).then(() => undefined), "Role updated.")}><option value="admin">Admin</option><option value="accountant">Accountant</option><option value="viewer">Viewer</option></Select>
                  <Button size="sm" onClick={() => void run(`m-${m.id}`, () => api(`/settings/members/${m.id}`, { method: "PATCH", body: { role: m.role, is_active: !m.isActive } }).then(() => undefined), m.isActive ? "Access removed." : "Access restored.")}>{m.isActive ? "Remove access" : "Restore"}</Button>
                </span>
              ) : <Badge>{m.role}</Badge>}
            </li>
          ))}
        </ul>
        {isOwner && (
          <form className="mt-3 flex flex-wrap items-end gap-2 border-t border-zinc-800 pt-3" onSubmit={(e) => { e.preventDefault(); void run("member", async () => { await api("/settings/members", { method: "POST", body: newMember }); setNewMember({ email: "", role: "viewer" }); }, "Member added. Remember to add their email to the server allowlist."); }}>
            <Field label="Add by email" htmlFor="m-email" hint="They must already have a Supabase Auth account"><Input id="m-email" type="email" value={newMember.email} onChange={(e) => setNewMember({ ...newMember, email: e.target.value })} className="w-64" /></Field>
            <Field label="Role" htmlFor="m-role"><Select id="m-role" value={newMember.role} onChange={(e) => setNewMember({ ...newMember, role: e.target.value })} className="w-36"><option value="admin">Admin</option><option value="accountant">Accountant</option><option value="viewer">Viewer</option></Select></Field>
            <Button type="submit" variant="primary" loading={busy === "member"} disabled={!newMember.email}>Add</Button>
          </form>
        )}
        <p className="mt-3 text-xs text-zinc-500">Roles — viewer: read dashboards; accountant: also enter data and import; admin: also settings, roll-backs and original documents; owner: also manage members.</p>
      </Card>
    </div>
  );
}
