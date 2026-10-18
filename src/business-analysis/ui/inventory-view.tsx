"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { formatDateIN } from "../domain/dates";
import { MOVEMENT_LABELS, MOVEMENT_TYPES, movementSign, type MovementType } from "../domain/statuses";
import type { InventoryItem, InventorySnapshot } from "../server/services/inventory-service";
import { api, errorMessage } from "./api";
import { Amt } from "./format";
import { FormModal, ReasonModal, clean, todayInput, type Values } from "./forms";
import { Badge, Button, Card, EmptyState, Field, Input, Notice, Select, Stat } from "./kit";
import { Modal, useToast } from "./overlay";

type Movement = { id: string; material_id: string | null; product_id: string | null; movement_type: MovementType; quantity: number | string; unit_cost: number | string | null; movement_date: string; reference_type: string | null; notes: string | null; voided_at: string | null; materials: { name: string; unit: string } | null; products: { name: string; sku: string } | null };
type Supplier = { id: string; name: string; contact_name: string | null; phone: string | null; email: string | null; gstin: string | null; address: string | null; notes: string | null; is_active: boolean };
type PO = { id: string; po_number: string; order_date: string; expected_date: string | null; status: string; total: number; payment_status: string; received_on: string | null; supplier_id: string; suppliers: { name: string } | null; purchase_order_items: { id: string; material_id: string; quantity: number; unit_price: number; tax_rate: number; materials: { name: string; unit: string } | null }[] };
type Mat = { id: string; name: string; unit: string };
type Prod = { id: string; name: string; sku: string };

const TABS = [["stock", "Stock"], ["movements", "Ledger"], ["purchases", "Purchase orders"], ["suppliers", "Suppliers"]] as const;
type Tab = (typeof TABS)[number][0];

