"use client";

// The shared render-core (Technical Plan §6): pure layout/draw logic for a
// template doc. This component is the browser half — the worker half (print
// renders) will back the exact same doc shape with Konva-on-Node + skia-canvas
// later. Keep layout math here free of anything client-only so it stays
// portable.
import { useEffect, useMemo, useState } from "react";
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
import { MONTH_NAMES, type LayerOffset } from "@/lib/template/adjustments";

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
};

const FONT_FAMILIES = ["Inter", "Playfair Display", "Great Vibes", "Pinyon Script"];

function useFontsReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    Promise.all(
      FONT_FAMILIES.flatMap((f) => [
        document.fonts.load(`400 32px "${f}"`),
        document.fonts.load(`700 32px "${f}"`),
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

// Baseline cover-fit crop (Project Doc §7.1): centers the leftover range.
function coverCrop(imgW: number, imgH: number, boxW: number, boxH: number) {
  const imgRatio = imgW / imgH;
  const boxRatio = boxW / boxH;
  const cropW = imgRatio > boxRatio ? imgH * boxRatio : imgW;
  const cropH = imgRatio > boxRatio ? imgH : imgW / boxRatio;
  return { x: (imgW - cropW) / 2, y: (imgH - cropH) / 2, width: cropW, height: cropH };
}

function slotRadius(layer: PhotoSlotLayer) {
  if (layer.shape === "circle") return Math.min(layer.w, layer.h) / 2;
  if (layer.shape === "rounded" || layer.shape === "heart") return layer.cornerRadius ?? 24;
  return 0;
}

function PhotoSlotNode({ layer, url, index }: { layer: PhotoSlotLayer; url?: string; index: number }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);

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
    const crop = coverCrop(img.naturalWidth, img.naturalHeight, layer.w, layer.h);
    return (
      <KonvaImage
        image={img}
        x={layer.x}
        y={layer.y}
        width={layer.w}
        height={layer.h}
        crop={crop}
        cornerRadius={radius}
        stroke={layer.border?.color}
        strokeWidth={layer.border?.width}
        rotation={layer.rotation}
        opacity={layer.opacity}
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

function ShapeNode({ layer }: { layer: ShapeLayer }) {
  const fill = layer.fill === "none" ? undefined : layer.fill;
  const stroke = layer.stroke?.color;
  const strokeWidth = layer.stroke?.width;
  const dash = layer.stroke?.dash;

  if (layer.kind === "rect") {
    return (
      <Rect
        x={layer.x}
        y={layer.y}
        width={layer.w}
        height={layer.h}
        rotation={layer.rotation}
        opacity={layer.opacity}
        fill={fill}
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
  const title = layer.title ?? MONTH_NAMES[layer.month - 1];

  const colW = layer.w / cols;
  const titleH = layer.titleSizePx * 1.5;
  const headerH = layer.headerSizePx * 2;
  const gridH = layer.h - titleH - headerH;
  const rowH = gridH / Math.max(rowsUsed, 1);

  const cells: React.ReactNode[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const index = firstWeekday + (d - 1);
    const col = index % cols;
    const row = Math.floor(index / cols);
    const cx = col * colW;
    const cy = titleH + headerH + row * rowH;
    const isHeart = d === highlight;
    cells.push(
      <KonvaText
        key={`d-${d}`}
        x={cx}
        y={cy}
        width={colW}
        height={rowH}
        align="center"
        verticalAlign="middle"
        text={isHeart ? "♥" : String(d)}
        fontFamily={layer.font}
        fontSize={isHeart ? layer.cellSizePx * 1.15 : layer.cellSizePx}
        fill={isHeart ? layer.heartColor : layer.color}
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
      return <PhotoSlotNode layer={layer} url={photoUrls[layer.id]} index={index} />;
    }
    const value = layer.binds ? fieldValues[layer.binds] ?? "" : layer.text ?? "";
    return <TextNode layer={layer} value={value} />;
  }

  return (
    <Stage ref={stageRef} width={displayWidth} height={displayHeight} scaleX={scale} scaleY={scale}>
      {/* remount once fonts finish loading so text re-measures/re-paints with the real families */}
      <Layer key={fontsReady ? "fonts-ready" : "fonts-loading"} listening={editable}>
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
      </Layer>
    </Stage>
  );
}
