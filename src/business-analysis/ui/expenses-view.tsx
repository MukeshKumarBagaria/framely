"use client";

import { useEffect, useState } from "react";
import { Paperclip, Plus, Repeat, Search, Tag } from "lucide-react";
import { formatDateIN } from "../domain/dates";
import { EXPENSE_TREATMENTS, EXPENSE_TREATMENT_LABELS, PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from "../domain/statuses";
import type { ExpenseRow } from "../server/services/expense-service";
import { ApiError, api, errorMessage } from "./api";
import { columnHelper, DataTable, type Column } from "./data-table";
import { Amt } from "./format";
import { FormModal, ReasonModal, todayInput, type Values } from "./forms";
import { Badge, Button, Field, Input, Notice, Select } from "./kit";
import { Modal, useToast } from "./overlay";
import { useUrlState } from "./use-url-state";

type Category = { id: string; name: string; slug: string; treatment: string; parent_id: string | null; is_system: boolean; is_active: boolean };
const h = columnHelper<ExpenseRow>();
const right = { align: "right" as const };

export function ExpensesView({ rows, total, page, pageSize, categories, canWrite, isTemplates }: { rows: ExpenseRow[]; total: number; page: number; pageSize: number; categories: Category[]; canWrite: boolean; isTemplates: boolean }) {
  const { params, set, refresh } = useUrlState();
  const toast = useToast();
  const [search, setSearch] = useState(params.get("search") ?? "");
  const [form, setForm] = useState<ExpenseRow | "new" | null>(null);
  const [reversing, setReversing] = useState<ExpenseRow | null>(null);
  const [catOpen, setCatOpen] = useState(false);
  const [detail, setDetail] = useState<ExpenseRow | null>(null);
  const done = (m: string) => { toast.notify("success", m); refresh(); };

  const columns = [
    h.accessor("expense_date", { header: "Date", cell: (c) => formatDateIN(c.getValue()) }),
    h.accessor("category_id", { id: "category", header: "Category", enableSorting: false, cell: (c) => c.row.original.expense_categories?.name ?? "—" }),
    h.accessor("vendor", { header: "Vendor", cell: (c) => c.getValue() ?? <span className="text-zinc-600">—</span> }),
    h.accessor("amount", { header: "Amount", meta: right, cell: (c) => <Amt v={c.getValue()} className={c.row.original.status === "reversed" ? "line-through opacity-60" : undefined} /> }),
    h.accessor("tax_amount", { header: "GST in amount", enableSorting: false, meta: right, cell: (c) => (Number(c.getValue()) ? <Amt v={c.getValue()} /> : <span className="text-zinc-600">—</span>) }),
    h.accessor("payment_method", { header: "Paid via", enableSorting: false, cell: (c) => (c.getValue() ? PAYMENT_METHOD_LABELS[c.getValue() as keyof typeof PAYMENT_METHOD_LABELS] ?? c.getValue() : "—") }),
    h.accessor("payment_status", { header: "Status", enableSorting: false, cell: (c) => (
      <span className="flex flex-wrap gap-1">
        <Badge tone={c.getValue() === "paid" ? "positive" : "warning"}>{c.getValue()}</Badge>
        {c.row.original.status === "reversed" && <Badge tone="neutral">reversed</Badge>}
        {c.row.original.reflected_in_settlement && <Badge tone="info" title="Already deducted from a platform settlement; not counted as a second expense">in settlement</Badge>}
        {c.row.original.recurring_template_id && <Badge title="Generated from a recurring template"><Repeat className="h-3 w-3" aria-hidden /></Badge>}
      </span>
    ) }),
    h.accessor("reference_number", { header: "Reference", enableSorting: false, cell: (c) => c.getValue() ?? "" }),
    h.display({ id: "actions", header: "", cell: (c) => (
      <span className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
        {c.row.original.attachment_path && canWrite && <a href={`/api/business-analysis/expenses/receipts?path=${encodeURIComponent(c.row.original.attachment_path)}`} target="_blank" rel="noreferrer" aria-label="Open receipt" className="rounded p-1.5 text-zinc-400 hover:bg-zinc-800"><Paperclip className="h-3.5 w-3.5" aria-hidden /></a>}
        {canWrite && c.row.original.status === "active" && <><Button size="sm" variant="ghost" onClick={() => setForm(c.row.original)}>Edit</Button>{!c.row.original.is_recurring_template && <Button size="sm" variant="ghost" onClick={() => setReversing(c.row.original)}>Reverse</Button>}</>}
      </span>
    ) }),
  ] as unknown as Column<ExpenseRow>[];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-2 ba-surface rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
        <form className="flex flex-col gap-1 text-xs text-zinc-500" onSubmit={(e) => { e.preventDefault(); set({ search: search.trim() || null }); }}>
          <label htmlFor="ba-exp-search">Search vendor, reference, notes</label>
          <div className="flex gap-1.5"><Input id="ba-exp-search" value={search} onChange={(e) => setSearch(e.target.value)} className="w-56" /><Button type="submit" aria-label="Search"><Search className="h-4 w-4" aria-hidden /></Button></div>
        </form>
        <label className="flex flex-col gap-1 text-xs text-zinc-500">Category
          <Select aria-label="Category" value={params.get("category") ?? ""} onChange={(e) => set({ category: e.target.value || null })} className="w-44"><option value="">All categories</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></label>
        <label className="flex flex-col gap-1 text-xs text-zinc-500">Payment
          <Select aria-label="Payment status" value={params.get("paymentStatus") ?? ""} onChange={(e) => set({ paymentStatus: e.target.value || null })} className="w-32"><option value="">Any</option><option value="paid">Paid</option><option value="unpaid">Unpaid</option></Select></label>
        <label className="flex flex-col gap-1 text-xs text-zinc-500">Show
          <Select aria-label="Record type" value={isTemplates ? "templates" : ""} onChange={(e) => set({ recurring: e.target.value || null })} className="w-44"><option value="">Expense entries</option><option value="templates">Recurring templates</option></Select></label>
        <div className="ml-auto flex flex-wrap gap-2">
          {canWrite && <Button onClick={async () => { try { const r = await api<{ created: number }>("/expenses/recurring", { method: "POST", body: {} }); done(r.created ? `${r.created} recurring expense(s) created.` : "Nothing due; no duplicates were created."); } catch (e) { toast.notify("error", errorMessage(e)); } }}><Repeat className="h-4 w-4" aria-hidden /> Generate due</Button>}
          <Button onClick={() => setCatOpen(true)}><Tag className="h-4 w-4" aria-hidden /> Categories</Button>
          {canWrite && <Button variant="primary" onClick={() => setForm("new")}><Plus className="h-4 w-4" aria-hidden /> Add expense</Button>}
        </div>
      </div>
      <DataTable columns={columns} data={rows} total={total} page={page} pageSize={pageSize} caption="Expenses" getRowId={(r) => r.id}
        emptyTitle={isTemplates ? "No recurring templates" : "No expenses in this period"} emptyBody="Add expenses here, or import platform fee reports for deductions the marketplace already took." onRowClick={setDetail}
        rowClassName={(r) => (r.status === "reversed" ? "opacity-60" : undefined)} />
      <ExpenseForm target={form} categories={categories} onClose={() => setForm(null)} onSaved={(m) => { setForm(null); done(m); }} />
      <ReasonModal open={reversing !== null} onClose={() => setReversing(null)} title="Reverse this expense?" description="Expenses are never deleted. A reversal entry offsets it and both stay in the audit trail." confirmLabel="Reverse expense"
        extra={{ label: "Why", options: [{ value: "error", label: "Entered by mistake" }, { value: "refund", label: "Refunded by the vendor" }] }}
        onConfirm={async (reason, kind) => { await api(`/expenses/${reversing!.id}/reverse`, { method: "POST", body: { reason, kind } }); setReversing(null); done("Expense reversed."); }} />
      <CategoriesModal open={catOpen} categories={categories} canWrite={canWrite} onClose={() => setCatOpen(false)} onChanged={refresh} />
      <ExpenseDetail expense={detail} onClose={() => setDetail(null)} />
    </div>
  );
}

