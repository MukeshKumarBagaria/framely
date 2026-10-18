import type { Metadata } from "next";
import { guard } from "@/business-analysis/server/page-guard";
import { AppShell } from "@/business-analysis/ui/app-shell";
import { CenteredCard } from "@/business-analysis/ui/centered-card";
import { SetupForm } from "@/business-analysis/ui/setup-form";

export const metadata: Metadata = { title: "Business analysis · Framely", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function BusinessAnalysisLayout({ children }: { children: React.ReactNode }) {
  const g = await guard();
  if (!g.ok) {
    if (g.kind === "not_configured") {
      return (
        <CenteredCard title="Business analysis is not configured">
          <p className="text-sm text-zinc-400">The server is missing configuration:</p>
          <ul className="list-disc pl-5 text-sm text-zinc-300">
            {g.issues.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
          <p className="text-xs text-zinc-500">Set them in .env.local (see .env.example and docs/business-analysis/README.md), then restart the server.</p>
        </CenteredCard>
      );
    }
    if (g.kind === "not_authorized") {
      return (
        <CenteredCard title="Not authorised">
          <p className="text-sm text-zinc-400">This account is not on the business-analysis allowlist. Ask the owner to add your email to BUSINESS_ANALYSIS_ALLOWED_EMAILS.</p>
          <form action="/api/business-analysis/auth/logout" method="post" className="hidden" />
          <a href="/business-analysis/login" className="text-sm text-sky-400 underline">Sign in with a different account</a>
        </CenteredCard>
      );
    }
    if (g.kind === "no_business") {
      return (
        <CenteredCard title="Set up your business">
          <SetupForm email={g.email} />
        </CenteredCard>
      );
    }
    return (
      <CenteredCard title="Something went wrong">
        <p className="text-sm text-zinc-400">{g.message}</p>
      </CenteredCard>
    );
  }
  const { ctx } = g;
  return (
    <AppShell businessName={ctx.business.name} email={ctx.user.email} role={ctx.role}>
      {children}
    </AppShell>
  );
}
