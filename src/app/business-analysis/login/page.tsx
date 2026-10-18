import type { Metadata } from "next";
import { CenteredCard } from "@/business-analysis/ui/centered-card";
import { LoginForm } from "@/business-analysis/ui/login-form";

export const metadata: Metadata = { title: "Sign in · Business analysis", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// Only same-site paths under /business-analysis are accepted, so the login
// page cannot be used as an open redirect.
function safeNext(next: string | undefined): string {
  if (next && next.startsWith("/business-analysis") && !next.startsWith("//") && !next.includes("\\")) return next;
  return "/business-analysis";
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; reason?: string }> }) {
  const { next, reason } = await searchParams;
  return (
    <CenteredCard title="Framely Finance">
      <p className="-mt-2 text-sm text-zinc-400">Private area. Sign in with an authorised account.</p>
      <LoginForm next={safeNext(next)} reason={reason} />
    </CenteredCard>
  );
}
