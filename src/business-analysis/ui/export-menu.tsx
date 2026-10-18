"use client";

import { Download } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "./kit";
import { cx } from "./cx";

export type ExportReport =
  | "profit_loss" | "weekly_summary" | "monthly_report" | "product_profitability" | "expense_breakdown"
  | "reconciliation" | "inventory" | "cash_flow" | "orders" | "expenses" | "import_errors";

/**
 * Downloads go through the authenticated export route with the page's current
 * filters, so the file always matches what is on screen.
 */
export function ExportMenu({ report, formats = ["csv", "xlsx", "pdf"], importId, label = "Export" }: { report: ExportReport; formats?: ("csv" | "xlsx" | "pdf")[]; importId?: string; label?: string }) {
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const href = (format: string) => {
    const q = new URLSearchParams();
    for (const k of ["preset", "from", "to", "channel", "sku", "status", "settlement"]) {
      const v = params.get(k);
      if (v) q.set(k, v);
    }
    q.set("report", report);
    q.set("format", format);
    if (importId) q.set("importId", importId);
    return `/api/business-analysis/reports/export?${q.toString()}`;
  };
  return (
    <div className="relative" onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setOpen(false)}>
      <Button variant="secondary" onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open}>
        <Download className="h-4 w-4" aria-hidden /> {label}
      </Button>
      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-1 w-36 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl">
          {formats.map((f) => (
            <a
              key={f}
              role="menuitem"
              href={href(f)}
              download
              onClick={() => setOpen(false)}
              className={cx("block px-3 py-2 text-sm uppercase text-zinc-200 hover:bg-zinc-800 focus:bg-zinc-800 focus:outline-none")}
            >
              {f}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
