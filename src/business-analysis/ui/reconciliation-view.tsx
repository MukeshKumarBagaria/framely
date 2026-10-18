"use client";

import { useState } from "react";
import { Link2, Link2Off, Search } from "lucide-react";
import { formatDateIN } from "../domain/dates";
import { RECON_STATUSES, RECON_STATUS_LABELS, SETTLEMENT_TYPE_LABELS, type ReconStatus, type SettlementType } from "../domain/statuses";
import { dec } from "../domain/money";
import type { ReconLine, ReconciliationSummary } from "../server/services/reconciliation-service";
import { api, errorMessage } from "./api";
import { columnHelper, DataTable, type Column } from "./data-table";
import { Amt, StatusBadge } from "./format";
import { FormModal, todayInput } from "./forms";
import { Badge, Button, Card, EmptyState, Input, Notice, Select, Stat } from "./kit";
import { Modal, useToast } from "./overlay";
import { useUrlState } from "./use-url-state";

type Unlinked = { id: string; external_line_id: string | null; transaction_type: string; amount: number; transaction_date: string | null; external_reference: string | null; description: string | null; settlements: { external_settlement_id: string; settlement_date: string | null } | null };
type Settlement = { id: string; external_settlement_id: string; settlement_kind: string; settlement_date: string | null; gross_amount: number; deductions_amount: number; net_amount: number; status: string; bank_received_amount: number | null; bank_received_on: string | null; bank_reference: string | null };
type View = "lines" | "unlinked" | "settlements";

const STATUS_TONE: Partial<Record<ReconStatus, "positive" | "warning" | "negative" | "neutral" | "info">> = { matched: "positive", unsettled: "warning", partial: "warning", over_settled: "negative", duplicate_suspected: "negative", net_only: "info", charges_only: "neutral", not_due: "neutral" };
const h = columnHelper<ReconLine>();
const right = { align: "right" as const };

