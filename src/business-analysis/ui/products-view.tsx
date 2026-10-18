"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { formatDateIN } from "../domain/dates";
import type { MaterialRow } from "../server/services/inventory-service";
import type { ProductRow, RecipeRow } from "../server/services/product-costing-service";
import { api, errorMessage } from "./api";
import { Amt } from "./format";
import { FormModal, clean, todayInput, type Values } from "./forms";
import { Badge, Button, Card, EmptyState, Field, Input, Notice, Select } from "./kit";
import { Modal, useToast } from "./overlay";

export type ProductWithCost = { product: ProductRow; recipes: RecipeRow[]; currentRecipe: RecipeRow | null; unitCost: { total: string; material: string; packaging: string; other: string; missingComponents: number } | null };
export type CostVersion = { id: string; material_id: string; effective_from: string; unit_cost: number; source: string; note: string | null };

const CATS = [["raw_material", "Raw material"], ["packaging", "Packaging"], ["printing", "Printing"], ["consumable", "Consumable"], ["other", "Other"]].map(([value, label]) => ({ value, label }));
const CHANNELS = [["meesho", "Meesho"], ["direct", "Direct"], ["whatsapp", "WhatsApp"], ["other", "Other"], ["all", "All channels"]].map(([value, label]) => ({ value, label }));

