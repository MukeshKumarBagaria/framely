import { getServerEnv, isEmailAllowed } from "@/business-analysis/server/env";
import { pageContext } from "@/business-analysis/server/page-guard";
import { getCurrentSettings, getProfile, listMembers, listSettingsVersions } from "@/business-analysis/server/services/settings-service";
import { PageHeader } from "@/business-analysis/ui/kit";
import { SettingsView } from "@/business-analysis/ui/settings-view";

export default async function SettingsPage() {
  const ctx = await pageContext();
  const allowed = getServerEnv().allowedEmails;
  const [profile, current, versions, members] = await Promise.all([getProfile(ctx), getCurrentSettings(ctx), listSettingsVersions(ctx), listMembers(ctx)]);
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Settings" description="Accounting policy, thresholds and access. Changes are versioned by effective date so past reports do not shift." />
      <SettingsView profile={profile} current={current} versions={versions} members={members.map((m) => ({ ...m, allowlisted: isEmailAllowed(m.email, allowed) }))} role={ctx.role} allowedEmailsConfigured={allowed.length} />
    </div>
  );
}
