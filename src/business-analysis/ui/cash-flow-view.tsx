"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { formatDateIN } from "../domain/dates";
import type { CashFlowSummary } from "../domain/financial-calculations";
import { dec } from "../domain/money";
import { CASH_TXN_LABELS, MANUAL_CASH_TXN_TYPES, type CashTxnType } from "../domain/statuses";
import { api } from "./api";
import { ChartCard, COLORS, GroupedBars, TrendChart } from "./charts";
import { columnHelper, DataTable, type Column } from "./data-table";
import { Amt } from "./format";
import { FormModal, ReasonModal, todayInput } from "./forms";
import { Badge, Button, Card, Select, Stat } from "./kit";
import { useToast } from "./overlay";
import { useUrlState } from "./use-url-state";

export type Txn = { id: string; txn_date: string; direction: "in" | "out"; txn_type: CashTxnType; amount: number; payment_account: string | null; external_reference: string | null; description: string | null; source: string; voided_at: string | null; void_reason: string | null };
export type FlowPoint = { key: string; label: string; cashIn: number; cashOut: number; net: number; cumulative: number };
const h = columnHelper<Txn>();

export function CashFlowView({ summary, series, rows, total, page, pageSize, canWrite }: { summary: CashFlowSummary; series: FlowPoint[]; rows: Txn[]; total: number; page: number; pageSize: number; canWrite: boolean }) {
  const { params, set, refresh } = useUrlState();
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [voiding, setVoiding] = useState<Txn | null>(null);
  const done = (m: string) => { toast.notify("success", m); refresh(); };
  const empty = series.every((s) => s.cashIn === 0 && s.cashOut === 0);

  const columns = [
    h.accessor("txn_date", { header: "Date", enableSorting: false, cell: (c) => formatDateIN(c.getValue()) }),
    h.accessor("txn_type", { header: "Type", enableSorting: false, cell: (c) => (
      <span className={c.row.original.voided_at ? "line-through opacity-60" : undefined}>{CASH_TXN_LABELS[c.getValue()]} {c.row.original.voided_at && <Badge>void</Badge>}</span>
    ) }),
    h.accessor("description", { header: "Details", enableSorting: false, cell: (c) => <span className="block max-w-72 truncate text-zinc-400" title={c.getValue() ?? ""}>{c.getValue() ?? c.row.original.external_reference ?? ""}</span> }),
    h.accessor("payment_account", { header: "Account", enableSorting: false, cell: (c) => c.getValue() ?? "" }),
    h.accessor("direction", { header: "In / out", enableSorting: false, cell: (c) => <Badge tone={c.getValue() === "in" ? "positive" : "warning"}>{c.getValue()}</Badge> }),
    h.accessor("amount", { header: "Amount", enableSorting: false, meta: { align: "right" }, cell: (c) => <span className={c.row.original.direction === "in" ? "text-emerald-400" : "text-zinc-200"}><Amt v={c.getValue()} /></span> }),
    h.accessor("source", { header: "Source", enableSorting: false, cell: (c) => <span className="text-xs text-zinc-500">{c.getValue()}</span> }),
    h.display({ id: "a", header: "", cell: (c) => canWrite && c.row.original.source === "manual" && !c.row.original.voided_at ? <Button size="sm" variant="ghost" onClick={() => setVoiding(c.row.original)}>Void</Button> : null }),
  ] as unknown as Column<Txn>[];

  return (
    <div className="flex flex-col gap-4">
      <section aria-label="Cash summary" className="grid grid-cols-2 gap-4 ba-surface rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:grid-cols-4">
        <Stat label="Cash in" value={<Amt v={summary.totalIn} decimals={0} />} />
        <Stat label="Cash out" value={<Amt v={summary.totalOut} decimals={0} />} />
        <Stat label="Net cash flow" value={<Amt v={summary.net} signed decimals={0} />} tone={dec(summary.net).lessThan(0) ? "negative" : "positive"} />
        <Stat label="Operating net" value={<Amt v={summary.operatingNet} signed decimals={0} />} hint="excludes capital, loans, owner draws" tone={dec(summary.operatingNet).lessThan(0) ? "negative" : "positive"} />
      </section>
      <p className="text-xs text-zinc-500">Cash flow is dated by when money moved — settlement and payment dates — not by order date. It is different from profit: stock bought but unsold is cash out, not an expense, and unsettled sales are not cash in.</p>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard title="Cash in vs cash out" description="Grouped bar chart of recorded cash inflows and outflows per period." empty={empty}>
          <GroupedBars data={series} xKey="label" series={[{ key: "cashIn", name: "Cash in", color: COLORS.cashIn }, { key: "cashOut", name: "Cash out", color: COLORS.cashOut }]} />
        </ChartCard>
        <ChartCard title="Running cash position" subtitle="Cumulative net cash across the period (from zero at the start)" description="Line chart of cumulative net cash flow." empty={empty}>
          <TrendChart data={series} xKey="label" series={[{ key: "cumulative", name: "Cumulative net cash", color: COLORS.revenue }]} />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {([["Where cash came from", summary.inflows], ["Where cash went", summary.outflows]] as const).map(([title, list]) => (
          <Card key={title} title={title}>
            {list.length === 0 ? <p className="text-sm text-zinc-500">Nothing recorded.</p> : (
              <ul className="divide-y divide-zinc-800/70 text-sm">
                {list.map((r) => <li key={r.txnType} className="flex justify-between py-1.5"><span className="text-zinc-300">{CASH_TXN_LABELS[r.txnType]} <span className="text-xs text-zinc-500">× {r.entries}</span></span><Amt v={r.amount} /></li>)}
              </ul>
            )}
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-end justify-between gap-2">
        <label className="flex flex-col gap-1 text-xs text-zinc-500">Direction
          <Select aria-label="Direction" value={params.get("direction") ?? ""} onChange={(e) => set({ direction: e.target.value || null })} className="w-36"><option value="">In and out</option><option value="in">Cash in</option><option value="out">Cash out</option></Select></label>
        {canWrite && <Button variant="primary" onClick={() => setAdding(true)}><Plus className="h-4 w-4" aria-hidden /> Manual entry</Button>}
      </div>
      <DataTable columns={columns} data={rows} total={total} page={page} pageSize={pageSize} caption="Cash transactions" getRowId={(r) => r.id} emptyTitle="No cash movements in this period"
        emptyBody="Settlement payouts, expense payments and purchase payments appear here automatically. Add owner capital, loans or other money by hand." />

      <FormModal open={adding} onClose={() => setAdding(false)} title="Manual cash entry" description="For money that has no other record: other income, owner capital, loans, withdrawals. Settlements, expenses and purchases are added from their own pages."
        initial={{ txn_type: "other_income", txn_date: todayInput(), amount: "", payment_account: "", external_reference: "", description: "" }}
        fields={[
          { name: "txn_type", label: "Type", type: "select", options: MANUAL_CASH_TXN_TYPES.map((t) => ({ value: t, label: CASH_TXN_LABELS[t] })), hint: "In or out is set by the type" },
          { name: "txn_date", label: "Date", type: "date", required: true }, { name: "amount", label: "Amount (₹)", type: "money", required: true },
          { name: "payment_account", label: "Account", placeholder: "e.g. HDFC current" }, { name: "external_reference", label: "Reference", wide: true }, { name: "description", label: "Description", type: "textarea" },
        ]}
        onSubmit={async (v) => { await api("/cash-flow", { method: "POST", body: { ...v, payment_account: v.payment_account || null, external_reference: v.external_reference || null, description: v.description || null } }); setAdding(false); done("Cash entry added."); }} />
      <ReasonModal open={voiding !== null} onClose={() => setVoiding(null)} title="Void this cash entry?" description="It stays in the ledger marked void and is excluded from totals." confirmLabel="Void entry"
        onConfirm={async (reason) => { await api(`/cash-flow/${voiding!.id}`, { method: "PATCH", body: { reason } }); setVoiding(null); done("Entry voided."); }} />
    </div>
  );
}
