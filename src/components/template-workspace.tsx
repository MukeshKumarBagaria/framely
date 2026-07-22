"use client";

// Customer-mode editor (FR-EDT / FR-MAT): pick photos → auto-placed on the
// design live, entirely client-side. On top of the "magic moment" it now offers
// a generic customization layer that works for ANY template:
//   • rearrange photos between slots       • round photo corners
//   • pick a date of birth (drives calendars, moves the heart)
//   • reposition any element (edit-layout) • reset positions
//   • resize to another print size         • export a max-quality print file
import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type Konva from "konva";
import type { TemplateDoc, PhotoSlotLayer } from "@/lib/template/schema";
import { products } from "@/lib/template/products";
import { scaleTemplateDoc } from "@/lib/template/scale";
import {
  applyAdjustments,
  defaultAdjustments,
  maxPhotoCornerRadius,
  resizableFieldKeys,
  type Adjustments,
  type LayerOffset,
} from "@/lib/template/adjustments";
import { downloadPdf, downloadPng, slugifyFilename } from "@/lib/export/print-export";

const TemplateCanvas = dynamic(() => import("@/components/template-canvas"), {
  ssr: false,
  loading: () => (
    <div className="flex aspect-[2/3] w-full items-center justify-center rounded-lg bg-zinc-900 text-sm text-zinc-500">
      Loading canvas…
    </div>
  ),
});

type Props = {
  doc: TemplateDoc;
  productId: string;
};

function defaultFieldValues(doc: TemplateDoc) {
  return Object.fromEntries(doc.inputs.fields.map((f) => [f.key, f.default])) as Record<string, string>;
}

function assignPhotosToSlots(slots: PhotoSlotLayer[], photos: { url: string; area: number }[]) {
  const sortedSlots = [...slots].sort((a, b) => b.w * b.h - a.w * a.h);
  const sortedPhotos = [...photos].sort((a, b) => b.area - a.area);
  const assignment: Record<string, string> = {};
  sortedSlots.forEach((slot, i) => {
    if (sortedPhotos[i]) assignment[slot.id] = sortedPhotos[i].url;
  });
  return assignment;
}