function ExpenseForm({ target, categories, onClose, onSaved }: { target: ExpenseRow | "new" | null; categories: Category[]; onClose: () => void; onSaved: (m: string) => void }) {
  const e = target && target !== "new" ? target : null;
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const initial: Values = {
    expense_date: e?.expense_date ?? todayInput(), category_id: e?.category_id ?? categories.find((c) => c.is_active)?.id ?? "", amount: e ? String(e.amount) : "", tax_amount: e ? String(e.tax_amount) : "0",
    tax_treatment: e?.tax_treatment ?? "none", vendor: e?.vendor ?? "", payment_status: e?.payment_status ?? "paid", payment_method: e?.payment_method ?? "upi", payment_date: e?.payment_date ?? todayInput(),
    reference_number: e?.reference_number ?? "", reflected: e ? (e.reflected_in_settlement ? "yes" : "no") : "", notes: e?.notes ?? "", repeat: e?.is_recurring_template ?? false,
    frequency: e?.recurrence?.frequency ?? "monthly", interval: String(e?.recurrence?.interval ?? 1), endDate: e?.recurrence?.endDate ?? "",
  };
  return (
    <FormModal open={target !== null} onClose={onClose} wide title={e ? "Edit expense" : "Add expense"} initial={initial}
      fields={[
        { name: "expense_date", label: "Expense date", type: "date", required: true, hint: "When the cost was incurred (separate from when you paid)" },
        { name: "category_id", label: "Category", type: "select", required: true, options: categories.filter((c) => c.is_active || c.id === e?.category_id).map((c) => ({ value: c.id, label: c.name })) },
        { name: "amount", label: "Amount incl. GST (₹)", type: "money", required: true }, { name: "vendor", label: "Vendor" },
        { name: "tax_treatment", label: "GST treatment", type: "select", options: [{ value: "none", label: "No GST" }, { value: "gst_itc_eligible", label: "GST — input credit claimable" }, { value: "gst_no_itc", label: "GST — no credit (part of cost)" }] },
        { name: "tax_amount", label: "GST included in amount (₹)", type: "money", when: (v) => v.tax_treatment !== "none" },
        { name: "payment_status", label: "Payment", type: "select", options: [{ value: "paid", label: "Paid" }, { value: "unpaid", label: "Not paid yet" }] },
        { name: "payment_method", label: "Paid via", type: "select", when: (v) => v.payment_status === "paid", options: PAYMENT_METHODS.map((m) => ({ value: m, label: PAYMENT_METHOD_LABELS[m] })) },
        { name: "payment_date", label: "Payment date", type: "date", when: (v) => v.payment_status === "paid" },
        { name: "reference_number", label: "Reference / invoice no." },
        { name: "reflected", label: "Already deducted from a Meesho settlement?", type: "select", required: true, wide: true, hint: "Choose “Yes” if the platform already took this from your payout (shipping, fees…) so it is not counted twice.",
          options: [{ value: "", label: "Choose…" }, { value: "no", label: "No — I paid this separately" }, { value: "yes", label: "Yes — already in a settlement" }] },
        { name: "notes", label: "Notes", type: "textarea" },
        { name: "repeat", label: "This repeats (make it a recurring template)", type: "checkbox" },
        { name: "frequency", label: "Repeats", type: "select", when: (v) => Boolean(v.repeat), options: [["weekly", "Weekly"], ["monthly", "Monthly"], ["quarterly", "Quarterly"], ["yearly", "Yearly"]].map(([value, label]) => ({ value, label })) },
        { name: "interval", label: "Every N periods", type: "number", min: 1, max: 12, when: (v) => Boolean(v.repeat) },
        { name: "endDate", label: "Ends on (optional)", type: "date", when: (v) => Boolean(v.repeat) },
      ]}
      footerExtra={progress ? <span className="mr-auto text-xs text-zinc-500">{progress}</span> : undefined}
      onSubmit={async (v) => {
        if (!v.reflected) throw new ApiError(400, "bad_request", "Some fields are invalid.", [{ path: "reflected", message: "Please choose Yes or No" }]);
        let attachment = e?.attachment_path ?? null;
        if (file) {
          setProgress("Uploading receipt…");
          const form = new FormData();
          form.set("file", file);
          attachment = (await api<{ path: string }>("/expenses/receipts", { method: "POST", form })).path;
          setProgress(null);
        }
        const paid = v.payment_status === "paid";
        const body = {
          expense_date: v.expense_date, category_id: v.category_id, amount: v.amount, tax_amount: v.tax_treatment === "none" ? "0" : v.tax_amount || "0", tax_treatment: v.tax_treatment,
          vendor: v.vendor || null, payment_status: v.payment_status, payment_method: paid ? v.payment_method : null, payment_date: paid ? v.payment_date : null,
          reference_number: v.reference_number || null, notes: v.notes || null, attachment_path: attachment, reflected_in_settlement: v.reflected === "yes",
          is_recurring_template: Boolean(v.repeat), recurrence: v.repeat ? { frequency: v.frequency, interval: Number(v.interval || 1), startDate: v.expense_date, endDate: v.endDate || null } : null,
        };
        await api(e ? `/expenses/${e.id}` : "/expenses", { method: e ? "PATCH" : "POST", body });
        setFile(null);
        onSaved(e ? "Expense updated." : "Expense added.");
      }}>
      {() => (
        <Field label="Receipt (PDF or image, optional)" htmlFor="ba-receipt" hint={e?.attachment_path ? "A receipt is already attached; choose a file to replace it." : "Stored privately; only accountants and admins can open it."}>
          <input id="ba-receipt" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(ev) => setFile(ev.target.files?.[0] ?? null)} className="text-sm text-zinc-300 file:mr-3 file:rounded-lg file:border file:border-zinc-700 file:bg-zinc-900 file:px-3 file:py-1.5 file:text-sm file:text-zinc-200" />
        </Field>
      )}
    </FormModal>
  );
}

