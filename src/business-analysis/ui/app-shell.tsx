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
import { cx } from "./cx";
import { ToastProvider } from "./overlay";
import { ThemeToggle } from "./theme";

const GROUPS = [
  { label: null, items: [
    { href: "/business-analysis", label: "Overview", icon: LayoutDashboard, exact: true },
    { href: "/business-analysis/cash-flow", label: "Cash flow", icon: Landmark },
  ] },
  { label: "Sales", items: [
    { href: "/business-analysis/orders", label: "Orders", icon: PackageSearch },
    { href: "/business-analysis/reconciliation", label: "Meesho payments", icon: Scale },
    { href: "/business-analysis/advertising", label: "Advertising", icon: Megaphone },
  ] },
  { label: "Operations", items: [
    { href: "/business-analysis/products", label: "Product costing", icon: Calculator },
    { href: "/business-analysis/inventory", label: "Inventory", icon: Boxes },
    { href: "/business-analysis/expenses", label: "Expenses", icon: Receipt },
  ] },
  { label: "Data", items: [
    { href: "/business-analysis/imports", label: "Reports & imports", icon: FileSpreadsheet },
    { href: "/business-analysis/settings", label: "Settings", icon: Settings },
  ] },
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
      router.replace("/business-analysis/login?reason=signout");
      router.refresh();
    }
  };

  const isActive = (href: string, exact?: boolean) => (exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));

  const nav = (
    <nav aria-label="Business analysis" className="flex flex-col gap-5">
      {GROUPS.map((g, gi) => (
        <div key={gi} className="flex flex-col gap-0.5">
          {g.label && <p className="px-3 pb-1 text-xs font-medium text-zinc-500">{g.label}</p>}
          {g.items.map((item) => {
            const active = isActive(item.href, "exact" in item ? item.exact : false);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-sky-400",
                  active ? "bg-zinc-800 font-medium text-zinc-50" : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100",
                )}
              >
                <Icon className={cx("h-[18px] w-[18px] shrink-0", active ? "text-sky-400" : "")} aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );

  const footer = (
    <div className="flex flex-col gap-3">
      <ThemeToggle />
      <div className="flex items-center gap-3 rounded-xl border border-zinc-800 p-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-950 text-sm font-semibold uppercase text-sky-200" aria-hidden>
          {businessName.slice(0, 1)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-zinc-100">{businessName}</p>
          <p className="truncate text-xs text-zinc-500" title={email}>{email} · <span className="capitalize">{role}</span></p>
        </div>
        <button type="button" onClick={logout} disabled={leaving} aria-label="Sign out" title="Sign out" className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-50">
          <LogOut className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );

  const brand = (
    <Link href="/business-analysis" className="flex items-center gap-2.5 text-zinc-50">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-950 text-sky-400"><BarChart3 className="h-[18px] w-[18px]" aria-hidden /></span>
      <span className="text-[15px] font-semibold tracking-tight">Framely Finance</span>
    </Link>
  );

  return (
    <ToastProvider>
      <div className="flex min-h-screen flex-1">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col justify-between gap-6 overflow-y-auto border-r border-zinc-800 bg-zinc-900 px-3 py-5 lg:flex">
          <div className="flex flex-col gap-7">
            <div className="px-2">{brand}</div>
            {nav}
          </div>
          {footer}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-zinc-800 bg-zinc-900/95 px-4 py-3 backdrop-blur lg:hidden">
            {brand}
            <button type="button" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen((v) => !v)} className="rounded-lg p-2 text-zinc-300 hover:bg-zinc-800">
              {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
            </button>
          </header>
          {open && (
            <div className="flex flex-col gap-6 border-b border-zinc-800 bg-zinc-900 p-4 lg:hidden">
              {nav}
              {footer}
            </div>
          )}
          <main id="ba-main" className="mx-auto w-full max-w-[1360px] flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
