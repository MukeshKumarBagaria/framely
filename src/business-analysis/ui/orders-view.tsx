"use client";

import { useEffect, useState } from "react";
import { Plus, Search } from "lucide-react";
import { formatDateIN, formatDateTimeIN } from "../domain/dates";
import { ORDER_STATUSES, ORDER_STATUS_LABELS, RECON_STATUSES, RECON_STATUS_LABELS, CHANNEL_LABELS, type OrderStatus, type ReconStatus } from "../domain/statuses";
import type { OrderLine } from "../server/services/order-service";
import { ApiError, api, errorMessage, fieldErrors } from "./api";
import { columnHelper, DataTable, type Column } from "./data-table";
import { Amt, StatusBadge } from "./format";
import { Badge, Button, Field, Input, Notice, Select, Skeleton, Stat } from "./kit";
import { Modal, useToast } from "./overlay";
import { useUrlState } from "./use-url-state";

const h = columnHelper<OrderLine>();
const right = { align: "right" as const };

const COST_BASIS: Record<OrderLine["costBasis"], string> = { missing: "no cost", estimated: "estimated", actual: "actual" };

export function OrdersView({ rows, total, page, pageSize, canWrite, allocation }: { rows: OrderLine[]; total: number; page: number; pageSize: number; canWrite: boolean; allocation: string }) {
  const { params, set, refresh } = useUrlState();
  const [search, setSearch] = useState(params.get("search") ?? "");
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const columns = [
    h.accessor("orderDate", { header: "Order date", cell: (c) => formatDateIN(c.getValue()) }),
    h.accessor("externalLineId", { header: "Sub-order ID", enableSorting: false, cell: (c) => <span className="font-mono text-xs">{c.getValue()}</span> }),
    h.accessor("sku", { header: "Product / SKU", cell: (c) => (
      <div className="max-w-56">
        <p className="truncate">{c.row.original.productName ?? "—"}</p>
        <p className="font-mono text-[11px] text-zinc-500">{c.getValue() ?? "no SKU"}</p>
      </div>
    ) }),
    h.accessor("quantity", { header: "Qty", enableSorting: false, meta: right }),
    h.accessor("orderId", { id: "channel", header: "Channel", enableSorting: false, cell: (c) => CHANNEL_LABELS[c.row.original.channel as keyof typeof CHANNEL_LABELS] ?? c.row.original.channel }),
    h.accessor("status", { header: "Status", cell: (c) => <StatusBadge status={c.getValue()} /> }),
    h.accessor("listedAmount", { header: "Listed", enableSorting: false, meta: right, cell: (c) => <Amt v={c.getValue()} /> }),
    h.accessor("saleAmount", { id: "sale_amount", header: "Sold (incl. GST)", meta: right, cell: (c) => <Amt v={c.getValue()} /> }),
    h.accessor("saleAmountExclGst", { header: "Revenue (excl. GST)", enableSorting: false, meta: right, cell: (c) => <Amt v={c.getValue()} /> }),
    h.accessor("materialCost", { header: "Material (est.)", enableSorting: false, meta: right, cell: (c) => (c.row.original.costBasis === "missing" ? <span className="text-amber-400" title="No recipe cost available">missing</span> : <Amt v={c.getValue()} />) }),
    h.accessor("packagingCost", { header: "Packaging", enableSorting: false, meta: right, cell: (c) => <Amt v={c.getValue()} /> }),
    h.accessor("shippingFees", { header: "Shipping", enableSorting: false, meta: right, cell: (c) => <Amt v={String(Number(c.getValue()) + Number(c.row.original.returnFees))} /> }),
    h.accessor("platformFees", { header: "Platform fees", enableSorting: false, meta: right, cell: (c) => <Amt v={c.getValue()} /> }),
    h.accessor("allocatedAdCost", { header: "Ads (est.)", enableSorting: false, meta: right, cell: (c) => <Amt v={c.getValue()} dash="n/a" /> }),
    h.accessor("contribution", { header: "Contribution", meta: right, cell: (c) => <Amt v={c.getValue()} signed /> }),
    h.accessor("settlementStatus", { header: "Settlement", enableSorting: false, cell: (c) => <Badge tone={c.getValue() === "matched" ? "positive" : c.getValue() === "unsettled" || c.getValue() === "partial" ? "warning" : "neutral"}>{RECON_STATUS_LABELS[c.getValue()]}</Badge> }),
    h.accessor("updatedAt", { id: "updated_at", header: "Updated", cell: (c) => formatDateTimeIN(c.getValue(), "Asia/Kolkata") }),
  ] as unknown as Column<OrderLine>[];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
        <form
          className="flex flex-col gap-1 text-[11px] text-zinc-500"
          onSubmit={(e) => {
            e.preventDefault();
            set({ search: search.trim() || null });
          }}
        >
          <label htmlFor="ba-order-search">Search order ID</label>
          <div className="flex gap-1.5">
            <Input id="ba-order-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Sub-order / order no." className="w-52" />
            <Button type="submit" aria-label="Search"><Search className="h-4 w-4" aria-hidden /></Button>
          </div>
        </form>
        <label className="flex flex-col gap-1 text-[11px] text-zinc-500">
          Profitability
          <Select value={params.get("profitability") ?? ""} onChange={(e) => set({ profitability: e.target.value || null })} className="w-36" aria-label="Profitability">
            <option value="">Any</option>
            <option value="profitable">Profitable</option>
            <option value="loss">Loss-making</option>
            <option value="breakeven">Break-even</option>
          </Select>
        </label>
        <label className="flex flex-col gap-1 text-[11px] text-zinc-500">
          Reconciliation
          <Select value={params.get("reconStatus") ?? ""} onChange={(e) => set({ reconStatus: e.target.value || null })} className="w-44" aria-label="Reconciliation status">
            <option value="">Any</option>
            {RECON_STATUSES.map((s) => <option key={s} value={s}>{RECON_STATUS_LABELS[s]}</option>)}
          </Select>
        </label>
        {canWrite && (
          <Button variant="primary" className="ml-auto" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" aria-hidden /> Manual order
          </Button>
        )}
      </div>
      <p className="text-xs text-zinc-500">
        Costs marked <em>est.</em> come from the product recipe in force on the order date and are not actual spend. Ad cost per order is an allocation ({allocation}), not a measured figure, and is already part of total advertising spend.
      </p>
      <DataTable
        columns={columns}
        data={rows}
        total={total}
        page={page}
        pageSize={pageSize}
        caption="Order lines"
        emptyTitle="No orders match"
        emptyBody="Import a Meesho orders report, or change the date range and filters."
        getRowId={(r) => r.id}
        onRowClick={(r) => setOpenId(r.id)}
      />
      <OrderDetail line={rows.find((r) => r.id === openId) ?? null} canWrite={canWrite} onClose={() => setOpenId(null)} onChanged={refresh} />
      <ManualOrderModal open={adding} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); refresh(); }} />
    </div>
  );
}