function CategoriesModal({ open, categories, canWrite, onClose, onChanged }: { open: boolean; categories: Category[]; canWrite: boolean; onClose: () => void; onChanged: () => void }) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [treatment, setTreatment] = useState<string>(EXPENSE_TREATMENTS[0]);
  const [busy, setBusy] = useState(false);
  return (
    <Modal open={open} onClose={onClose} title="Expense categories" description="Each category has an accounting treatment that decides where it appears in the profit and loss.">
      <ul className="mb-4 max-h-72 divide-y divide-zinc-800 overflow-y-auto text-sm">
        {categories.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-2 py-1.5">
            <span className={c.is_active ? "text-zinc-200" : "text-zinc-500 line-through"}>{c.name} {c.is_system && <Badge>built-in</Badge>}</span>
            <span className="text-xs text-zinc-500">{EXPENSE_TREATMENT_LABELS[c.treatment as keyof typeof EXPENSE_TREATMENT_LABELS] ?? c.treatment}</span>
          </li>
        ))}
      </ul>
      {canWrite && (
        <form className="flex flex-wrap items-end gap-2 border-t border-zinc-800 pt-3" onSubmit={async (e) => {
          e.preventDefault(); setBusy(true);
          try { await api("/expense-categories", { method: "POST", body: { name, treatment, is_active: true } }); toast.notify("success", "Category added."); setName(""); onChanged(); }
          catch (err) { toast.notify("error", errorMessage(err)); } finally { setBusy(false); }
        }}>
          <Field label="New category" htmlFor="cat-name"><Input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} className="w-44" /></Field>
          <Field label="Treatment" htmlFor="cat-treat"><Select id="cat-treat" value={treatment} onChange={(e) => setTreatment(e.target.value)} className="w-56">{EXPENSE_TREATMENTS.map((t) => <option key={t} value={t}>{EXPENSE_TREATMENT_LABELS[t]}</option>)}</Select></Field>
          <Button type="submit" variant="primary" loading={busy} disabled={!name.trim()}>Add</Button>
        </form>
      )}
    </Modal>
  );
}

