"use client";

// The shared render-core (Technical Plan §6): pure layout/draw logic for a
// template doc. This component is the browser half — the worker half (print
// renders) will back the exact same doc shape with Konva-on-Node + skia-canvas
// later. Keep layout math here free of anything client-only so it stays
// portable.
import { useEffect, useMemo, useRef, useState } from "react";
import type Konva from "konva";
import { Stage, Layer, Rect, Ellipse, Line, Text as KonvaText, Image as KonvaImage, Group } from "react-konva";
import type {
  TemplateDoc,
  ImageLayer,
  PhotoSlotLayer,
  TextLayer,
  ShapeLayer,
  CalendarLayer,
} from "@/lib/template/schema";
import { MONTH_NAMES, MONTH_NAMES_SHORT, type LayerOffset } from "@/lib/template/adjustments";

type Props = {
  doc: TemplateDoc;
  fieldValues: Record<string, string>;
  photoUrls?: Partial<Record<string, string>>;
  displayWidth: number;
  // Lets the caller reach into the live Konva stage — used for PNG/PDF
  // export, which needs to re-rasterize at full print resolution (§ export).
  stageRef?: React.RefObject<Konva.Stage | null>;
  // Live reposition support. Offsets are in this doc's (render) coordinate
  // space; when `editable`, every layer becomes draggable and reports its new
  // offset via onLayerDrag.
  editable?: boolean;
  layerOffsets?: Record<string, LayerOffset>;
  onLayerDrag?: (layerId: string, dx: number, dy: number) => void;
  // Photo-fit mode: drag a photo to reposition it *inside* its frame.
  photoAdjust?: boolean;
  onPhotoCropChange?: (slotId: string, offsetX: number, offsetY: number) => void;
  // Merchant-facing order reference, printed tiny in a corner (empty = hidden).
  orderId?: string;
  orderIdCorner?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  orderIdColor?: string; // "auto" (contrast the background) or a hex
};

// Perceived brightness of a hex colour (0 dark … 1 light).
function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(full.slice(0, 2), 16) || 0;
  const g = parseInt(full.slice(2, 4), 16) || 0;
  const b = parseInt(full.slice(4, 6), 16) || 0;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

// A tiny order tag drawn on top of everything. The glyphs carry a thin halo in
// the opposite colour, so the code stays readable even where it crosses a busy
// photo — not just over the flat page background. Size is relative to the
// canvas, so it stays "very small" at every print resolution.
function OrderIdBadge({
  text,
  corner,
  canvasW,
  canvasH,
  bgColor,
  color,
}: {
  text: string;
  corner: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  canvasW: number;
  canvasH: number;
  bgColor: string;
  color: string;
}) {
  const fill = color === "auto" ? (luminance(bgColor) < 0.5 ? "#FFFFFF" : "#111111") : color;
  const halo = luminance(fill) < 0.5 ? "#FFFFFF" : "#111111";

  const fontSize = Math.max(18, Math.round(canvasW * 0.012));
  const margin = Math.round(canvasW * 0.016);
  const boxW = Math.min(canvasW * 0.6, text.length * fontSize * 0.75 + fontSize);
  const boxH = fontSize * 1.4;

  const right = corner.endsWith("right");
  const bottom = corner.startsWith("bottom");
  const x = right ? canvasW - margin - boxW : margin;
  const y = bottom ? canvasH - margin - boxH : margin;

  return (
    <KonvaText
      x={x}
      y={y}
      width={boxW}
      height={boxH}
      text={text}
      align={right ? "right" : "left"}
      verticalAlign="middle"
      fontFamily="Inter"
      fontStyle="bold"
      fontSize={fontSize}
      fill={fill}
      stroke={halo}
      strokeWidth={Math.max(1, fontSize * 0.14)}
      fillAfterStrokeEnabled
      lineJoin="round"
      ellipsis
      wrap="none"
      listening={false}
    />
  );
}

const FONT_FAMILIES = ["Inter", "Playfair Display", "Great Vibes", "Pinyon Script"];

function useFontsReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    Promise.all(
      FONT_FAMILIES.flatMap((f) => [
        document.fonts.load(`400 32px "${f}"`),
        document.fonts.load(`700 32px "${f}"`),
        document.fonts.load(`800 32px "${f}"`),
        document.fonts.load(`italic 400 32px "${f}"`),
      ])
    )
      .catch(() => {
        // best-effort — canvas falls back to default fonts if a family fails to load
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return ready;
}

function konvaFontStyle(weight: number, italic: boolean) {
  const parts: string[] = [];
  if (italic) parts.push("italic");
  if (weight >= 600) parts.push("bold");
  return parts.join(" ") || "normal";
}

// Cover-fit baseline, then apply the slot's zoom/pan (PRD §7.1): `scale` shrinks
// the visible source window, offsetX/offsetY ∈ [-1,1] slide it within whatever
// room is left over (0 = centred, ±1 = flush to an edge).
function coverCrop(
  imgW: number,
  imgH: number,
  boxW: number,
  boxH: number,
  crop?: { scale: number; offsetX: number; offsetY: number }
) {
  const imgRatio = imgW / imgH;
  const boxRatio = boxW / boxH;
  const baseW = imgRatio > boxRatio ? imgH * boxRatio : imgW;
  const baseH = imgRatio > boxRatio ? imgH : imgW / boxRatio;

  const scale = Math.max(1, crop?.scale ?? 1);
  const width = baseW / scale;
  const height = baseH / scale;
  const maxX = (imgW - width) / 2;
  const maxY = (imgH - height) / 2;

  return {
    x: maxX * (1 + (crop?.offsetX ?? 0)),
    y: maxY * (1 + (crop?.offsetY ?? 0)),
    width,
    height,
  };
}

const clamp1 = (n: number) => Math.max(-1, Math.min(1, n));

function slotRadius(layer: PhotoSlotLayer) {
  if (layer.shape === "circle") return Math.min(layer.w, layer.h) / 2;
  if (layer.shape === "rounded" || layer.shape === "heart") return layer.cornerRadius ?? 24;
  return 0;
}

function PhotoSlotNode({
  layer,
  url,
  index,
  adjustable = false,
  onCropChange,
}: {
  layer: PhotoSlotLayer;
  url?: string;
  index: number;
  adjustable?: boolean;
  onCropChange?: (slotId: string, offsetX: number, offsetY: number) => void;
}) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const lastPointer = useRef<{ x: number; y: number } | null>(null);
  // Absolute (stage-space) position the node is pinned to while panning.
  const dragAnchor = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!url) {
      setImg(null);
      return;
    }
    const el = new window.Image();
    el.crossOrigin = "anonymous";
    el.onload = () => setImg(el);
    el.src = url;
    return () => {
      el.onload = null;
    };
  }, [url]);

  const radius = slotRadius(layer);

  if (img) {
    const cropRect = coverCrop(img.naturalWidth, img.naturalHeight, layer.w, layer.h, layer.crop);
    const canPan = adjustable && !!onCropChange;

    // Panning: the node itself must not move, so dragBoundFunc pins it and we
    // translate raw pointer movement into a crop offset instead.
    const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
      const stage = e.target.getStage();
      const p = stage?.getPointerPosition();
      if (!stage || !p) return;
      const prev = lastPointer.current;
      lastPointer.current = { x: p.x, y: p.y };
      if (!prev) return;

      // screen px → slot-local px (undo the stage zoom, then the slot rotation)
      const s = stage.scaleX() || 1;
      const dxStage = (p.x - prev.x) / s;
      const dyStage = (p.y - prev.y) / s;
      const rad = (layer.rotation * Math.PI) / 180;
      const dxLocal = dxStage * Math.cos(rad) + dyStage * Math.sin(rad);
      const dyLocal = -dxStage * Math.sin(rad) + dyStage * Math.cos(rad);

      // slot px → source px → normalized offset. Dragging the photo right must
      // reveal more of its left side, hence the negation.
      const maxX = (img.naturalWidth - cropRect.width) / 2;
      const maxY = (img.naturalHeight - cropRect.height) / 2;
      const dOffX = maxX > 0 ? -(dxLocal * (cropRect.width / layer.w)) / maxX : 0;
      const dOffY = maxY > 0 ? -(dyLocal * (cropRect.height / layer.h)) / maxY : 0;

      onCropChange!(
        layer.id,
        clamp1((layer.crop?.offsetX ?? 0) + dOffX),
        clamp1((layer.crop?.offsetY ?? 0) + dOffY)
      );
    };

    return (
      <KonvaImage
        image={img}
        x={layer.x}
        y={layer.y}
        width={layer.w}
        height={layer.h}
        crop={cropRect}
        cornerRadius={radius}
        stroke={layer.border?.color}
        strokeWidth={layer.border?.width}
        rotation={layer.rotation}
        opacity={layer.opacity}
        draggable={canPan}
        // Pin the node in place — the gesture edits the crop, it must never
        // move the frame. Falls back to the proposed position (never 0,0) so a
        // missing anchor can't fling the photo into the corner.
        dragBoundFunc={canPan ? (pos) => dragAnchor.current ?? pos : undefined}
        onDragStart={(e) => {
          lastPointer.current = e.target.getStage()?.getPointerPosition() ?? null;
          dragAnchor.current = e.target.absolutePosition();
        }}
        onDragMove={canPan ? handleDragMove : undefined}
        onDragEnd={(e) => {
          lastPointer.current = null;
          dragAnchor.current = null;
          // Konva mutates the node's own x/y while dragging; react-konva won't
          // restore them because the props never changed. Reset explicitly.
          e.target.position({ x: layer.x, y: layer.y });
        }}
        onMouseEnter={(e) => {
          if (!canPan) return;
          const stage = e.target.getStage();
          if (stage) stage.container().style.cursor = "grab";
        }}
        onMouseLeave={(e) => {
          const stage = e.target.getStage();
          if (stage) stage.container().style.cursor = "default";
        }}
      />
    );
  }

  // No photo assigned yet — the "empty template" state a merchant sees in the
  // builder before any customer photos exist.
  return (
    <Group x={layer.x} y={layer.y} rotation={layer.rotation} opacity={layer.opacity}>
      <Rect
        width={layer.w}
        height={layer.h}
        cornerRadius={radius}
        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
        fillLinearGradientEndPoint={{ x: layer.w, y: layer.h }}
        fillLinearGradientColorStops={[0, "#2A2A2A", 1, "#181818"]}
        stroke="#3A3A3A"
        strokeWidth={2}
      />
      <KonvaText
        text={String(index).padStart(2, "0")}
        width={layer.w}
        height={layer.h}
        align="center"
        verticalAlign="middle"
        fontFamily="Inter"
        fontSize={layer.w * 0.2}
        fill="#5A5A5A"
      />
    </Group>
  );
}

