"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  BarChart3,
  Boxes,
  Calculator,
  FileSpreadsheet,
  Landmark,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  PackageSearch,
  Receipt,
  Scale,
  Settings,
  X,
} from "lucide-react";
import { api } from "./api";
import { cx } from "./kit";
import { ToastProvider } from "./overlay";

const NAV = [
  { href: "/business-analysis", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/business-analysis/orders", label: "Orders", icon: PackageSearch },
  { href: "/business-analysis/products", label: "Product costing", icon: Calculator },
  { href: "/business-analysis/inventory", label: "Inventory", icon: Boxes },
  { href: "/business-analysis/expenses", label: "Expenses", icon: Receipt },
  { href: "/business-analysis/advertising", label: "Advertising", icon: Megaphone },
  { href: "/business-analysis/reconciliation", label: "Meesho reconciliation", icon: Scale },
  { href: "/business-analysis/cash-flow", label: "Cash flow", icon: Landmark },
  { href: "/business-analysis/imports", label: "Reports & imports", icon: FileSpreadsheet },
  { href: "/business-analysis/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({ businessName, email, role, children }: { businessName: string; email: string; role: string; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const logout = async () => {
    setLeaving(true);
    try {
      await api("/auth/logout", { method: "POST" });
    } finally {
      router.replace("/business-analysis/login");
      router.refresh();
    }
  };

  const nav = (
    <nav aria-label="Business analysis" className="flex flex-col gap-0.5">
      {NAV.map((item) => {
        const active = "exact" in item && item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            aria-current={active ? "page" : undefined}
            className={cx(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-sky-400",
              active ? "bg-zinc-800 text-zinc-50" : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <ToastProvider>
      <div className="flex min-h-screen flex-1">
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col justify-between border-r border-zinc-800 bg-zinc-950 p-3 lg:flex">
          <div className="flex flex-col gap-4">
            <Link href="/business-analysis" className="flex items-center gap-2 px-3 pt-1 text-zinc-50">
              <BarChart3 className="h-5 w-5 text-sky-400" aria-hidden />
              <span className="text-sm font-semibold">Framely Finance</span>
            </Link>
            {nav}
          </div>
          <UserBox businessName={businessName} email={email} role={role} onLogout={logout} leaving={leaving} />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-zinc-800 bg-zinc-950/95 px-4 py-2.5 backdrop-blur lg:hidden">
            <Link href="/business-analysis" className="flex items-center gap-2 text-sm font-semibold text-zinc-50">
              <BarChart3 className="h-5 w-5 text-sky-400" aria-hidden /> Framely Finance
            </Link>
            <button type="button" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen((v) => !v)} className="rounded-lg p-2 text-zinc-300 hover:bg-zinc-800">
              {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
            </button>
          </header>
          {open && (
            <div className="border-b border-zinc-800 bg-zinc-950 p-3 lg:hidden">
              {nav}
              <div className="mt-3 border-t border-zinc-800 pt-3">
                <UserBox businessName={businessName} email={email} role={role} onLogout={logout} leaving={leaving} />
              </div>
            </div>
          )}
          <main id="ba-main" className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}

function UserBox({ businessName, email, role, onLogout, leaving }: { businessName: string; email: string; role: string; onLogout: () => void; leaving: boolean }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
      <p className="truncate text-sm font-medium text-zinc-100">{businessName}</p>
      <p className="truncate text-xs text-zinc-500" title={email}>{email}</p>
      <p className="mt-0.5 text-[11px] capitalize text-zinc-500">Role: {role}</p>
      <button
        type="button"
        onClick={onLogout}
        disabled={leaving}
        className="mt-2 inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-100 disabled:opacity-60"
      >
        <LogOut className="h-3.5 w-3.5" aria-hidden /> {leaving ? "Signing out…" : "Sign out"}
      </button>
    </div>
  );
}