function readImageMeta(file: File): Promise<{ url: string; area: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => resolve({ url, area: img.naturalWidth * img.naturalHeight });
    img.onerror = () => resolve({ url, area: 0 });
    img.src = url;
  });
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export default function TemplateWorkspace({ doc, productId }: Props) {
  const [fieldValues, setFieldValues] = useState(() => defaultFieldValues(doc));
  const [photoUrls, setPhotoUrls] = useState<Partial<Record<string, string>>>({});
  const [photoCount, setPhotoCount] = useState(0);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [productSizeId, setProductSizeId] = useState(productId);
  const [adjustments, setAdjustments] = useState<Adjustments>(() => defaultAdjustments(doc));
  const [editMode, setEditMode] = useState(false);
  const [exporting, setExporting] = useState<"png" | "pdf" | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const objectUrlsRef = useRef<string[]>([]);
  const stageRef = useRef<Konva.Stage | null>(null);

  const activeProduct = products[productSizeId] ?? products[productId];

  // Customizations are baked into the base doc first, then the result is scaled
  // to the chosen print size — so value edits and offsets both survive a resize.
  const renderDoc = useMemo(
    () => scaleTemplateDoc(applyAdjustments(doc, adjustments), activeProduct),
    [doc, adjustments, activeProduct]
  );

  // base-doc px → render px, so drag offsets map correctly across a resize.
  const sx = renderDoc.canvas.widthPx / doc.canvas.widthPx;
  const sy = renderDoc.canvas.heightPx / doc.canvas.heightPx;
  const renderOffsets = useMemo(() => {
    const out: Record<string, LayerOffset> = {};
    for (const [id, off] of Object.entries(adjustments.layerOffsets)) {
      out[id] = { dx: off.dx * sx, dy: off.dy * sy };
    }
    return out;
  }, [adjustments.layerOffsets, sx, sy]);

  const photoSlots = useMemo(
    () => doc.layers.filter((l): l is PhotoSlotLayer => l.type === "photoSlot"),
    [doc.layers]
  );
  const hasCalendar = useMemo(() => doc.layers.some((l) => l.type === "calendar"), [doc.layers]);
  const cornerMax = useMemo(() => maxPhotoCornerRadius(doc), [doc]);
  const resizableFields = useMemo(() => resizableFieldKeys(doc), [doc]);

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const picked = Array.from(files).slice(0, photoSlots.length);
    const withMeta = await Promise.all(picked.map(readImageMeta));
    objectUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    objectUrlsRef.current = withMeta.map((m) => m.url);
    setPhotoUrls(assignPhotosToSlots(photoSlots, withMeta));
    setPhotoCount(withMeta.length);
    setSelectedSlotId(null);
  }

  function clearPhotos() {
    objectUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    objectUrlsRef.current = [];
    setPhotoUrls({});
    setPhotoCount(0);
    setSelectedSlotId(null);
  }

  function swapSlots(slotA: string, slotB: string) {
    if (slotA === slotB) return;
    setPhotoUrls((prev) => {
      const next = { ...prev };
      const a = next[slotA];
      const b = next[slotB];
      if (b) next[slotA] = b;
      else delete next[slotA];
      if (a) next[slotB] = a;
      else delete next[slotB];
      return next;
    });
  }

  function handleChipClick(slotId: string) {
    if (selectedSlotId === null) {
      if (!photoUrls[slotId]) return;
      setSelectedSlotId(slotId);
      return;
    }
    if (selectedSlotId === slotId) {
      setSelectedSlotId(null);
      return;
    }
    swapSlots(selectedSlotId, slotId);
    setSelectedSlotId(null);
  }

  function handleDragStart(e: React.DragEvent, slotId: string) {
    if (!photoUrls[slotId]) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData("text/plain", slotId);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDrop(e: React.DragEvent, targetSlotId: string) {
    e.preventDefault();
    const sourceSlotId = e.dataTransfer.getData("text/plain");
    if (sourceSlotId) swapSlots(sourceSlotId, targetSlotId);
    setSelectedSlotId(null);
  }

  // Canvas reports the dropped position in render px; store it back in base px.
  function handleLayerDrag(layerId: string, rx: number, ry: number) {
    setAdjustments((a) => ({
      ...a,
      layerOffsets: { ...a.layerOffsets, [layerId]: { dx: rx / sx, dy: ry / sy } },
    }));
  }

  function resetPositions() {
    setAdjustments((a) => ({ ...a, layerOffsets: {} }));
  }

  function setDOBFromInput(value: string) {
    const [y, m, d] = value.split("-").map((n) => Number.parseInt(n, 10));
    if (!y || !m || !d) return;
    setAdjustments((a) => ({ ...a, dob: { year: y, month: m, day: d } }));
  }

  function setTextScale(fieldKey: string, value: number) {
    setAdjustments((a) => ({ ...a, textScale: { ...a.textScale, [fieldKey]: value } }));
  }

  async function handleExport(kind: "png" | "pdf") {
    const stage = stageRef.current;
    if (!stage) return;
    setExporting(kind);
    setExportError(null);
    try {
      const base = slugifyFilename(doc.meta.name) || "template";
      if (kind === "png") downloadPng(stage, renderDoc, `${base}.png`);
      else await downloadPdf(stage, renderDoc, `${base}.pdf`);
    } catch {
      setExportError("Export failed — try again.");
    } finally {
      setExporting(null);
    }
  }

  const dobValue = adjustments.dob
    ? `${adjustments.dob.year}-${pad2(adjustments.dob.month)}-${pad2(adjustments.dob.day)}`
    : "";

  return (
    <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
      <div className="flex flex-col gap-6 order-2 lg:order-1">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{activeProduct.name}</p>
          <h1 className="mt-1 text-2xl font-semibold text-zinc-50">{doc.meta.name}</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {photoSlots.length} photo slots · {doc.meta.occasion.join(", ")}
          </p>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
          <label className="block text-sm font-medium text-zinc-200">Add up to {photoSlots.length} photos</label>
          <p className="mt-1 text-xs text-zinc-500">
            Nothing leaves your browser — photos are placed on the design locally, just like the real
            upload-to-preview flow will work.
          </p>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => handleFiles(e.target.files)}
            className="mt-3 block w-full text-sm text-zinc-300 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-zinc-900 hover:file:bg-white"
          />
          <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
            <span>
              {photoCount} of {photoSlots.length} placed
            </span>
            {photoCount > 0 && (
              <button onClick={clearPhotos} className="text-zinc-300 underline underline-offset-2 hover:text-white">
                Clear
              </button>
            )}
          </div>

          {photoCount > 0 && (
            <div className="mt-4 border-t border-zinc-800 pt-3">
              <p className="text-xs font-medium text-zinc-300">
                Rearrange {selectedSlotId && <span className="text-zinc-500">— pick a slot to swap with</span>}
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">Tap two photos to swap them, or drag one onto another.</p>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {photoSlots.map((slot, i) => {
                  const url = photoUrls[slot.id];
                  const selected = selectedSlotId === slot.id;
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      draggable={!!url}
                      onDragStart={(e) => handleDragStart(e, slot.id)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleDrop(e, slot.id)}
                      onClick={() => handleChipClick(slot.id)}
                      className={`relative flex aspect-square items-center justify-center overflow-hidden rounded-md border text-xs text-zinc-500 ${
                        selected ? "border-amber-400 ring-2 ring-amber-400/60" : "border-zinc-700 hover:border-zinc-500"
                      }`}
                      style={
                        url
                          ? { backgroundImage: `url(${url})`, backgroundSize: "cover", backgroundPosition: "center" }
                          : undefined
                      }
                    >
                      {!url && String(i + 1).padStart(2, "0")}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {doc.inputs.fields.length > 0 && (
          <div className="flex flex-col gap-4 rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
            {doc.inputs.fields.map((field) => (
              <div key={field.key}>
                <label className="flex items-baseline justify-between text-sm font-medium text-zinc-200">
                  <span>
                    {field.label}
                    {field.required && <span className="text-amber-400"> *</span>}
                  </span>
                  <span className="text-xs font-normal text-zinc-500">
                    {fieldValues[field.key]?.length ?? 0}/{field.maxLen}
                  </span>
                </label>
                {field.maxLen > 60 ? (
                  <textarea
                    value={fieldValues[field.key] ?? ""}
                    maxLength={field.maxLen}
                    rows={4}
                    onChange={(e) => setFieldValues((v) => ({ ...v, [field.key]: e.target.value }))}
                    className="mt-1 w-full resize-none rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-400"
                  />
                ) : (
                  <input
                    type="text"
                    value={fieldValues[field.key] ?? ""}
                    maxLength={field.maxLen}
                    onChange={(e) => setFieldValues((v) => ({ ...v, [field.key]: e.target.value }))}
                    className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-400"
                  />
                )}
                {resizableFields.has(field.key) && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="w-8 text-xs text-zinc-500">Size</span>
                    <input
                      type="range"
                      min={0.6}
                      max={3}
                      step={0.05}
                      value={adjustments.textScale[field.key] ?? 1}
                      onChange={(e) => setTextScale(field.key, Number(e.target.value))}
                      className="flex-1 accent-zinc-200"
                    />
                    <span className="w-9 text-right text-xs text-zinc-500">
                      {Math.round((adjustments.textScale[field.key] ?? 1) * 100)}%
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {hasCalendar && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
            <label className="block text-sm font-medium text-zinc-200">Date of birth</label>
            <p className="mt-1 text-xs text-zinc-500">
              Sets the calendar month and marks the day with a heart.
            </p>
            <input
              type="date"
              value={dobValue}
              onChange={(e) => setDOBFromInput(e.target.value)}
              className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-400 [color-scheme:dark]"
            />
          </div>
        )}

        {photoSlots.length > 0 && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
            <label className="flex items-center justify-between text-sm font-medium text-zinc-200">
              <span>Photo corner radius</span>
              <span className="text-xs font-normal text-zinc-500">
                {Math.round((adjustments.photoCornerRadius / cornerMax) * 100) || 0}%
              </span>
            </label>
            <input
              type="range"
              min={0}
              max={cornerMax}
              step={Math.max(1, Math.round(cornerMax / 100))}
              value={adjustments.photoCornerRadius}
              onChange={(e) =>
                setAdjustments((a) => ({ ...a, photoCornerRadius: Number(e.target.value) }))
              }
              className="mt-3 w-full accent-zinc-200"
            />
          </div>
        )}

        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-zinc-200">Move elements</label>
            <button
              onClick={() => setEditMode((v) => !v)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                editMode ? "bg-amber-400 text-zinc-900" : "border border-zinc-600 text-zinc-200 hover:border-zinc-400"
              }`}
            >
              {editMode ? "On" : "Off"}
            </button>
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            {editMode
              ? "Drag any element on the preview to reposition it."
              : "Turn on to drag and fine-tune where elements sit."}
          </p>
          {Object.keys(adjustments.layerOffsets).length > 0 && (
            <button
              onClick={resetPositions}
              className="mt-3 text-xs text-zinc-300 underline underline-offset-2 hover:text-white"
            >
              Reset positions
            </button>
          )}
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
          <label className="block text-sm font-medium text-zinc-200">Resize</label>
          <select
            value={productSizeId}
            onChange={(e) => setProductSizeId(e.target.value)}
            className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-400"
          >
            {Object.values(products).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-zinc-500">
            {renderDoc.canvas.widthPx} × {renderDoc.canvas.heightPx}px · {renderDoc.canvas.dpi} DPI ·{" "}
            {activeProduct.widthMm.toFixed(0)}×{activeProduct.heightMm.toFixed(0)}mm
          </p>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
          <label className="block text-sm font-medium text-zinc-200">Download</label>
          <p className="mt-1 text-xs text-zinc-500">
            Full print resolution ({renderDoc.canvas.widthPx} × {renderDoc.canvas.heightPx}px at{" "}
            {renderDoc.canvas.dpi} DPI). PDF is sized to the exact physical print dimensions.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => handleExport("png")}
              disabled={exporting !== null}
              className="flex-1 rounded-md bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-white disabled:opacity-50"
            >
              {exporting === "png" ? "Exporting…" : "Download PNG"}
            </button>
            <button
              onClick={() => handleExport("pdf")}
              disabled={exporting !== null}
              className="flex-1 rounded-md border border-zinc-600 px-3 py-2 text-sm font-medium text-zinc-100 transition-colors hover:border-zinc-400 disabled:opacity-50"
            >
              {exporting === "pdf" ? "Exporting…" : "Download PDF"}
            </button>
          </div>
          {exportError && <p className="mt-2 text-xs text-red-400">{exportError}</p>}
        </div>
      </div>

      <div className="order-1 flex flex-col items-center gap-2 lg:order-2">
        <div
          className={`w-full max-w-md overflow-hidden rounded-lg ${
            editMode ? "ring-2 ring-amber-400/70" : ""
          }`}
        >
          <TemplateCanvas
            doc={renderDoc}
            fieldValues={fieldValues}
            photoUrls={photoUrls}
            displayWidth={480}
            stageRef={stageRef}
            editable={editMode}
            layerOffsets={renderOffsets}
            onLayerDrag={handleLayerDrag}
          />
        </div>
        {editMode && <p className="text-xs text-amber-300/80">Drag elements to reposition · changes are saved live</p>}
      </div>
    </div>
  );
}