function ImageLayerNode({ layer }: { layer: ImageLayer }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (layer.src.startsWith("asset://")) return; // no asset resolver wired up yet
    const el = new window.Image();
    el.crossOrigin = "anonymous";
    el.onload = () => setImg(el);
    el.src = layer.src;
  }, [layer.src]);
  if (!img) return null;
  return (
    <KonvaImage
      image={img}
      x={layer.x}
      y={layer.y}
      width={layer.w}
      height={layer.h}
      rotation={layer.rotation}
      opacity={layer.opacity}
    />
  );
}

// Konva gradient props for a shape's local box. Points are in the node's own
// coordinate space, so they start at 0,0 regardless of where the layer sits.
function gradientProps(layer: ShapeLayer) {
  const g = layer.fillGradient;
  if (!g) return null;
  const horizontal = g.direction === "horizontal";
  return {
    fillLinearGradientStartPoint: { x: 0, y: 0 },
    fillLinearGradientEndPoint: horizontal ? { x: layer.w, y: 0 } : { x: 0, y: layer.h },
    fillLinearGradientColorStops: [0, g.from, 1, g.to],
  };
}

function ShapeNode({ layer }: { layer: ShapeLayer }) {
  const fill = layer.fill === "none" ? undefined : layer.fill;
  const stroke = layer.stroke?.color;
  const strokeWidth = layer.stroke?.width;
  const dash = layer.stroke?.dash;
  const gradient = gradientProps(layer);

  if (layer.kind === "rect") {
    return (
      <Rect
        x={layer.x}
        y={layer.y}
        width={layer.w}
        height={layer.h}
        cornerRadius={layer.cornerRadius}
        rotation={layer.rotation}
        opacity={layer.opacity}
        fill={fill}
        {...gradient}
        stroke={stroke}
        strokeWidth={strokeWidth}
        dash={dash}
      />
    );
  }

  // Name-plate banner: a band with a V cut into each end. Drawn as one closed
  // polygon so fill and stroke follow the notches.
  if (layer.kind === "ribbon") {
    const d = Math.min(layer.notch ?? layer.h / 2, layer.w / 2);
    const { w, h } = layer;
    return (
      <Line
        x={layer.x}
        y={layer.y}
        points={[0, 0, w, 0, w - d, h / 2, w, h, 0, h, d, h / 2]}
        closed
        rotation={layer.rotation}
        opacity={layer.opacity}
        fill={fill}
        {...gradient}
        stroke={stroke}
        strokeWidth={strokeWidth}
        dash={dash}
      />
    );
  }
  if (layer.kind === "ellipse") {
    return (
      <Ellipse
        x={layer.x + layer.w / 2}
        y={layer.y + layer.h / 2}
        radiusX={layer.w / 2}
        radiusY={layer.h / 2}
        rotation={layer.rotation}
        opacity={layer.opacity}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        dash={dash}
      />
    );
  }
  // line: horizontal segment through the vertical middle of the bounding box
  const midY = layer.y + layer.h / 2;
  return (
    <Line
      points={[layer.x, midY, layer.x + layer.w, midY]}
      opacity={layer.opacity}
      stroke={stroke}
      strokeWidth={strokeWidth ?? 2}
      dash={dash}
    />
  );
}

