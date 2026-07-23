"use client";

// Customer-mode editor (FR-EDT / FR-MAT): pick photos → auto-placed on the
// design live, entirely client-side. On top of the "magic moment" it now offers
// a generic customization layer that works for ANY template:
//   • rearrange photos between slots       • round photo corners
//   • pick a date of birth (drives calendars, moves the heart)
//   • reposition any element (edit-layout) • reset positions
//   • recolour text, accents, the calendar, photo frames and the background
//   • resize to another print size         • export a max-quality print file
import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type Konva from "konva";
import type { TemplateDoc, PhotoSlotLayer } from "@/lib/template/schema";
import { products } from "@/lib/template/products";
import { scaleTemplateDoc } from "@/lib/template/scale";
import {
  accentLayers,
  applyAdjustments,
  calendarColorDefaults,
  CALENDAR_COLOR_ROLES,
  ORDER_ID_CORNERS,
  defaultAdjustments,
  DEFAULT_CROP,
  FONT_CHOICES,
  maxPhotoCornerRadius,
  photoBorderDefault,
  resizableFieldKeys,
  textColorDefaults,
  textFontDefaults,
  type Adjustments,
  type CalendarColorRole,
  type LayerOffset,
  type PhotoCrop,
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

// `<input type="color">` only accepts #rrggbb, so expand the 3-digit form.
function toHex6(color: string) {
  const short = /^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/.exec(color);
  return short ? `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}` : color;
}

function ColorSwatch({
  label,
  value,
  onChange,
  modified,
  onReset,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
  modified: boolean;
  onReset: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="min-w-0 flex-1 truncate text-xs text-zinc-400">{label}</span>
      {modified && (
        <button
          type="button"
          onClick={onReset}
          title={`Reset ${label}`}
          className="text-xs text-zinc-500 underline underline-offset-2 hover:text-zinc-200"
        >
          Reset
        </button>
      )}
      <input
        type="color"
        aria-label={label}
        value={toHex6(value)}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 w-10 shrink-0 cursor-pointer rounded border border-zinc-700 bg-zinc-950 p-0.5"
      />
    </div>
  );
}

function Panel({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
      <p className="text-sm font-medium text-zinc-200">{title}</p>
      {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
      <div className="mt-3 flex flex-col gap-2.5">{children}</div>
    </div>
  );
}

export default function TemplateWorkspace({ doc, productId }: Props) {
  const [fieldValues, setFieldValues] = useState(() => defaultFieldValues(doc));
  const [photoUrls, setPhotoUrls] = useState<Partial<Record<string, string>>>({});
  const [photoCount, setPhotoCount] = useState(0);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [productSizeId, setProductSizeId] = useState(productId);
  const [adjustments, setAdjustments] = useState<Adjustments>(() => defaultAdjustments(doc));
  const [editMode, setEditMode] = useState(false);
  const [photoAdjust, setPhotoAdjust] = useState(false);
  const [cropSlotId, setCropSlotId] = useState<string | null>(null);
  const [exporting, setExporting] = useState<"png" | "pdf" | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const objectUrlsRef = useRef<string[]>([]);
  const stageRef = useRef<Konva.Stage | null>(null);
  const previewBoxRef = useRef<HTMLDivElement | null>(null);
  const [previewWidth, setPreviewWidth] = useState(480);

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

  // The template's own colours — used as the "unmodified" baseline every colour
  // control opens on and resets back to.
  const baseTextColors = useMemo(() => textColorDefaults(doc), [doc]);
  const baseTextFonts = useMemo(() => textFontDefaults(doc), [doc]);
  const accents = useMemo(() => accentLayers(doc), [doc]);
  const baseCalendarColors = useMemo(() => calendarColorDefaults(doc), [doc]);
  const baseBorder = useMemo(() => photoBorderDefault(doc), [doc]);
  const activeBorder = adjustments.photoBorder ?? baseBorder;

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  // Keep the stage exactly as wide as its container.
  useEffect(() => {
    const el = previewBoxRef.current;
    if (!el) return;
    const measure = () => setPreviewWidth(Math.max(1, Math.floor(el.getBoundingClientRect().width)));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
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

  // --- photo fit (zoom/pan inside the frame) ---
  function cropFor(slotId: string): PhotoCrop {
    return adjustments.photoCrops[slotId] ?? DEFAULT_CROP;
  }

  function setCrop(slotId: string, next: Partial<PhotoCrop>) {
    setAdjustments((a) => {
      const current = a.photoCrops[slotId] ?? DEFAULT_CROP;
      return { ...a, photoCrops: { ...a.photoCrops, [slotId]: { ...current, ...next } } };
    });
  }

  function setCropScale(slotId: string, scale: number) {
    setCrop(slotId, { scale });
  }

  function handlePhotoCropChange(slotId: string, offsetX: number, offsetY: number) {
    setCrop(slotId, { offsetX, offsetY });
  }

  function resetCrop(slotId: string) {
    setAdjustments((a) => {
      const next = { ...a.photoCrops };
      delete next[slotId];
      return { ...a, photoCrops: next };
    });
  }

  function setDOBFromInput(value: string) {
    const [y, m, d] = value.split("-").map((n) => Number.parseInt(n, 10));
    if (!y || !m || !d) return;
    setAdjustments((a) => ({ ...a, dob: { year: y, month: m, day: d } }));
  }

  function setTextScale(fieldKey: string, value: number) {
    setAdjustments((a) => ({ ...a, textScale: { ...a.textScale, [fieldKey]: value } }));
  }

  // Colour setters. Each stores an override keyed by field/layer/role; clearing
  // one deletes the key so the template's authored colour shows through again.
  function setTextColor(fieldKey: string, hex: string | null) {
    setAdjustments((a) => {
      const next = { ...a.textColors };
      if (hex === null) delete next[fieldKey];
      else next[fieldKey] = hex;
      return { ...a, textColors: next };
    });
  }

  function setTextFont(fieldKey: string, family: string | null) {
    setAdjustments((a) => {
      const next = { ...a.textFonts };
      if (family === null) delete next[fieldKey];
      else next[fieldKey] = family;
      return { ...a, textFonts: next };
    });
  }

  function setAccentColor(layerId: string, hex: string | null) {
    setAdjustments((a) => {
      const next = { ...a.accentColors };
      if (hex === null) delete next[layerId];
      else next[layerId] = hex;
      return { ...a, accentColors: next };
    });
  }

  function setCalendarColor(role: CalendarColorRole, hex: string | null) {
    setAdjustments((a) => {
      const next = { ...a.calendarColors };
      if (hex === null) delete next[role];
      else next[role] = hex;
      return { ...a, calendarColors: next };
    });
  }

  function setBorder(patch: Partial<{ width: number; color: string }>) {
    setAdjustments((a) => {
      const current = a.photoBorder ?? baseBorder;
      if (!current) return a;
      return { ...a, photoBorder: { ...current, ...patch } };
    });
  }

  function resetColors() {
    setAdjustments((a) => ({
      ...a,
      textColors: {},
      accentColors: {},
      calendarColors: {},
      photoBorder: null,
      background: null,
    }));
  }

  const colorsModified =
    Object.keys(adjustments.textColors).length > 0 ||
    Object.keys(adjustments.accentColors).length > 0 ||
    Object.keys(adjustments.calendarColors).length > 0 ||
    adjustments.photoBorder !== null ||
    adjustments.background !== null;

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
                  <>
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
                    <div className="mt-2 flex items-center gap-2">
                      <span className="w-8 shrink-0 text-xs text-zinc-500">Font</span>
                      <select
                        aria-label={`${field.label} font`}
                        value={adjustments.textFonts[field.key] ?? baseTextFonts[field.key] ?? "Inter"}
                        onChange={(e) => setTextFont(field.key, e.target.value)}
                        className="min-w-0 flex-1 rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-100 outline-none focus:border-zinc-400"
                      >
                        {FONT_CHOICES.map((f) => (
                          <option key={f.value} value={f.value}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                      {field.key in adjustments.textFonts && (
                        <button
                          type="button"
                          onClick={() => setTextFont(field.key, null)}
                          className="shrink-0 text-xs text-zinc-500 underline underline-offset-2 hover:text-zinc-200"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                    <div className="mt-1.5">
                      <ColorSwatch
                        label="Colour"
                        value={adjustments.textColors[field.key] ?? baseTextColors[field.key] ?? "#FFFFFF"}
                        modified={field.key in adjustments.textColors}
                        onChange={(hex) => setTextColor(field.key, hex)}
                        onReset={() => setTextColor(field.key, null)}
                      />
                    </div>
                  </>
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

        {photoSlots.length > 0 && photoCount > 0 && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-zinc-200">Fit photos</label>
              <button
                onClick={() => {
                  setPhotoAdjust((v) => !v);
                  if (!photoAdjust) setEditMode(false);
                }}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  photoAdjust
                    ? "bg-amber-400 text-zinc-900"
                    : "border border-zinc-600 text-zinc-200 hover:border-zinc-400"
                }`}
              >
                {photoAdjust ? "On" : "Off"}
              </button>
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              {photoAdjust
                ? "Drag a photo on the preview to move it inside its frame, then zoom below."
                : "Turn on to drag each photo into place inside its frame (e.g. to centre a face)."}
            </p>

            <div className="mt-3 grid grid-cols-4 gap-2">
              {photoSlots.map((slot, i) => {
                const url = photoUrls[slot.id];
                const active = cropSlotId === slot.id;
                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => setCropSlotId(active ? null : slot.id)}
                    className={`relative flex aspect-square items-center justify-center overflow-hidden rounded-md border text-xs text-zinc-500 ${
                      active ? "border-amber-400 ring-2 ring-amber-400/60" : "border-zinc-700 hover:border-zinc-500"
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

            {cropSlotId && (
              <div className="mt-3 border-t border-zinc-800 pt-3">
                <div className="flex items-center gap-2">
                  <span className="w-10 text-xs text-zinc-500">Zoom</span>
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.05}
                    value={cropFor(cropSlotId).scale}
                    onChange={(e) => setCropScale(cropSlotId, Number(e.target.value))}
                    className="flex-1 accent-zinc-200"
                  />
                  <span className="w-9 text-right text-xs text-zinc-500">
                    {Math.round(cropFor(cropSlotId).scale * 100)}%
                  </span>
                </div>
                <button
                  onClick={() => resetCrop(cropSlotId)}
                  className="mt-2 text-xs text-zinc-300 underline underline-offset-2 hover:text-white"
                >
                  Reset this photo
                </button>
              </div>
            )}
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

        {activeBorder && (
          <Panel title="Photo frames" hint="Restyles the white border around the collage photos.">
            <div className="flex items-center gap-2">
              <span className="w-10 text-xs text-zinc-500">Width</span>
              <input
                type="range"
                min={0}
                max={120}
                step={1}
                value={activeBorder.width}
                onChange={(e) => setBorder({ width: Number(e.target.value) })}
                className="flex-1 accent-zinc-200"
              />
              <span className="w-9 text-right text-xs text-zinc-500">{Math.round(activeBorder.width)}</span>
            </div>
            <ColorSwatch
              label="Frame colour"
              value={activeBorder.color}
              modified={adjustments.photoBorder !== null}
              onChange={(hex) => setBorder({ color: hex })}
              onReset={() => setAdjustments((a) => ({ ...a, photoBorder: null }))}
            />
          </Panel>
        )}

        {hasCalendar && (
          <Panel title="Calendar colours" hint="Each part of the calendar can be recoloured on its own.">
            {CALENDAR_COLOR_ROLES.filter((r) => baseCalendarColors[r.role]).map(({ role, label }) => (
              <ColorSwatch
                key={role}
                label={label}
                value={adjustments.calendarColors[role] ?? baseCalendarColors[role] ?? "#FFFFFF"}
                modified={role in adjustments.calendarColors}
                onChange={(hex) => setCalendarColor(role, hex)}
                onReset={() => setCalendarColor(role, null)}
              />
            ))}
          </Panel>
        )}

        <Panel title="Colours" hint="The page background and every decorative element.">
          <ColorSwatch
            label="Background"
            value={adjustments.background ?? doc.canvas.background}
            modified={adjustments.background !== null}
            onChange={(hex) => setAdjustments((a) => ({ ...a, background: hex }))}
            onReset={() => setAdjustments((a) => ({ ...a, background: null }))}
          />
          {accents.map((accent) => (
            <ColorSwatch
              key={accent.id}
              label={accent.label}
              value={adjustments.accentColors[accent.id] ?? accent.color}
              modified={accent.id in adjustments.accentColors}
              onChange={(hex) => setAccentColor(accent.id, hex)}
              onReset={() => setAccentColor(accent.id, null)}
            />
          ))}
          {colorsModified && (
            <button
              onClick={resetColors}
              className="mt-1 self-start text-xs text-zinc-300 underline underline-offset-2 hover:text-white"
            >
              Reset all colours
            </button>
          )}
        </Panel>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-zinc-200">Move elements</label>
            <button
              onClick={() => {
                setEditMode((v) => !v);
                if (!editMode) setPhotoAdjust(false);
              }}
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
          <label className="block text-sm font-medium text-zinc-200">Order ID</label>
          <p className="mt-1 text-xs text-zinc-500">
            Prints a tiny reference (e.g. a Meesho order ID) in a corner so you can match each printed
            sheet to its order. Leave blank to hide it.
          </p>
          <input
            type="text"
            value={adjustments.orderId}
            placeholder="e.g. 1234567890_1"
            onChange={(e) => setAdjustments((a) => ({ ...a, orderId: e.target.value }))}
            className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-400"
          />
          {adjustments.orderId.trim() !== "" && (
            <>
              <div className="mt-2 flex items-center gap-2">
                <span className="w-14 shrink-0 text-xs text-zinc-500">Corner</span>
                <select
                  aria-label="Order ID corner"
                  value={adjustments.orderIdCorner}
                  onChange={(e) =>
                    setAdjustments((a) => ({ ...a, orderIdCorner: e.target.value as typeof a.orderIdCorner }))
                  }
                  className="min-w-0 flex-1 rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-100 outline-none focus:border-zinc-400"
                >
                  {ORDER_ID_CORNERS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="w-14 shrink-0 text-xs text-zinc-500">Colour</span>
                <select
                  aria-label="Order ID colour mode"
                  value={adjustments.orderIdColor === "auto" ? "auto" : "custom"}
                  onChange={(e) =>
                    setAdjustments((a) => ({
                      ...a,
                      orderIdColor: e.target.value === "auto" ? "auto" : "#FF0000",
                    }))
                  }
                  className="min-w-0 flex-1 rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-100 outline-none focus:border-zinc-400"
                >
                  <option value="auto">Auto (contrast)</option>
                  <option value="custom">Custom…</option>
                </select>
                {adjustments.orderIdColor !== "auto" && (
                  <input
                    type="color"
                    aria-label="Order ID colour"
                    value={toHex6(adjustments.orderIdColor)}
                    onChange={(e) => setAdjustments((a) => ({ ...a, orderIdColor: e.target.value }))}
                    className="h-7 w-10 shrink-0 cursor-pointer rounded border border-zinc-700 bg-zinc-950 p-0.5"
                  />
                )}
              </div>
            </>
          )}
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

      {/* The preview follows you down the long tools column. `self-start` is
          required: a grid item stretches to the row height by default, which
          leaves sticky nothing to travel within. */}
      <div className="order-1 flex flex-col items-center gap-2 lg:sticky lg:top-6 lg:order-2 lg:self-start">
        {/* The stage is a fixed-size canvas, so its width is measured from this
            box rather than assumed — otherwise it overflows narrow screens
            (FR-EDT-7: usable at 360px). Export is unaffected: it re-rasterizes
            at full print resolution regardless of preview size. */}
        <div
          ref={previewBoxRef}
          className={`w-full max-w-[480px] overflow-hidden rounded-lg ${
            editMode ? "ring-2 ring-amber-400/70" : ""
          }`}
        >
          <TemplateCanvas
            doc={renderDoc}
            fieldValues={fieldValues}
            photoUrls={photoUrls}
            displayWidth={previewWidth}
            stageRef={stageRef}
            editable={editMode}
            layerOffsets={renderOffsets}
            onLayerDrag={handleLayerDrag}
            photoAdjust={photoAdjust}
            onPhotoCropChange={handlePhotoCropChange}
            orderId={adjustments.orderId}
            orderIdCorner={adjustments.orderIdCorner}
            orderIdColor={adjustments.orderIdColor}
          />
        </div>
        {editMode && <p className="text-xs text-amber-300/80">Drag elements to reposition · changes are saved live</p>}
        {photoAdjust && (
          <p className="text-xs text-amber-300/80">Drag a photo to move it inside its frame · changes are saved live</p>
        )}
      </div>
    </div>
  );
}