export function ReconciliationView({ view, summary, lines, unlinked, settlements, total, page, pageSize, canWrite, tolerance }: {
  view: View; summary: ReconciliationSummary; lines: ReconLine[]; unlinked: Unlinked[]; settlements: Settlement[]; total: number; page: number; pageSize: number; canWrite: boolean; tolerance: string;
}) {
  const { params, set, refresh } = useUrlState();
  const toast = useToast();
  const [search, setSearch] = useState(params.get("search") ?? "");
  const [matching, setMatching] = useState<Unlinked | null>(null);
  const [bank, setBank] = useState<Settlement | null>(null);
  const done = (m: string) => { toast.notify("success", m); refresh(); };

  const columns = [
    h.accessor("orderDate", { header: "Order date", enableSorting: false, cell: (c) => formatDateIN(c.getValue()) }),
    h.accessor("externalLineId", { header: "Sub-order ID", enableSorting: false, cell: (c) => <span className="font-mono text-xs">{c.getValue()}</span> }),
    h.accessor("sku", { header: "SKU", enableSorting: false }),
    h.accessor("status", { header: "Order status", enableSorting: false, cell: (c) => <StatusBadge status={c.getValue() as never} /> }),
    h.accessor("expected", { header: "Expected", enableSorting: false, meta: right, cell: (c) => <Amt v={c.getValue()} /> }),
    h.accessor("settledSale", { header: "Settled sale", enableSorting: false, meta: right, cell: (c) => <Amt v={c.getValue()} /> }),
    h.accessor("deductions", { header: "Deductions", enableSorting: false, meta: right, cell: (c) => <Amt v={c.getValue()} /> }),
    h.accessor("settledNet", { header: "Net paid", enableSorting: false, meta: right, cell: (c) => <Amt v={c.getValue()} /> }),
    h.accessor("difference", { header: "Difference", enableSorting: false, meta: right, cell: (c) => <Amt v={c.getValue()} signed /> }),
    h.accessor("settlementCount", { header: "Settlements", enableSorting: false, meta: right }),
    h.accessor("settlementStatus", { header: "Result", enableSorting: false, cell: (c) => <Badge tone={STATUS_TONE[c.getValue()] ?? "neutral"}>{RECON_STATUS_LABELS[c.getValue()]}</Badge> }),
  ] as unknown as Column<ReconLine>[];

  const s = summary;
  const tabs: [View, string, number?][] = [["lines", "Orders vs settlements"], ["unlinked", "Unmatched payments", s.unlinkedItems], ["settlements", "Settlements & bank"]];

  return (
    <div className="flex flex-col gap-4">
      <section aria-label="Reconciliation summary" className="grid grid-cols-2 gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Expected from Meesho" value={<Amt v={s.expected} decimals={0} />} />
        <Stat label="Net received (settlements)" value={<Amt v={s.settledNet} decimals={0} />} />
        <Stat label="Outstanding receivable" value={<Amt v={s.outstanding} decimals={0} />} tone={dec(s.outstanding).greaterThan(0) ? "negative" : "neutral"} hint="Cancelled and nothing-due lines excluded" />
        <Stat label="Unmatched payments" value={s.unlinkedItems} hint={<Amt v={s.unlinkedAmount} decimals={0} />} tone={s.unlinkedItems ? "negative" : "neutral"} />
        <Stat label="Possible duplicates" value={s.duplicateLines} tone={s.duplicateLines ? "negative" : "neutral"} />
        <Stat label="Tolerance" value={<Amt v={tolerance} />} hint="Differences within this are matched" />
      </section>
      <p className="text-xs text-zinc-500">A delivered order is never assumed to be paid: money counts as received only when a settlement report shows it (or you enter the bank receipt).</p>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="tablist" aria-label="Reconciliation views" className="flex gap-1 rounded-lg border border-zinc-800 bg-zinc-900/50 p-1">
          {tabs.map(([k, label, n]) => (
            <button key={k} role="tab" type="button" aria-selected={view === k} onClick={() => set({ view: k === "lines" ? null : k, page: null, reconStatus: null })} className={`rounded-md px-3 py-1.5 text-sm ${view === k ? "bg-zinc-700 text-zinc-50" : "text-zinc-400 hover:text-zinc-200"}`}>
              {label}{n ? <span className="ml-1.5 rounded bg-rose-900/60 px-1.5 text-[11px] text-rose-200">{n}</span> : null}
            </button>
          ))}
        </div>
      </div>

      {view === "lines" && (
        <>
          <div className="flex flex-wrap items-end gap-2">
            <form className="flex flex-col gap-1 text-[11px] text-zinc-500" onSubmit={(e) => { e.preventDefault(); set({ search: search.trim() || null }); }}>
              <label htmlFor="ba-recon-search">Search order ID</label>
              <div className="flex gap-1.5"><Input id="ba-recon-search" value={search} onChange={(e) => setSearch(e.target.value)} className="w-52" /><Button type="submit" aria-label="Search"><Search className="h-4 w-4" aria-hidden /></Button></div>
            </form>
            <label className="flex flex-col gap-1 text-[11px] text-zinc-500">Result
              <Select aria-label="Result" value={params.get("reconStatus") ?? ""} onChange={(e) => set({ reconStatus: e.target.value || null })} className="w-48"><option value="">All results</option>{RECON_STATUSES.map((r) => <option key={r} value={r}>{RECON_STATUS_LABELS[r]}</option>)}</Select></label>
          </div>
          <DataTable columns={columns} data={lines} total={total} page={page} pageSize={pageSize} caption="Order lines compared with settlements" getRowId={(r) => r.orderItemId}
            emptyTitle="Nothing to reconcile" emptyBody="Import Meesho order and payment (settlement) reports for this period." />
        </>
      )}

      {view === "unlinked" && (
        <Card title="Payments with no matching order" subtitle="Settlement lines whose order could not be found. Link them to the right order line, or leave them if they are not order-related.">
          {unlinked.length === 0 ? <EmptyState title="Every payment line is linked to an order" /> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-max text-left text-[13px]">
                <thead className="text-[11px] uppercase text-zinc-400"><tr><th className="px-3 py-2">Date</th><th className="px-3 py-2">Reference in report</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Settlement</th><th className="px-3 py-2 text-right">Amount</th><th /></tr></thead>
                <tbody>
                  {unlinked.map((u) => (
                    <tr key={u.id} className="border-t border-zinc-800/70">
                      <td className="px-3 py-2">{formatDateIN(u.transaction_date)}</td>
                      <td className="px-3 py-2 font-mono text-xs">{u.external_line_id ?? u.external_reference ?? "—"}</td>
                      <td className="px-3 py-2">{SETTLEMENT_TYPE_LABELS[u.transaction_type as SettlementType] ?? u.transaction_type}</td>
                      <td className="px-3 py-2 text-zinc-400">{u.settlements?.external_settlement_id}</td>
                      <td className="px-3 py-2 text-right"><Amt v={u.amount} signed /></td>
                      <td className="px-3 py-2 text-right">{canWrite && <Button size="sm" onClick={() => setMatching(u)}><Link2 className="h-3.5 w-3.5" aria-hidden /> Match</Button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {view === "settlements" && (
        <Card title="Settlements" subtitle="What Meesho reports paying, against what reached the bank (entered by you).">
          {settlements.length === 0 ? <EmptyState title="No settlements in this period">Import a Meesho payment report on the Reports & imports page.</EmptyState> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-max text-left text-[13px]">
                <thead className="text-[11px] uppercase text-zinc-400"><tr><th className="px-3 py-2">Settlement</th><th className="px-3 py-2">Date</th><th className="px-3 py-2 text-right">Gross</th><th className="px-3 py-2 text-right">Deductions</th><th className="px-3 py-2 text-right">Net reported</th><th className="px-3 py-2">Bank receipt</th><th /></tr></thead>
                <tbody>
                  {settlements.map((st) => {
                    const diff = st.bank_received_amount === null ? null : dec(st.bank_received_amount).minus(st.net_amount);
                    return (
                      <tr key={st.id} className="border-t border-zinc-800/70">
                        <td className="px-3 py-2"><span className="font-mono text-xs">{st.external_settlement_id}</span><div className="text-[11px] text-zinc-500">{st.settlement_kind.replace(/_/g, " ")}</div></td>
                        <td className="px-3 py-2">{formatDateIN(st.settlement_date)}</td>
                        <td className="px-3 py-2 text-right"><Amt v={st.gross_amount} /></td>
                        <td className="px-3 py-2 text-right"><Amt v={st.deductions_amount} /></td>
                        <td className="px-3 py-2 text-right"><Amt v={st.net_amount} /></td>
                        <td className="px-3 py-2">{st.bank_received_amount === null ? <Badge tone="warning">not entered</Badge> : <span><Amt v={st.bank_received_amount} /> on {formatDateIN(st.bank_received_on)} {diff && !diff.isZero() && <Badge tone="negative">diff <Amt v={diff.toFixed(2)} signed /></Badge>}</span>}</td>
                        <td className="px-3 py-2 text-right">{canWrite && <Button size="sm" onClick={() => setBank(st)}>{st.bank_received_amount === null ? "Enter bank receipt" : "Change"}</Button>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      <MatchModal item={matching} onClose={() => setMatching(null)} onMatched={() => { setMatching(null); done("Payment linked to the order."); }} />
      <FormModal open={bank !== null} onClose={() => setBank(null)} title="Bank receipt" description={bank ? `Settlement ${bank.external_settlement_id} reports a net of ${bank.net_amount}. Enter what actually arrived in your account.` : undefined}
        initial={{ amount: bank?.bank_received_amount != null ? String(bank.bank_received_amount) : bank ? String(bank.net_amount) : "", received_on: bank?.bank_received_on ?? todayInput(), reference: bank?.bank_reference ?? "" }}
        fields={[{ name: "amount", label: "Amount received (₹)", type: "money", required: true }, { name: "received_on", label: "Received on", type: "date", required: true }, { name: "reference", label: "Bank reference / UTR", wide: true }]}
        onSubmit={async (v) => { await api("/reconciliation/bank-receipt", { method: "POST", body: { settlement_id: bank!.id, amount: v.amount, received_on: v.received_on, reference: v.reference || null } }); setBank(null); done("Bank receipt saved."); }} />
    </div>
  );
}

type Candidate = { id: string; externalLineId: string; productName: string | null; sku: string | null; orderDate: string; status: string };

function MatchModal({ item, onClose, onMatched }: { item: Unlinked | null; onClose: () => void; onMatched: () => void }) {
  const toast = useToast();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Candidate[] | null>(null);
  const [busy, setBusy] = useState(false);
  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const today = todayInput();
      const r = await api<{ rows: Candidate[] }>(`/orders?search=${encodeURIComponent(q)}&preset=custom&from=2015-01-01&to=${today}&pageSize=10`);
      setResults(r.rows);
    } catch (err) { toast.notify("error", errorMessage(err)); } finally { setBusy(false); }
  };
  return (
    <Modal open={item !== null} onClose={onClose} title="Match payment to an order" description={item ? `${item.transaction_type.replace(/_/g, " ")} of ${item.amount} · ref ${item.external_line_id ?? item.external_reference ?? "—"}` : undefined}>
      <form onSubmit={search} className="mb-3 flex gap-2">
        <Input aria-label="Order or sub-order ID" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Sub-order / order ID" autoFocus />
        <Button type="submit" loading={busy} disabled={!q.trim()}>Search</Button>
      </form>
      {results && results.length === 0 && <Notice tone="warning">No order line found with that ID.</Notice>}
      <ul className="divide-y divide-zinc-800">
        {results?.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-3 py-2 text-sm">
            <span className="min-w-0"><span className="font-mono text-xs">{r.externalLineId}</span> <span className="text-zinc-400">· {r.productName ?? r.sku} · {formatDateIN(r.orderDate)} · {r.status}</span></span>
            <Button size="sm" variant="primary" onClick={async () => { try { await api("/reconciliation/match", { method: "POST", body: { settlement_item_id: item!.id, order_item_id: r.id } }); onMatched(); } catch (err) { toast.notify("error", errorMessage(err)); } }}>Link</Button>
          </li>
        ))}
      </ul>
      <p className="mt-3 flex items-center gap-1 text-[11px] text-zinc-500"><Link2Off className="h-3 w-3" aria-hidden /> A link can be undone later; nothing is deleted.</p>
    </Modal>
  );
}