function fitFontSize(layer: TextLayer, text: string) {
  if (!layer.autoFit || typeof document === "undefined") return layer.sizePx;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return layer.sizePx;
  const minSize = layer.sizePx * 0.6;
  let size = layer.sizePx;
  while (size > minSize) {
    ctx.font = `${layer.weight >= 600 ? "bold" : ""} ${size}px "${layer.font}"`.trim();
    if (ctx.measureText(text).width <= layer.w) break;
    size -= 4;
  }
  return size;
}

function TextNode({ layer, value }: { layer: TextLayer; value: string }) {
  const text = layer.binds ? value : layer.text ?? "";
  const fontSize = useMemo(() => fitFontSize(layer, text), [layer, text]);
  return (
    <KonvaText
      x={layer.x}
      y={layer.y}
      width={layer.w}
      text={text}
      fontFamily={layer.font}
      fontSize={fontSize}
      fontStyle={konvaFontStyle(layer.weight, layer.italic)}
      fill={layer.color}
      align={layer.align}
      lineHeight={layer.lineHeight}
      letterSpacing={layer.letterSpacing}
      wrap={layer.maxLines > 1 ? "word" : "none"}
      ellipsis
      rotation={layer.rotation}
      opacity={layer.opacity}
    />
  );
}

// Konva drops any text line taller than a fixed `height` — a marker glyph sized
// purely off cellSizePx silently renders as nothing in a tight row (its line box
// is fontSize × lineHeight, which overflows well before the glyph does). Clamp
// the marker to what actually fits the cell so it always draws.
function fitMarkerSize(desired: number, colW: number, rowH: number) {
  return Math.max(1, Math.min(desired, rowH / 1.25, colW * 0.95));
}