export function ProductsView({ products, materials, costVersions, canWrite }: { products: ProductWithCost[]; materials: MaterialRow[]; costVersions: CostVersion[]; canWrite: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<"products" | "materials">("products");
  const [productForm, setProductForm] = useState<ProductRow | "new" | null>(null);
  const [materialForm, setMaterialForm] = useState<MaterialRow | "new" | null>(null);
  const [priceFor, setPriceFor] = useState<MaterialRow | null>(null);
  const [recipeFor, setRecipeFor] = useState<ProductWithCost | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const done = (msg: string) => { toast.notify("success", msg); router.refresh(); };
  const latestCost = (id: string) => costVersions.find((c) => c.material_id === id);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="tablist" aria-label="Costing sections" className="flex gap-1 rounded-lg border border-zinc-800 bg-zinc-900/50 p-1">
          {(["products", "materials"] as const).map((t) => (
            <button key={t} role="tab" type="button" aria-selected={tab === t} onClick={() => setTab(t)} className={`rounded-md px-3 py-1.5 text-sm ${tab === t ? "bg-zinc-700 text-zinc-50" : "text-zinc-400 hover:text-zinc-200"}`}>
              {t === "products" ? `Products & recipes (${products.length})` : `Materials & prices (${materials.length})`}
            </button>
          ))}
        </div>
        {canWrite && (
          <div className="flex gap-2">
            <Button onClick={() => setRefreshing(true)}><RefreshCw className="h-4 w-4" aria-hidden /> Re-cost orders</Button>
            {tab === "products" ? <Button variant="primary" onClick={() => setProductForm("new")}><Plus className="h-4 w-4" aria-hidden /> Product</Button> : <Button variant="primary" onClick={() => setMaterialForm("new")}><Plus className="h-4 w-4" aria-hidden /> Material</Button>}
          </div>
        )}
      </div>
      <Notice tone="info">
        Costs below are <strong>standard (estimated)</strong> costs from recipes. Each order keeps the cost snapshot from the day it was costed, so changing a price never rewrites past profit. Record an actual cost on an order to override its estimate.
      </Notice>

      {tab === "products" && (
        products.length === 0 ? (
          <Card><EmptyState title="No products yet" action={canWrite ? <Button variant="primary" onClick={() => setProductForm("new")}>Add your first product</Button> : undefined}>Add each frame, set of two and set of three as its own product with its own recipe. Importing Meesho orders also creates products by SKU.</EmptyState></Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {products.map((p) => {
              const price = p.product.selling_price;
              const margin = price !== null && p.unitCost ? Number(price) - Number(p.unitCost.total) : null;
              return (
                <Card key={p.product.id} title={<span>{p.product.name} {p.product.status === "inactive" && <Badge>inactive</Badge>}</span>} subtitle={`${p.product.sku}${p.product.variant ? ` · ${p.product.variant}` : ""} · pack of ${p.product.pack_size}${p.product.dimensions ? ` · ${p.product.dimensions}` : ""}`}
                  actions={canWrite && <><Button size="sm" onClick={() => setProductForm(p.product)}>Edit</Button><Button size="sm" onClick={() => setRecipeFor(p)}>{p.currentRecipe ? "New recipe version" : "Add recipe"}</Button></>}>
                  <dl className="grid grid-cols-3 gap-3 text-sm">
                    <div><dt className="text-[11px] uppercase text-zinc-500">Selling price</dt><dd><Amt v={price} /></dd></div>
                    <div><dt className="text-[11px] uppercase text-zinc-500">Unit cost (est.)</dt><dd>{p.unitCost ? <Amt v={p.unitCost.total} /> : <span className="text-amber-400">no recipe</span>}</dd></div>
                    <div><dt className="text-[11px] uppercase text-zinc-500">Before GST/fees</dt><dd><Amt v={margin} signed /></dd></div>
                  </dl>
                  {p.unitCost && p.unitCost.missingComponents > 0 && <p className="mt-2 text-xs text-amber-400">{p.unitCost.missingComponents} component(s) have no price on file, so this cost is understated.</p>}
                  {p.currentRecipe ? (
                    <ul className="mt-3 space-y-0.5 text-[13px] text-zinc-300">
                      {p.currentRecipe.product_recipe_items.map((i) => (
                        <li key={i.id} className="flex justify-between gap-3">
                          <span>{materials.find((m) => m.id === i.material_id)?.name ?? i.description ?? "Component"} <span className="text-zinc-500">× {i.quantity} {i.unit}{Number(i.wastage_percent) ? ` +${i.wastage_percent}% waste` : ""}</span></span>
                          <span className="text-zinc-500">{i.component_type}</span>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="mt-3 text-xs text-zinc-500">No active recipe, so order costs for this product are shown as missing rather than guessed.</p>}
                  {p.recipes.length > 0 && (
                    <details className="mt-3 text-xs text-zinc-500">
                      <summary className="cursor-pointer text-zinc-400">Recipe history ({p.recipes.length})</summary>
                      <ul className="mt-1 space-y-1">
                        {p.recipes.map((r) => (
                          <li key={r.id} className="flex items-center justify-between gap-2">
                            <span>v{r.version} · from {formatDateIN(r.effective_from)} · {r.product_recipe_items.length} components</span>
                            <span className="flex items-center gap-2">
                              <Badge tone={r.status === "active" ? "positive" : "warning"}>{r.status}</Badge>
                              {canWrite && r.status === "draft" && <Button size="sm" onClick={async () => { try { await api(`/recipes/${r.id}`, { method: "PATCH", body: { action: "activate" } }); done("Recipe activated."); } catch (e) { toast.notify("error", errorMessage(e)); } }}>Activate</Button>}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </Card>
              );
            })}
          </div>
        )
      )}

      {tab === "materials" && (
        <Card>
          {materials.length === 0 ? <EmptyState title="No materials yet">Add frames, photo paper, boxes, foam and tape with their unit prices to cost your recipes.</EmptyState> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-max text-left text-[13px]">
                <thead className="text-[11px] uppercase text-zinc-400"><tr><th className="px-3 py-2">Material</th><th className="px-3 py-2">Category</th><th className="px-3 py-2">Unit</th><th className="px-3 py-2 text-right">Current price</th><th className="px-3 py-2">Since</th><th className="px-3 py-2 text-right">Reorder at</th><th /></tr></thead>
                <tbody>
                  {materials.map((m) => {
                    const c = latestCost(m.id);
                    return (
                      <tr key={m.id} className="border-t border-zinc-800/70">
                        <td className="px-3 py-2">{m.name} {!m.is_active && <Badge>inactive</Badge>}<div className="font-mono text-[11px] text-zinc-500">{m.sku}</div></td>
                        <td className="px-3 py-2 text-zinc-400">{CATS.find((x) => x.value === m.category)?.label}</td>
                        <td className="px-3 py-2">{m.unit}</td>
                        <td className="px-3 py-2 text-right">{c ? <Amt v={c.unit_cost} /> : <span className="text-amber-400">not set</span>}</td>
                        <td className="px-3 py-2 text-zinc-400">{c ? formatDateIN(c.effective_from) : "—"}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{Number(m.reorder_threshold).toLocaleString("en-IN")}</td>
                        <td className="px-3 py-2 text-right">{canWrite && <span className="flex justify-end gap-1"><Button size="sm" onClick={() => setPriceFor(m)}>New price</Button><Button size="sm" variant="ghost" onClick={() => setMaterialForm(m)}>Edit</Button></span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      <ProductForm target={productForm} onClose={() => setProductForm(null)} onSaved={(m) => { setProductForm(null); done(m); }} />
      <MaterialForm target={materialForm} onClose={() => setMaterialForm(null)} onSaved={(m) => { setMaterialForm(null); done(m); }} />
      <PriceForm material={priceFor} history={costVersions.filter((c) => c.material_id === priceFor?.id)} onClose={() => setPriceFor(null)} onSaved={() => { setPriceFor(null); done("Price saved. Past orders keep their old cost."); }} />
      <RecipeEditor product={recipeFor} materials={materials} onClose={() => setRecipeFor(null)} onSaved={(m) => { setRecipeFor(null); done(m); }} />
      <RefreshCosts open={refreshing} onClose={() => setRefreshing(false)} onDone={(m) => { setRefreshing(false); done(m); }} />
    </div>
  );
}

function ProductForm({ target, onClose, onSaved }: { target: ProductRow | "new" | null; onClose: () => void; onSaved: (m: string) => void }) {
  const p = target && target !== "new" ? target : null;
  const initial: Values = { name: p?.name ?? "", sku: p?.sku ?? "", variant: p?.variant ?? "", pack_size: String(p?.pack_size ?? 1), dimensions: p?.dimensions ?? "", channel: p?.channel ?? "meesho", selling_price: p?.selling_price != null ? String(p.selling_price) : "", gst_rate: p?.gst_rate != null ? String(p.gst_rate) : "", hsn_code: p?.hsn_code ?? "", status: p?.status ?? "active", notes: p?.notes ?? "" };
  return (
    <FormModal open={target !== null} onClose={onClose} title={p ? "Edit product" : "Add product"} initial={initial}
      fields={[
        { name: "name", label: "Product name", required: true }, { name: "sku", label: "SKU", required: true, hint: "Must match the SKU in Meesho reports" },
        { name: "variant", label: "Variant" }, { name: "pack_size", label: "Frames in pack", type: "select", options: [1, 2, 3, 4, 5, 6].map((n) => ({ value: String(n), label: n === 1 ? "Single frame" : `Set of ${n}` })) },
        { name: "dimensions", label: "Dimensions", placeholder: "e.g. 8x10 in" }, { name: "channel", label: "Sales channel", type: "select", options: CHANNELS },
        { name: "selling_price", label: "Selling price (₹)", type: "money" }, { name: "gst_rate", label: "GST rate (%)", type: "number", step: "0.5" },
        { name: "hsn_code", label: "HSN code" }, { name: "status", label: "Status", type: "select", options: [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }] },
        { name: "notes", label: "Notes", type: "textarea" },
      ]}
      onSubmit={async (v) => { await api(p ? `/products/${p.id}` : "/products", { method: p ? "PATCH" : "POST", body: clean(v, ["pack_size", "gst_rate"]) }); onSaved(p ? "Product updated." : "Product added."); }} />
  );
}

function MaterialForm({ target, onClose, onSaved }: { target: MaterialRow | "new" | null; onClose: () => void; onSaved: (m: string) => void }) {
  const m = target && target !== "new" ? target : null;
  const initial: Values = { name: m?.name ?? "", sku: m?.sku ?? "", category: m?.category ?? "raw_material", unit: m?.unit ?? "pcs", reorder_threshold: String(m?.reorder_threshold ?? "0"), is_active: m?.is_active ?? true, notes: m?.notes ?? "", initial_unit_cost: "", initial_cost_date: todayInput() };
  return (
    <FormModal open={target !== null} onClose={onClose} title={m ? "Edit material" : "Add material"} initial={initial}
      fields={[
        { name: "name", label: "Name", required: true }, { name: "sku", label: "SKU / code" },
        { name: "category", label: "Category", type: "select", options: CATS }, { name: "unit", label: "Unit", required: true, hint: "pcs, sheet, m, kg…" },
        { name: "reorder_threshold", label: "Reorder when stock falls to", type: "number" }, { name: "is_active", label: "Active", type: "checkbox" },
        { name: "initial_unit_cost", label: "Opening price per unit (₹)", type: "money", when: () => !m, hint: "Recorded as the first price version" },
        { name: "initial_cost_date", label: "Price effective from", type: "date", when: () => !m },
        { name: "notes", label: "Notes", type: "textarea" },
      ]}
      onSubmit={async (v) => { await api(m ? `/materials/${m.id}` : "/materials", { method: m ? "PATCH" : "POST", body: clean(v) }); onSaved(m ? "Material updated." : "Material added."); }} />
  );
}

function PriceForm({ material, history, onClose, onSaved }: { material: MaterialRow | null; history: CostVersion[]; onClose: () => void; onSaved: () => void }) {
  return (
    <FormModal open={material !== null} onClose={onClose} title={`New price · ${material?.name ?? ""}`} description={`Per ${material?.unit ?? "unit"}. Orders already costed keep their old snapshot.`}
      initial={{ effective_from: todayInput(), unit_cost: "", note: "" }}
      fields={[{ name: "effective_from", label: "Effective from", type: "date", required: true }, { name: "unit_cost", label: "Price per unit (₹)", type: "money", required: true }, { name: "note", label: "Note", wide: true }]}
      onSubmit={async (v) => { await api("/materials/costs", { method: "POST", body: { ...clean(v), material_id: material?.id } }); onSaved(); }}>
      {() => history.length > 0 ? (
        <div className="text-xs text-zinc-400"><p className="mb-1 font-medium text-zinc-300">Price history</p>
          <ul className="space-y-0.5">{history.slice(0, 6).map((h) => <li key={h.id}>{formatDateIN(h.effective_from)} — <Amt v={h.unit_cost} /> <span className="text-zinc-600">({h.source})</span></li>)}</ul></div>
      ) : null}
    </FormModal>
  );
}

type Row = { material_id: string; description: string; component_type: string; quantity: string; unit: string; wastage_percent: string; unit_cost_override: string };
const blankRow = (): Row => ({ material_id: "", description: "", component_type: "material", quantity: "1", unit: "pcs", wastage_percent: "0", unit_cost_override: "" });

function RecipeEditor({ product, materials, onClose, onSaved }: { product: ProductWithCost | null; materials: MaterialRow[]; onClose: () => void; onSaved: (m: string) => void }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [effective, setEffective] = useState(todayInput());
  const [notes, setNotes] = useState("");
  const [activate, setActivate] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seed, setSeed] = useState<string | null>(null);

  // Start from the current recipe so a new version is an edit, not a retype.
  if (product && seed !== product.product.id) {
    setSeed(product.product.id);
    setError(null);
    setEffective(todayInput());
    setNotes("");
    setRows(product.currentRecipe ? product.currentRecipe.product_recipe_items.map((i) => ({ material_id: i.material_id ?? "", description: i.description ?? "", component_type: i.component_type, quantity: String(i.quantity), unit: i.unit, wastage_percent: String(i.wastage_percent), unit_cost_override: i.unit_cost_override != null ? String(i.unit_cost_override) : "" })) : [blankRow()]);
  }
  if (!product && seed !== null) setSeed(null);

  const upd = (i: number, patch: Partial<Row>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const pick = (i: number, id: string) => { const m = materials.find((x) => x.id === id); upd(i, { material_id: id, unit: m?.unit ?? rows[i].unit, component_type: m?.category === "packaging" ? "packaging" : "material" }); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/recipes", { method: "POST", body: { product_id: product!.product.id, effective_from: effective, notes: notes || null, activate, items: rows.map((r) => ({ material_id: r.material_id || null, description: r.description || null, component_type: r.component_type, quantity: r.quantity, unit: r.unit, wastage_percent: Number(r.wastage_percent || 0), unit_cost_override: r.unit_cost_override || null })) } });
      onSaved(activate ? "Recipe saved and activated." : "Recipe saved as a draft.");
    } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };

  return (
    <Modal open={product !== null} onClose={onClose} wide title={`Recipe · ${product?.product.name ?? ""}`} description="Quantities are per finished product. A saved recipe is never edited; changes become a new version.">
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        {error && <Notice tone="negative">{error}</Notice>}
        <div className="flex flex-col gap-2">
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-2 items-end gap-2 rounded-lg border border-zinc-800 p-2 sm:grid-cols-12">
              <div className="col-span-2 sm:col-span-4"><Field label="Material" htmlFor={`rm-${i}`}>
                <Select id={`rm-${i}`} value={r.material_id} onChange={(e) => pick(i, e.target.value)}><option value="">Other (describe)…</option>{materials.filter((m) => m.is_active).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</Select></Field></div>
              {!r.material_id && <div className="col-span-2 sm:col-span-3"><Field label="Description" htmlFor={`rd-${i}`}><Input id={`rd-${i}`} value={r.description} onChange={(e) => upd(i, { description: e.target.value })} /></Field></div>}
              <div className="sm:col-span-2"><Field label="Qty / unit" htmlFor={`rq-${i}`}><Input id={`rq-${i}`} inputMode="decimal" value={r.quantity} onChange={(e) => upd(i, { quantity: e.target.value })} /></Field></div>
              <div className="sm:col-span-1"><Field label="Unit" htmlFor={`ru-${i}`}><Input id={`ru-${i}`} value={r.unit} onChange={(e) => upd(i, { unit: e.target.value })} /></Field></div>
              <div className="sm:col-span-2"><Field label="Wastage %" htmlFor={`rw-${i}`}><Input id={`rw-${i}`} inputMode="decimal" value={r.wastage_percent} onChange={(e) => upd(i, { wastage_percent: e.target.value })} /></Field></div>
              {!r.material_id && <div className="sm:col-span-2"><Field label="Cost/unit ₹" htmlFor={`rc-${i}`}><Input id={`rc-${i}`} inputMode="decimal" value={r.unit_cost_override} onChange={(e) => upd(i, { unit_cost_override: e.target.value })} /></Field></div>}
              <button type="button" aria-label="Remove component" onClick={() => setRows((x) => x.filter((_, j) => j !== i))} className="justify-self-end rounded p-2 text-zinc-500 hover:bg-zinc-800 hover:text-rose-400 sm:col-span-1"><Trash2 className="h-4 w-4" aria-hidden /></button>
            </div>
          ))}
          <div><Button size="sm" onClick={() => setRows((r) => [...r, blankRow()])}><Plus className="h-3.5 w-3.5" aria-hidden /> Add component</Button></div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Effective from" htmlFor="rec-date" required><Input id="rec-date" type="date" value={effective} onChange={(e) => setEffective(e.target.value)} /></Field>
          <Field label="Notes" htmlFor="rec-notes"><Input id="rec-notes" value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-zinc-200"><input type="checkbox" className="accent-zinc-200" checked={activate} onChange={(e) => setActivate(e.target.checked)} /> Activate immediately (otherwise saved as a draft)</label>
        <div className="flex justify-end gap-2 border-t border-zinc-800 pt-3"><Button onClick={onClose}>Cancel</Button><Button type="submit" variant="primary" loading={busy}>Save recipe</Button></div>
      </form>
    </Modal>
  );
}

function RefreshCosts({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: (m: string) => void }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState(todayInput());
  const [mode, setMode] = useState("missing_only");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Modal open={open} onClose={onClose} title="Re-cost orders" description="Applies the recipe in force on each order's date. Actual costs you recorded are never changed.">
      <form className="flex flex-col gap-3" onSubmit={async (e) => {
        e.preventDefault(); setBusy(true); setError(null);
        try { const r = await api<{ processed: number; estimated: number; remaining: number }>("/costs/refresh", { method: "POST", body: { from, to, mode, runStartedAt: new Date().toISOString() } }); onDone(`${r.estimated} of ${r.processed} order lines costed${r.remaining > 0 ? `; ${r.remaining} remain — run again` : ""}.`); }
        catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
      }}>
        {error && <Notice tone="negative">{error}</Notice>}
        <div className="grid grid-cols-2 gap-3">
          <Field label="From" htmlFor="rc-from" required><Input id="rc-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} required /></Field>
          <Field label="To" htmlFor="rc-to" required><Input id="rc-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} required /></Field>
        </div>
        <Field label="Which lines" htmlFor="rc-mode"><Select id="rc-mode" value={mode} onChange={(e) => setMode(e.target.value)}><option value="missing_only">Only lines with no cost yet</option><option value="all_estimates">All estimated lines (replaces old estimates)</option></Select></Field>
        <div className="flex justify-end gap-2"><Button onClick={onClose}>Cancel</Button><Button type="submit" variant="primary" loading={busy} disabled={!from || !to}>Re-cost</Button></div>
      </form>
    </Modal>
  );
}