export function InventoryView({ snapshot, movements, movementTotal, suppliers, purchaseOrders, materials, products, canWrite }: {
  snapshot: InventorySnapshot; movements: Movement[]; movementTotal: number; suppliers: Supplier[]; purchaseOrders: PO[]; materials: Mat[]; products: Prod[]; canWrite: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("stock");
  const [moveFor, setMoveFor] = useState<{ materialId?: string } | null>(null);
  const [producing, setProducing] = useState(false);
  const [supplierForm, setSupplierForm] = useState<Supplier | "new" | null>(null);
  const [poForm, setPoForm] = useState<PO | "new" | null>(null);
  const [voiding, setVoiding] = useState<Movement | null>(null);
  const [poAction, setPoAction] = useState<{ po: PO; action: "receive" | "pay" } | null>(null);
  const done = (m: string) => { toast.notify("success", m); router.refresh(); };

  const low = snapshot.lowStock;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 ba-surface rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:grid-cols-4">
        <Stat label={snapshot.isEstimate ? "Stock value (estimated)" : "Stock value"} value={<Amt v={snapshot.totalEstimatedValue ?? snapshot.totalValue} decimals={0} />} hint={snapshot.isEstimate ? "Includes estimated usage" : `As of ${formatDateIN(snapshot.asOf)}`} />
        <Stat label="Materials tracked" value={snapshot.items.length} />
        <Stat label="Below reorder level" value={low.length} tone={low.length ? "negative" : "neutral"} />
        <Stat label="Finished goods lines" value={snapshot.products.length} />
      </div>
      {snapshot.isEstimate && (
        <Notice tone="warning" title="Estimated stock">
          Stock is only exact for movements you record. Materials used by sold orders but never recorded as consumption or production are estimated from recipes, and shown as <em>estimated</em>. Record purchases and production runs for exact figures. Consumption happens once — at production — and dispatching an order does not consume it again.
        </Notice>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="tablist" aria-label="Inventory sections" className="flex gap-1 rounded-lg border border-zinc-800 bg-zinc-900 p-1">
          {TABS.map(([k, label]) => (
            <button key={k} role="tab" type="button" aria-selected={tab === k} onClick={() => setTab(k)} className={`rounded-md px-3 py-1.5 text-sm ${tab === k ? "bg-zinc-800 text-zinc-50 shadow-sm" : "text-zinc-400 hover:text-zinc-200"}`}>{label}</button>
          ))}
        </div>
        {canWrite && (
          <div className="flex flex-wrap gap-2">
            {tab === "stock" && <><Button onClick={() => setProducing(true)}>Record production</Button><Button variant="primary" onClick={() => setMoveFor({})}><Plus className="h-4 w-4" aria-hidden /> Stock movement</Button></>}
            {tab === "movements" && <Button variant="primary" onClick={() => setMoveFor({})}><Plus className="h-4 w-4" aria-hidden /> Stock movement</Button>}
            {tab === "purchases" && <Button variant="primary" onClick={() => setPoForm("new")}><Plus className="h-4 w-4" aria-hidden /> Purchase order</Button>}
            {tab === "suppliers" && <Button variant="primary" onClick={() => setSupplierForm("new")}><Plus className="h-4 w-4" aria-hidden /> Supplier</Button>}
          </div>
        )}
      </div>

      {tab === "stock" && (
        <Card>
          {snapshot.items.length === 0 ? <EmptyState title="No materials yet">Add materials on the Product costing page, then record opening stock and purchases here.</EmptyState> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-max text-left text-[13px]">
                <thead className="text-xs font-medium text-zinc-500"><tr><th className="px-3 py-2">Material</th><th className="px-3 py-2 text-right">On hand</th><th className="px-3 py-2 text-right">Est. after usage</th><th className="px-3 py-2 text-right">Reorder at</th><th className="px-3 py-2 text-right">Avg cost</th><th className="px-3 py-2 text-right">Value</th><th className="px-3 py-2">Last movement</th><th /></tr></thead>
                <tbody>
                  {snapshot.items.map((i: InventoryItem) => (
                    <tr key={i.materialId} className="border-t border-zinc-800/70">
                      <td className="px-3 py-2">{i.name} {i.belowReorder && <Badge tone="negative">reorder</Badge>} {i.wentNegative && <Badge tone="warning" title="Recorded usage exceeded recorded stock at some point">check stock</Badge>}<div className="text-xs text-zinc-500">{i.category.replace(/_/g, " ")}</div></td>
                      <td className="px-3 py-2 text-right tabular-nums">{Number(i.quantity).toLocaleString("en-IN")} {i.unit}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-zinc-400">{i.estimatedQuantity !== null ? `${Number(i.estimatedQuantity).toLocaleString("en-IN")} ${i.unit}` : "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{Number(i.reorderThreshold).toLocaleString("en-IN")}</td>
                      <td className="px-3 py-2 text-right"><Amt v={i.averageUnitCost} /></td>
                      <td className="px-3 py-2 text-right"><Amt v={i.estimatedValue ?? i.value} decimals={0} /></td>
                      <td className="px-3 py-2 text-zinc-400">{formatDateIN(i.lastMovementDate)}</td>
                      <td className="px-3 py-2 text-right">{canWrite && <Button size="sm" onClick={() => setMoveFor({ materialId: i.materialId })}>Record</Button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {snapshot.products.length > 0 && (
            <div className="mt-4 border-t border-zinc-800 pt-3">
              <h3 className="mb-1 text-sm font-semibold text-zinc-100">Finished goods</h3>
              <ul className="text-[13px] text-zinc-300">{snapshot.products.map((p) => <li key={p.productId} className="flex justify-between border-b border-zinc-800/60 py-1"><span>{products.find((x) => x.id === p.productId)?.name ?? "Product"}</span><span className="tabular-nums">{Number(p.quantity)} units · <Amt v={p.value} decimals={0} /></span></li>)}</ul>
            </div>
          )}
        </Card>
      )}

      {tab === "movements" && (
        <Card title="Stock ledger" subtitle={`${movementTotal.toLocaleString("en-IN")} entries. Entries are never edited — a mistake is voided and re-entered.`}>
          {movements.length === 0 ? <EmptyState title="No movements recorded" /> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-max text-left text-[13px]">
                <thead className="text-xs font-medium text-zinc-500"><tr><th className="px-3 py-2">Date</th><th className="px-3 py-2">Item</th><th className="px-3 py-2">Type</th><th className="px-3 py-2 text-right">Quantity</th><th className="px-3 py-2 text-right">Unit cost</th><th className="px-3 py-2">Notes</th><th /></tr></thead>
                <tbody>
                  {movements.map((m) => (
                    <tr key={m.id} className={`border-t border-zinc-800/70 ${m.voided_at ? "opacity-50 line-through" : ""}`}>
                      <td className="px-3 py-2">{formatDateIN(m.movement_date)}</td>
                      <td className="px-3 py-2">{m.materials?.name ?? m.products?.name ?? "—"}</td>
                      <td className="px-3 py-2">{MOVEMENT_LABELS[m.movement_type]} {m.reference_type && m.reference_type !== "manual" && <span className="text-xs text-zinc-500">({m.reference_type.replace(/_/g, " ")})</span>}</td>
                      <td className={`px-3 py-2 text-right tabular-nums ${Number(m.quantity) < 0 ? "text-rose-400" : "text-emerald-400"}`}>{Number(m.quantity) > 0 ? "+" : ""}{Number(m.quantity).toLocaleString("en-IN")} {m.materials?.unit ?? ""}</td>
                      <td className="px-3 py-2 text-right"><Amt v={m.unit_cost === null ? null : String(m.unit_cost)} /></td>
                      <td className="max-w-64 truncate px-3 py-2 text-zinc-400" title={m.notes ?? ""}>{m.notes}</td>
                      <td className="px-3 py-2 text-right">{canWrite && !m.voided_at && m.reference_type !== "purchase_order" && <Button size="sm" variant="ghost" onClick={() => setVoiding(m)}>Void</Button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === "purchases" && (
        <Card>
          {purchaseOrders.length === 0 ? <EmptyState title="No purchase orders" action={canWrite ? <Button variant="primary" onClick={() => setPoForm("new")}>Create one</Button> : undefined}>Receiving a purchase order adds stock at cost; paying it records one cash outflow. Neither is double-counted as an expense.</EmptyState> : (
            <ul className="divide-y divide-zinc-800">
              {purchaseOrders.map((po) => (
                <li key={po.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-100">{po.po_number} · {po.suppliers?.name} <Badge tone={po.status === "received" ? "positive" : po.status === "cancelled" ? "neutral" : "info"}>{po.status}</Badge> <Badge tone={po.payment_status === "paid" ? "positive" : "warning"}>{po.payment_status}</Badge></p>
                    <p className="text-xs text-zinc-500">{formatDateIN(po.order_date)} · {po.purchase_order_items.map((i) => `${i.materials?.name} × ${i.quantity}`).join(", ")}</p>
                  </div>
                  <div className="flex items-center gap-2"><Amt v={po.total} />
                    {canWrite && po.status !== "cancelled" && (
                      <>
                        {po.status === "ordered" && <Button size="sm" onClick={() => setPoAction({ po, action: "receive" })}>Receive</Button>}
                        {po.payment_status !== "paid" && <Button size="sm" onClick={() => setPoAction({ po, action: "pay" })}>Mark paid</Button>}
                        {(po.status === "draft" || po.status === "ordered") && <Button size="sm" variant="ghost" onClick={() => setPoForm(po)}>Edit</Button>}
                        {po.status !== "received" && <Button size="sm" variant="ghost" onClick={async () => { try { await api(`/purchase-orders/${po.id}`, { method: "POST", body: { action: "cancel" } }); done("Purchase order cancelled."); } catch (e) { toast.notify("error", errorMessage(e)); } }}>Cancel</Button>}
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {tab === "suppliers" && (
        <Card>
          {suppliers.length === 0 ? <EmptyState title="No suppliers yet" /> : (
            <ul className="divide-y divide-zinc-800">
              {suppliers.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div><p className="text-sm text-zinc-100">{s.name} {!s.is_active && <Badge>inactive</Badge>}</p><p className="text-xs text-zinc-500">{[s.contact_name, s.phone, s.email, s.gstin].filter(Boolean).join(" · ")}</p></div>
                  {canWrite && <Button size="sm" onClick={() => setSupplierForm(s)}>Edit</Button>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <MovementForm open={moveFor !== null} presetMaterial={moveFor?.materialId} materials={materials} products={products} onClose={() => setMoveFor(null)} onSaved={() => { setMoveFor(null); done("Movement recorded."); }} />
      <ProductionForm open={producing} products={products} onClose={() => setProducing(false)} onSaved={(m) => { setProducing(false); done(m); }} />
      <SupplierForm target={supplierForm} onClose={() => setSupplierForm(null)} onSaved={() => { setSupplierForm(null); done("Supplier saved."); }} />
      <POForm target={poForm} suppliers={suppliers.filter((s) => s.is_active)} materials={materials} onClose={() => setPoForm(null)} onSaved={() => { setPoForm(null); done("Purchase order saved."); }} />
      <POActionForm ctx={poAction} onClose={() => setPoAction(null)} onDone={(m) => { setPoAction(null); done(m); }} />
      <ReasonModal open={voiding !== null} onClose={() => setVoiding(null)} title="Void this movement?" description={`${voiding ? MOVEMENT_LABELS[voiding.movement_type] : ""} of ${voiding?.materials?.name ?? voiding?.products?.name ?? ""}. It stays in the ledger, marked void. A production batch is voided as a whole.`} confirmLabel="Void movement"
        onConfirm={async (reason) => { await api(`/inventory/movements/${voiding!.id}`, { method: "PATCH", body: { reason } }); setVoiding(null); done("Movement voided."); }} />
    </div>
  );
}

function MovementForm({ open, presetMaterial, materials, products, onClose, onSaved }: { open: boolean; presetMaterial?: string; materials: Mat[]; products: Prod[]; onClose: () => void; onSaved: () => void }) {
  const items = [...materials.map((m) => ({ value: `m:${m.id}`, label: `${m.name} (${m.unit})` })), ...products.map((p) => ({ value: `p:${p.id}`, label: `${p.name} — finished` }))];
  const initial: Values = { item: presetMaterial ? `m:${presetMaterial}` : items[0]?.value ?? "", movement_type: "purchase", quantity: "", unit_cost: "", movement_date: todayInput(), notes: "" };
  return (
    <FormModal open={open} onClose={onClose} title="Record stock movement" description="Enter the quantity as a positive number; the type decides whether stock goes up or down. For an adjustment, use − to remove."
      initial={initial}
      fields={[
        { name: "item", label: "Item", type: "select", options: items, required: true, wide: true },
        { name: "movement_type", label: "Type", type: "select", options: MOVEMENT_TYPES.filter((t) => t !== "production_output" && t !== "dispatch").map((t) => ({ value: t, label: MOVEMENT_LABELS[t] })) },
        { name: "movement_date", label: "Date", type: "date", required: true },
        { name: "quantity", label: "Quantity", type: "number", required: true, step: "any" },
        { name: "unit_cost", label: "Cost per unit (₹)", type: "money", hint: "Needed for purchases and opening stock to value the stock" },
        { name: "notes", label: "Notes", wide: true },
      ]}
      onSubmit={async (v) => {
        const [kind, id] = String(v.item).split(":");
        const sign = movementSign(v.movement_type as MovementType);
        const qty = Math.abs(Number(v.quantity));
        const signed = sign === 0 ? Number(v.quantity) : sign * qty;
        await api("/inventory/movements", { method: "POST", body: { ...(kind === "m" ? { material_id: id } : { product_id: id }), movement_type: v.movement_type, quantity: signed, unit_cost: String(v.unit_cost || "") || null, movement_date: v.movement_date, notes: v.notes || null } });
        onSaved();
      }} />
  );
}

function ProductionForm({ open, products, onClose, onSaved }: { open: boolean; products: Prod[]; onClose: () => void; onSaved: (m: string) => void }) {
  return (
    <FormModal open={open} onClose={onClose} title="Record production" description="Consumes each material in the product's recipe (with wastage) once. Dispatching orders later does not consume it again."
      initial={{ product_id: products[0]?.id ?? "", quantity: "", date: todayInput(), notes: "", add_finished_goods: false }}
      fields={[
        { name: "product_id", label: "Product", type: "select", options: products.map((p) => ({ value: p.id, label: `${p.name} (${p.sku})` })), required: true, wide: true },
        { name: "quantity", label: "Units made", type: "number", required: true }, { name: "date", label: "Date", type: "date", required: true },
        { name: "add_finished_goods", label: "Also add to finished-goods stock", type: "checkbox", hint: "Leave off if you print to order and ship straight away." },
        { name: "notes", label: "Notes", wide: true },
      ]}
      onSubmit={async (v) => { await api("/inventory/production", { method: "POST", body: { ...clean(v, ["quantity"]), add_finished_goods: Boolean(v.add_finished_goods) } }); onSaved("Production recorded and materials consumed."); }} />
  );
}

function SupplierForm({ target, onClose, onSaved }: { target: Supplier | "new" | null; onClose: () => void; onSaved: () => void }) {
  const s = target && target !== "new" ? target : null;
  return (
    <FormModal open={target !== null} onClose={onClose} title={s ? "Edit supplier" : "Add supplier"}
      initial={{ name: s?.name ?? "", contact_name: s?.contact_name ?? "", phone: s?.phone ?? "", email: s?.email ?? "", gstin: s?.gstin ?? "", address: s?.address ?? "", notes: s?.notes ?? "", is_active: s?.is_active ?? true }}
      fields={[{ name: "name", label: "Name", required: true }, { name: "contact_name", label: "Contact person" }, { name: "phone", label: "Phone" }, { name: "email", label: "Email", type: "email" }, { name: "gstin", label: "GSTIN" }, { name: "is_active", label: "Active", type: "checkbox" }, { name: "address", label: "Address", type: "textarea" }, { name: "notes", label: "Notes", type: "textarea" }]}
      onSubmit={async (v) => { await api(s ? `/suppliers/${s.id}` : "/suppliers", { method: s ? "PATCH" : "POST", body: clean(v) }); onSaved(); }} />
  );
}

type PoRow = { material_id: string; quantity: string; unit_price: string; tax_rate: string };
function POForm({ target, suppliers, materials, onClose, onSaved }: { target: PO | "new" | null; suppliers: Supplier[]; materials: Mat[]; onClose: () => void; onSaved: () => void }) {
  const po = target && target !== "new" ? target : null;
  const [seed, setSeed] = useState<unknown>(null);
  const [supplier, setSupplier] = useState("");
  const [number, setNumber] = useState("");
  const [date, setDate] = useState(todayInput());
  const [rows, setRows] = useState<PoRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const key = target === null ? null : po?.id ?? "new";
  if (key !== seed) {
    setSeed(key);
    setError(null);
    if (key !== null) {
      setSupplier(po?.supplier_id ?? suppliers[0]?.id ?? "");
      setNumber(po?.po_number ?? "");
      setDate(po?.order_date ?? todayInput());
      setRows(po ? po.purchase_order_items.map((i) => ({ material_id: i.material_id, quantity: String(i.quantity), unit_price: String(i.unit_price), tax_rate: String(i.tax_rate) })) : [{ material_id: materials[0]?.id ?? "", quantity: "", unit_price: "", tax_rate: "0" }]);
    }
  }
  const upd = (i: number, p: Partial<PoRow>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const total = rows.reduce((t, r) => t + Number(r.quantity || 0) * Number(r.unit_price || 0) * (1 + Number(r.tax_rate || 0) / 100), 0);
  return (
    <Modal open={target !== null} onClose={onClose} wide title={po ? `Edit ${po.po_number}` : "New purchase order"}>
      <form className="flex flex-col gap-3" noValidate onSubmit={async (e) => {
        e.preventDefault(); setBusy(true); setError(null);
        try { await api(po ? `/purchase-orders/${po.id}` : "/purchase-orders", { method: po ? "PATCH" : "POST", body: { supplier_id: supplier, po_number: number, order_date: date, status: "ordered", items: rows.map((r) => ({ ...r, quantity: r.quantity, unit_price: r.unit_price, tax_rate: Number(r.tax_rate || 0) })) } }); onSaved(); }
        catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
      }}>
        {error && <Notice tone="negative">{error}</Notice>}
        {suppliers.length === 0 && <Notice tone="warning">Add a supplier first (Suppliers tab).</Notice>}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Supplier" htmlFor="po-s" required><Select id="po-s" value={supplier} onChange={(e) => setSupplier(e.target.value)}>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
          <Field label="PO number" htmlFor="po-n" required hint="Your own reference, e.g. PO-2026-001"><Input id="po-n" value={number} onChange={(e) => setNumber(e.target.value)} /></Field>
          <Field label="Order date" htmlFor="po-d" required><Input id="po-d" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        </div>
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-2 items-end gap-2 sm:grid-cols-12">
            <div className="col-span-2 sm:col-span-5"><Field label="Material" htmlFor={`pm-${i}`}><Select id={`pm-${i}`} value={r.material_id} onChange={(e) => upd(i, { material_id: e.target.value })}>{materials.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}</Select></Field></div>
            <div className="sm:col-span-2"><Field label="Qty" htmlFor={`pq-${i}`}><Input id={`pq-${i}`} inputMode="decimal" value={r.quantity} onChange={(e) => upd(i, { quantity: e.target.value })} /></Field></div>
            <div className="sm:col-span-2"><Field label="Price ₹" htmlFor={`pp-${i}`}><Input id={`pp-${i}`} inputMode="decimal" value={r.unit_price} onChange={(e) => upd(i, { unit_price: e.target.value })} /></Field></div>
            <div className="sm:col-span-2"><Field label="GST %" htmlFor={`pt-${i}`}><Input id={`pt-${i}`} inputMode="decimal" value={r.tax_rate} onChange={(e) => upd(i, { tax_rate: e.target.value })} /></Field></div>
            <button type="button" aria-label="Remove line" onClick={() => setRows((x) => x.filter((_, j) => j !== i))} className="justify-self-end rounded p-2 text-zinc-500 hover:text-rose-400 sm:col-span-1"><Trash2 className="h-4 w-4" aria-hidden /></button>
          </div>
        ))}
        <div className="flex items-center justify-between"><Button size="sm" onClick={() => setRows((r) => [...r, { material_id: materials[0]?.id ?? "", quantity: "", unit_price: "", tax_rate: "0" }])}><Plus className="h-3.5 w-3.5" aria-hidden /> Add line</Button><span className="text-sm text-zinc-300">Total (incl. GST): <Amt v={total.toFixed(2)} /></span></div>
        <div className="flex justify-end gap-2 border-t border-zinc-800 pt-3"><Button onClick={onClose}>Cancel</Button><Button type="submit" variant="primary" loading={busy} disabled={!supplier}>Save</Button></div>
      </form>
    </Modal>
  );
}

function POActionForm({ ctx, onClose, onDone }: { ctx: { po: PO; action: "receive" | "pay" } | null; onClose: () => void; onDone: (m: string) => void }) {
  const receive = ctx?.action === "receive";
  return (
    <FormModal open={ctx !== null} onClose={onClose} title={receive ? `Receive ${ctx?.po.po_number}` : `Mark ${ctx?.po.po_number} paid`}
      description={receive ? "Adds the items to stock at cost. Does not record a payment." : "Records one cash outflow for the full amount. It is not also counted as an expense."}
      initial={{ date: todayInput(), update_material_costs: true, method: "bank_transfer", reference: "" }}
      fields={receive ? [{ name: "date", label: "Received on", type: "date", required: true }, { name: "update_material_costs", label: "Update material prices from this order", type: "checkbox" }]
        : [{ name: "date", label: "Paid on", type: "date", required: true }, { name: "method", label: "Method", type: "select", options: [["cash", "Cash"], ["upi", "UPI"], ["bank_transfer", "Bank transfer"], ["card", "Card"], ["cheque", "Cheque"], ["other", "Other"]].map(([value, label]) => ({ value, label })) }, { name: "reference", label: "Reference", wide: true }]}
      onSubmit={async (v) => {
        const body = receive ? { action: "receive", received_on: v.date, update_material_costs: Boolean(v.update_material_costs) } : { action: "pay", paid_on: v.date, method: v.method, reference: v.reference || null };
        await api(`/purchase-orders/${ctx!.po.id}`, { method: "POST", body });
        onDone(receive ? "Received into stock." : "Payment recorded.");
      }} />
  );
}