// Draws a month grid. Weekday layout is computed from year+month so columns
// always align and dates are real; a heart marks `highlightDay`. The month
// label uses its own `titleFont` (typically a script) so it can differ from the
// serif used for the numbers.
function CalendarNode({ layer }: { layer: CalendarLayer }) {
  const cols = 7;
  const firstWeekday = new Date(layer.year, layer.month - 1, 1).getDay(); // 0 = Sun
  const daysInMonth = new Date(layer.year, layer.month, 0).getDate();
  const rowsUsed = Math.ceil((firstWeekday + daysInMonth) / cols);

  const highlight = layer.highlightDay;
  const monthName = layer.titleAbbrev ? MONTH_NAMES_SHORT[layer.month - 1] : MONTH_NAMES[layer.month - 1];
  const rawTitle = layer.title ?? monthName;
  const title = layer.titleUppercase ? rawTitle.toUpperCase() : rawTitle;

  // Tear-off day card: month label band on top, large day number below.
  if (layer.variant === "day") {
    const bandH = layer.titleBandPx ?? layer.titleSizePx * 2.2;
    return (
      <Group x={layer.x} y={layer.y} rotation={layer.rotation} opacity={layer.opacity}>
        <KonvaText
          x={0}
          y={0}
          width={layer.w}
          height={bandH}
          align="center"
          verticalAlign="middle"
          text={title}
          fontFamily={layer.titleFont}
          fontStyle="bold"
          fontSize={layer.titleSizePx}
          letterSpacing={layer.titleSizePx * 0.06}
          fill={layer.titleColor}
        />
        <KonvaText
          x={0}
          y={bandH}
          width={layer.w}
          height={layer.h - bandH}
          align="center"
          verticalAlign="middle"
          text={String(highlight ?? 1)}
          fontFamily={layer.font}
          fontStyle="bold"
          fontSize={layer.cellSizePx}
          fill={layer.color}
        />
      </Group>
    );
  }

  const colW = layer.w / cols;
  const titleH = layer.titleSizePx * 1.5;
  const headerH = layer.headerSizePx * 2;
  const gridH = layer.h - titleH - headerH;
  const rowH = gridH / Math.max(rowsUsed, 1);
  const markerBase = fitMarkerSize(layer.cellSizePx * 1.9, colW, rowH);

  const cells: React.ReactNode[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const index = firstWeekday + (d - 1);
    const col = index % cols;
    const row = Math.floor(index / cols);
    const cx = col * colW;
    const cy = titleH + headerH + row * rowH;
    const marked = d === highlight;

    // "heart" swaps the number out for a glyph; "heartDay"/"circle" keep the
    // number and draw a marker behind it.
    if (marked && layer.highlightStyle !== "heart") {
      const markerSize = markerBase;
      cells.push(
        <Group key={`d-${d}`} x={cx} y={cy}>
          {layer.highlightStyle === "circle" ? (
            <Ellipse
              x={colW / 2}
              y={rowH / 2}
              radiusX={markerSize / 2}
              radiusY={markerSize / 2}
              fill={layer.heartColor}
            />
          ) : (
            <KonvaText
              width={colW}
              height={rowH}
              align="center"
              verticalAlign="middle"
              wrap="none"
              text="♥"
              fontFamily={layer.font}
              fontSize={markerSize}
              fill={layer.heartColor}
            />
          )}
          <KonvaText
            width={colW}
            height={rowH}
            align="center"
            verticalAlign="middle"
            text={String(d)}
            fontFamily={layer.font}
            fontStyle={konvaFontStyle(layer.weight, false)}
            fontSize={layer.cellSizePx}
            fill={layer.highlightTextColor}
          />
        </Group>
      );
      continue;
    }

    cells.push(
      <KonvaText
        key={`d-${d}`}
        x={cx}
        y={cy}
        width={colW}
        height={rowH}
        align="center"
        verticalAlign="middle"
        wrap="none"
        text={marked ? "♥" : String(d)}
        fontFamily={layer.font}
        fontStyle={konvaFontStyle(layer.weight, false)}
        fontSize={marked ? fitMarkerSize(layer.cellSizePx * 1.15, colW, rowH) : layer.cellSizePx}
        fill={marked ? layer.heartColor : layer.color}
      />
    );
  }

  return (
    <Group x={layer.x} y={layer.y} rotation={layer.rotation} opacity={layer.opacity}>
      <KonvaText
        x={0}
        y={0}
        width={layer.w}
        align="center"
        text={title}
        fontFamily={layer.titleFont}
        fontStyle={konvaFontStyle(layer.titleWeight, false)}
        fontSize={layer.titleSizePx}
        fill={layer.titleColor}
      />
      {layer.weekdayLabels.map((label, i) => (
        <KonvaText
          key={`h-${i}`}
          x={i * colW}
          y={titleH}
          width={colW}
          align="center"
          text={label}
          fontFamily={layer.font}
          fontStyle={konvaFontStyle(layer.headerWeight, false)}
          fontSize={layer.headerSizePx}
          fill={layer.headerColor}
        />
      ))}
      {cells}
    </Group>
  );
}