function ExpenseDetail({ expense, onClose }: { expense: ExpenseRow | null; onClose: () => void }) {
  return expense ? <ExpenseDetailBody key={expense.id} expense={expense} onClose={onClose} /> : null;
}

function ExpenseDetailBody({ expense, onClose }: { expense: ExpenseRow; onClose: () => void }) {
  const [data, setData] = useState<{ cash: { id: string; txn_date: string; direction: string; amount: number; voided_at: string | null }[]; audit: { id: number; action: string; created_at: string }[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const id = expense.id;
  useEffect(() => {
    const ctl = new AbortController();
    api<typeof data>(`/expenses/${id}`, { signal: ctl.signal }).then(setData).catch((e) => e.name !== "AbortError" && setError(errorMessage(e)));
    return () => ctl.abort();
  }, [id]);
  return (
    <Modal open onClose={onClose} title={`${expense.expense_categories?.name ?? "Expense"} · ${formatDateIN(expense.expense_date)}`} description={expense.vendor ?? undefined}>
      {expense && (
        <div className="flex flex-col gap-3 text-sm">
          <dl className="grid grid-cols-2 gap-2">
            <div><dt className="text-xs text-zinc-500">Amount</dt><dd><Amt v={expense.amount} /></dd></div>
            <div><dt className="text-xs text-zinc-500">Source</dt><dd className="text-zinc-300">{expense.source}</dd></div>
          </dl>
          {expense.notes && <p className="text-zinc-300">{expense.notes}</p>}
          {expense.reversal_reason && <Notice tone="warning">Reversed: {expense.reversal_reason}</Notice>}
          {error && <Notice tone="negative">{error}</Notice>}
          {data && (
            <>
              <section><h3 className="mb-1 font-semibold text-zinc-100">Cash movements</h3>{data.cash.length === 0 ? <p className="text-xs text-zinc-500">Not paid yet, or paid via a platform deduction — no cash entry.</p> : <ul className="text-[13px] text-zinc-300">{data.cash.map((c) => <li key={c.id} className={c.voided_at ? "line-through opacity-60" : ""}>{formatDateIN(c.txn_date)} · {c.direction === "out" ? "out" : "in"} · <Amt v={c.amount} /></li>)}</ul>}</section>
              {data.audit.length > 0 && <section><h3 className="mb-1 font-semibold text-zinc-100">Audit trail</h3><ul className="text-[13px] text-zinc-400">{data.audit.map((a) => <li key={a.id}>{new Date(a.created_at).toLocaleString("en-IN")} · {a.action}</li>)}</ul></section>}
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