type Detail = {
  siblings: { id: string; external_line_id: string; sku: string | null; product_name: string | null; quantity: number; status: OrderStatus }[];
  history: { id: string; previous_status: string | null; new_status: string; raw_status: string | null; changed_at: string; source: string; note: string | null }[];
  settlementItems: { id: string; transaction_type: string; amount: number; transaction_date: string | null; external_reference: string | null; settlements: { external_settlement_id: string | null; settlement_date: string | null } | null }[];
  sources: { import_id: string; source_row_number: number; document_imports: { file_name: string; report_type: string } | null }[];
  policy: { countsAsSale: boolean; countsAsLoss: boolean; expectedSettlement: boolean; recoveryPercent: number };
};

function OrderDetail({ line, canWrite, onClose, onChanged }: { line: OrderLine | null; canWrite: boolean; onClose: () => void; onChanged: () => void }) {
  // Keyed by line so each opened order starts with fresh state.
  return line ? <OrderDetailBody key={line.id} line={line} canWrite={canWrite} onClose={onClose} onChanged={onChanged} /> : null;
}

function OrderDetailBody({ line, canWrite, onClose, onChanged }: { line: OrderLine; canWrite: boolean; onClose: () => void; onChanged: () => void }) {
  const toast = useToast();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<OrderStatus>(line.status);
  const [cost, setCost] = useState("");
  const [busy, setBusy] = useState(false);
  const id = line.id;

  useEffect(() => {
    const ctl = new AbortController();
    api<Detail>(`/orders/${id}`, { signal: ctl.signal }).then(setDetail).catch((e) => e.name !== "AbortError" && setError(errorMessage(e)));
    return () => ctl.abort();
  }, [id]);

  const save = async (body: Record<string, unknown>, ok: string) => {
    setBusy(true);
    try {
      await api(`/orders/${line.id}`, { method: "PATCH", body });
      toast.notify("success", ok);
      onChanged();
      onClose();
    } catch (e) {
      toast.notify("error", errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const rowsOut: [string, string | null, boolean?][] = [
    ["Revenue (excl. GST)", line.saleAmountExclGst],
    ["Material cost (" + COST_BASIS[line.costBasis] + ")", line.costBasis === "missing" ? null : line.materialCost],
    ["Packaging cost", line.packagingCost],
    ["Other product cost", line.otherCost],
    ["Platform fees", line.platformFees],
    ["Shipping & return fees", String(Number(line.shippingFees) + Number(line.returnFees))],
    ["Other deductions", line.otherDeductions],
    ["Contribution", line.contribution, true],
    ["Allocated ad cost (estimate)", line.allocatedAdCost],
    ["Contribution after ads (estimate)", line.contributionAfterAds, true],
  ];

  return (
    <Modal open onClose={onClose} wide title={`${line.productName ?? line.sku ?? "Order line"}`} description={`Sub-order ${line.externalLineId} · order ${line.externalOrderId} · ${formatDateIN(line.orderDate)}`}>
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Status" value={<StatusBadge status={line.status} />} hint={line.rawStatus ? `Source: ${line.rawStatus}` : undefined} />
          <Stat label="Quantity" value={line.quantity} />
          <Stat label="Listed" value={<Amt v={line.listedAmount} />} />
          <Stat label="Sold (incl. GST)" value={<Amt v={line.saleAmount} />} />
        </div>
        {detail && (
          <Notice tone="info">
            {detail.policy.countsAsSale ? "This status counts as a sale." : detail.policy.countsAsLoss ? `This status is treated as a loss (${detail.policy.recoveryPercent}% of goods assumed recovered).` : "This status does not count as a completed sale."}{" "}
            {detail.policy.expectedSettlement ? "A settlement is expected." : "No settlement is expected."}
          </Notice>
        )}
        <section>
          <h3 className="mb-1 text-sm font-semibold text-zinc-100">Financial breakdown</h3>
          <dl className="text-sm">
            {rowsOut.map(([label, value, signed]) => (
              <div key={label} className="flex justify-between gap-4 border-b border-zinc-800/60 py-1">
                <dt className="text-zinc-400">{label}</dt>
                <dd><Amt v={value} signed={signed} dash="not available" /></dd>
              </div>
            ))}
          </dl>
          <p className="mt-1 text-[11px] text-zinc-500">Settlement: expected <Amt v={line.expectedSettlement} />, received sale <Amt v={line.settledSale} />, net <Amt v={line.settledNet} /> — {RECON_STATUS_LABELS[line.settlementStatus as ReconStatus]}.</p>
        </section>

        {error && <Notice tone="negative">{error}</Notice>}
        {!detail && !error && <Skeleton className="h-24 w-full" />}
        {detail && (
          <>
            <section>
              <h3 className="mb-1 text-sm font-semibold text-zinc-100">Status history</h3>
              {detail.history.length === 0 ? <p className="text-xs text-zinc-500">No changes recorded.</p> : (
                <ul className="space-y-1 text-[13px]">
                  {detail.history.map((s) => (
                    <li key={s.id} className="text-zinc-300">
                      {formatDateTimeIN(s.changed_at, "Asia/Kolkata")} — {s.previous_status ? `${s.previous_status} → ` : ""}<strong>{s.new_status}</strong> <span className="text-zinc-500">({s.source}{s.note ? `: ${s.note}` : ""})</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section>
              <h3 className="mb-1 text-sm font-semibold text-zinc-100">Settlement transactions</h3>
              {detail.settlementItems.length === 0 ? <p className="text-xs text-zinc-500">No settlement transactions are linked to this line yet.</p> : (
                <ul className="space-y-1 text-[13px]">
                  {detail.settlementItems.map((s) => (
                    <li key={s.id} className="flex justify-between gap-3 text-zinc-300">
                      <span>{s.transaction_type.replace(/_/g, " ")} · {formatDateIN(s.transaction_date ?? s.settlements?.settlement_date ?? null)} {s.settlements?.external_settlement_id ? `· ${s.settlements.external_settlement_id}` : ""}</span>
                      <Amt v={s.amount} signed />
                    </li>
                  ))}
                </ul>
              )}
            </section>
            {detail.siblings.length > 1 && (
              <section>
                <h3 className="mb-1 text-sm font-semibold text-zinc-100">Other lines in this order</h3>
                <ul className="space-y-1 text-[13px] text-zinc-300">
                  {detail.siblings.filter((s) => s.id !== line.id).map((s) => <li key={s.id}>{s.external_line_id} · {s.product_name ?? s.sku} × {s.quantity} · {ORDER_STATUS_LABELS[s.status]}</li>)}
                </ul>
              </section>
            )}
            {detail.sources.length > 0 && (
              <section>
                <h3 className="mb-1 text-sm font-semibold text-zinc-100">Source reports</h3>
                <ul className="space-y-1 text-[13px] text-zinc-300">
                  {detail.sources.map((s, i) => <li key={i}>{s.document_imports?.file_name ?? "report"} · row {s.source_row_number} <span className="text-zinc-500">({s.document_imports?.report_type})</span></li>)}
                </ul>
              </section>
            )}
          </>
        )}

        {canWrite && (
          <section className="rounded-lg border border-zinc-800 p-3">
            <h3 className="mb-2 text-sm font-semibold text-zinc-100">Adjust</h3>
            <div className="flex flex-wrap items-end gap-3">
              <Field label="Status" htmlFor="ba-order-status">
                <Select id="ba-order-status" value={status} onChange={(e) => setStatus(e.target.value as OrderStatus)} className="w-44">
                  {ORDER_STATUSES.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>)}
                </Select>
              </Field>
              <Button loading={busy} disabled={status === line.status} onClick={() => save({ status }, "Status updated.")}>Save status</Button>
              <Field label="Actual unit cost (₹)" htmlFor="ba-order-cost" hint="Replaces the recipe estimate for this line">
                <Input id="ba-order-cost" inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="e.g. 185.50" className="w-36" />
              </Field>
              <Button loading={busy} disabled={!cost.trim()} onClick={() => save({ actual_unit_cost: cost }, "Actual cost recorded.")}>Save cost</Button>
            </div>
          </section>
        )}
      </div>
    </Modal>
  );
}

function ManualOrderModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({ channel: "direct", order_date: today, status: "pending", product_name: "", sku: "", quantity: "1", unit_price: "", external_order_id: "", notes: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const up = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      await api("/orders", { method: "POST", body: { ...f, quantity: Number(f.quantity) } });
      toast.notify("success", "Order added.");
      onSaved();
    } catch (err) {
      setErrors(fieldErrors(err));
      if (!(err instanceof ApiError) || err.code !== "bad_request") toast.notify("error", errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add a manual order" description="For direct or WhatsApp sales that are not in a marketplace report.">
      <form onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-2" noValidate id="ba-manual-order">
        <Field label="Channel" htmlFor="mo-channel"><Select id="mo-channel" value={f.channel} onChange={up("channel")}><option value="direct">Direct</option><option value="whatsapp">WhatsApp</option><option value="other">Other</option></Select></Field>
        <Field label="Order date" htmlFor="mo-date" error={errors.order_date} required><Input id="mo-date" type="date" value={f.order_date} onChange={up("order_date")} /></Field>
        <Field label="Product name" htmlFor="mo-name" error={errors.product_name} required><Input id="mo-name" value={f.product_name} onChange={up("product_name")} /></Field>
        <Field label="SKU" htmlFor="mo-sku" error={errors.sku}><Input id="mo-sku" value={f.sku} onChange={up("sku")} /></Field>
        <Field label="Quantity" htmlFor="mo-qty" error={errors.quantity} required><Input id="mo-qty" type="number" min={1} value={f.quantity} onChange={up("quantity")} /></Field>
        <Field label="Unit price (₹, as charged)" htmlFor="mo-price" error={errors.unit_price} required><Input id="mo-price" inputMode="decimal" value={f.unit_price} onChange={up("unit_price")} /></Field>
        <Field label="Status" htmlFor="mo-status"><Select id="mo-status" value={f.status} onChange={up("status")}>{ORDER_STATUSES.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>)}</Select></Field>
        <Field label="Your order reference" htmlFor="mo-ref" error={errors.external_order_id}><Input id="mo-ref" value={f.external_order_id} onChange={up("external_order_id")} /></Field>
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" loading={busy}>Add order</Button>
        </div>
      </form>
    </Modal>
  );
}