export default function TemplateCanvas({
  doc,
  fieldValues,
  photoUrls = {},
  displayWidth,
  stageRef,
  editable = false,
  layerOffsets = {},
  onLayerDrag,
  photoAdjust = false,
  onPhotoCropChange,
  orderId = "",
  orderIdCorner = "bottom-right",
  orderIdColor = "auto",
}: Props) {
  const fontsReady = useFontsReady();
  const scale = displayWidth / doc.canvas.widthPx;
  const displayHeight = doc.canvas.heightPx * scale;

  const photoSlotIds = useMemo(
    () => doc.layers.filter((l) => l.type === "photoSlot").map((l) => l.id),
    [doc.layers]
  );

  function renderLayer(layer: TemplateDoc["layers"][number]) {
    if (layer.type === "shape") return <ShapeNode layer={layer} />;
    if (layer.type === "image") return <ImageLayerNode layer={layer} />;
    if (layer.type === "calendar") return <CalendarNode layer={layer} />;
    if (layer.type === "photoSlot") {
      const index = photoSlotIds.indexOf(layer.id) + 1;
      return (
        <PhotoSlotNode
          layer={layer}
          url={photoUrls[layer.id]}
          index={index}
          adjustable={photoAdjust}
          onCropChange={onPhotoCropChange}
        />
      );
    }
    const value = layer.binds ? fieldValues[layer.binds] ?? "" : layer.text ?? "";
    return <TextNode layer={layer} value={value} />;
  }

  return (
    <Stage ref={stageRef} width={displayWidth} height={displayHeight} scaleX={scale} scaleY={scale}>
      {/* remount once fonts finish loading so text re-measures/re-paints with the real families */}
      <Layer key={fontsReady ? "fonts-ready" : "fonts-loading"} listening={editable || photoAdjust}>
        <Rect x={0} y={0} width={doc.canvas.widthPx} height={doc.canvas.heightPx} fill={doc.canvas.background} />
        {doc.layers
          .filter((l) => l.visible)
          .map((layer) => {
            const offset = layerOffsets[layer.id] ?? { dx: 0, dy: 0 };
            // Each layer lives inside an offset Group. The group *is* the
            // reposition transform, so dragging it directly yields the new
            // offset — no accumulation, no snap-back.
            return (
              <Group
                key={layer.id}
                x={offset.dx}
                y={offset.dy}
                draggable={editable}
                onDragEnd={(e) => onLayerDrag?.(layer.id, e.target.x(), e.target.y())}
                onMouseEnter={(e) => {
                  if (editable) {
                    const stage = e.target.getStage();
                    if (stage) stage.container().style.cursor = "move";
                  }
                }}
                onMouseLeave={(e) => {
                  const stage = e.target.getStage();
                  if (stage) stage.container().style.cursor = "default";
                }}
              >
                {renderLayer(layer)}
              </Group>
            );
          })}
        {orderId.trim() !== "" && (
          <OrderIdBadge
            text={orderId.trim()}
            corner={orderIdCorner}
            canvasW={doc.canvas.widthPx}
            canvasH={doc.canvas.heightPx}
            bgColor={doc.canvas.background}
            color={orderIdColor}
          />
        )}
      </Layer>
    </Stage>
  );
}
