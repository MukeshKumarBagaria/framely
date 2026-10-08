"use client";

// The shared render-core (Technical Plan §6): pure layout/draw logic for a
// template doc. This component is the browser half — the worker half (print
// renders) will back the exact same doc shape with Konva-on-Node + skia-canvas
// later. Keep layout math here free of anything client-only so it stays
// portable.
import { useEffect, useMemo, useRef, useState } from "react";
import type Konva from "konva";
import {
  Stage,
  Layer,
  Rect,
  Ellipse,
  Line,
  Shape,
  Text as KonvaText,
  Image as KonvaImage,
  Group,
} from "react-konva";
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

const FONT_FAMILIES = [
  "Inter",
  "Playfair Display",
  "Great Vibes",
  "Pinyon Script",
  "Kaushan Script",
  "Ms Madi",
  "Hurricane",
  "Lobster Two",
  "Parisienne",
  "Montserrat",
  "Montserrat Tabular",
  "Gilda Display",
  "Poppins",
];

function useFontsReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    Promise.all(
      FONT_FAMILIES.flatMap((f) => [
        document.fonts.load(`400 32px "${f}"`),
        document.fonts.load(`700 32px "${f}"`),
        document.fonts.load(`800 32px "${f}"`),
        document.fonts.load(`900 32px "${f}"`),
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
  // Extra-bold and black pass through as numbers so a real 800/900 face
  // draws; lighter weights keep the original regular/bold split.
  if (weight >= 800) parts.push(String(weight));
  else if (weight >= 600) parts.push("bold");
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

// Flat-top hexagon inscribed in [w × h], as a flat [x0,y0, x1,y1, …] list:
// two corners along the top edge, a point at each side, two along the bottom.
function hexagonPoints(w: number, h: number) {
  return [w * 0.25, 0, w * 0.75, 0, w, h / 2, w * 0.75, h, w * 0.25, h, 0, h / 2];
}

// `cornerRadius` can only round a rectangle, so a hexagon slot is drawn by
// clipping its Group to this path instead. A radius softens the six corners
// (arcTo trims each one tangentially) without losing the hexagon silhouette;
// at its maximum of h/2 a regular hexagon becomes its inscribed circle.
function hexagonPath(ctx: Konva.Context, w: number, h: number, radius = 0) {
  const p = hexagonPoints(w, h);
  const r = Math.max(0, Math.min(radius, h / 2, (w * Math.sqrt(3)) / 4));
  ctx.beginPath();
  if (r === 0) {
    ctx.moveTo(p[0], p[1]);
    for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]);
  } else {
    // Start mid-way along the top edge so the first corner is rounded too.
    ctx.moveTo(w / 2, 0);
    for (let i = 2; i <= p.length; i += 2) {
      const corner = i % p.length;
      const next = (i + 2) % p.length;
      ctx.arcTo(p[corner], p[corner + 1], p[next], p[next + 1], r);
    }
  }
  ctx.closePath();
}

// The hexagon outline as a Konva shape, for the frame stroke and the empty
// placeholder; style props (fill, stroke, gradients…) pass straight through.
function HexagonShape({
  w,
  h,
  radius,
  ...style
}: { w: number; h: number; radius: number } & Konva.ShapeConfig) {
  return (
    <Shape
      {...style}
      sceneFunc={(ctx, shape) => {
        hexagonPath(ctx, w, h, radius);
        ctx.fillStrokeShape(shape);
      }}
    />
  );
}

function makeCanvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

// Longest side of the working copy the outline is grown on. Small enough that
// stamping the silhouette dozens of times stays instant, large enough that the
// outline (scaled back up, which also anti-aliases it) keeps a clean edge.
const OUTLINE_MASK_SIDE = 720;

// A cutout photo as a die-cut sticker: the subject's silhouette grown by
// `width` source px and filled with `color`, drawn under the subject itself.
// The silhouette is thresholded first, so soft hair alpha doesn't fray the
// outline. Built at the photo's own resolution; panning only moves the crop
// window over the result.
function buildSticker(img: HTMLImageElement, width: number, color: string) {
  const W = img.naturalWidth;
  const H = img.naturalHeight;
  const s = Math.min(1, OUTLINE_MASK_SIDE / Math.max(W, H));
  const sw = Math.max(1, Math.round(W * s));
  const sh = Math.max(1, Math.round(H * s));

  const mask = makeCanvas(sw, sh);
  const mctx = mask.getContext("2d", { willReadFrequently: true })!;
  mctx.drawImage(img, 0, 0, sw, sh);
  const px = mctx.getImageData(0, 0, sw, sh);
  for (let i = 0; i < px.data.length; i += 4) {
    const on = px.data[i + 3] > 96;
    px.data[i] = px.data[i + 1] = px.data[i + 2] = 255;
    px.data[i + 3] = on ? 255 : 0;
  }
  mctx.putImageData(px, 0, 0);

  const grown = makeCanvas(sw, sh);
  const gctx = grown.getContext("2d")!;
  const r = width * s;
  gctx.drawImage(mask, 0, 0);
  if (r > 0) {
    // A filled disc of offsets: an outer ring plus inner ones, so thin strands
    // get a solid outline rather than a hollow halo.
    for (const ring of [1, 0.66, 0.33]) {
      const rr = r * ring;
      const steps = Math.max(12, Math.ceil(rr * 2.5));
      for (let k = 0; k < steps; k++) {
        const a = (k / steps) * Math.PI * 2;
        gctx.drawImage(mask, Math.cos(a) * rr, Math.sin(a) * rr);
      }
    }
  }
  gctx.globalCompositeOperation = "source-in";
  gctx.fillStyle = color;
  gctx.fillRect(0, 0, sw, sh);

  const out = makeCanvas(W, H);
  const octx = out.getContext("2d")!;
  octx.imageSmoothingQuality = "high";
  octx.drawImage(grown, 0, 0, W, H);
  octx.drawImage(img, 0, 0);
  return out;
}

// Longest side of the silhouette used for hit-testing a cutout.
const HIT_MASK_SIDE = 320;

// Renders a `cutout` slot: the sticker cropped like any photo, with the lower
// edge faded out. Hit-testing follows the silhouette, not the bounding box, so
// the cutout doesn't swallow drags meant for the photos around it.
function CutoutImage({
  img,
  layer,
  cropRect,
  ...rest
}: {
  img: HTMLImageElement;
  layer: PhotoSlotLayer;
  cropRect: { x: number; y: number; width: number; height: number };
} & Omit<Konva.ImageConfig, "image">) {
  const cutout = layer.cutout!;
  // Outline width in source px, so it prints at `outlineWidth` doc px whatever
  // the zoom. Rounded so small zoom changes reuse the same sticker.
  const srcWidth = Math.round((cutout.outlineWidth * cropRect.width) / layer.w);
  const sticker = useMemo(
    () => buildSticker(img, srcWidth, cutout.outlineColor),
    [img, srcWidth, cutout.outlineColor]
  );

  const { x: cx, y: cy, width: cw, height: ch } = cropRect;
  const fade = cutout.fadeBottom;
  const { canvas, hitMask } = useMemo(() => {
    const c = makeCanvas(cw, ch);
    const ctx = c.getContext("2d")!;
    ctx.drawImage(sticker, cx, cy, cw, ch, 0, 0, c.width, c.height);
    if (fade > 0) {
      // One full-height fill: destination-in also clears everything outside
      // the shape being drawn, so the mask can't be painted in pieces.
      const g = ctx.createLinearGradient(0, 0, 0, c.height);
      g.addColorStop(0, "rgba(0,0,0,1)");
      g.addColorStop(1 - fade, "rgba(0,0,0,1)");
      g.addColorStop(1 - fade / 2, "rgba(0,0,0,0.55)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.globalCompositeOperation = "destination-in";
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, c.width, c.height);
    }
    const hs = Math.min(1, HIT_MASK_SIDE / Math.max(c.width, c.height));
    const m = makeCanvas(c.width * hs, c.height * hs);
    const mctx = m.getContext("2d", { willReadFrequently: true })!;
    mctx.drawImage(c, 0, 0, m.width, m.height);
    return { canvas: c, hitMask: mctx.getImageData(0, 0, m.width, m.height) };
  }, [sticker, cx, cy, cw, ch, fade]);

  // Paint the opaque parts of the silhouette in this node's hit colour. Drawn
  // as runs of solid rects (never a scaled bitmap) so no blended edge pixel
  // can carry a colour that maps to some other node.
  const hitFunc = (ctx: Konva.Context, shape: Konva.Shape) => {
    const { width: mw, height: mh, data } = hitMask;
    const sx = layer.w / mw;
    const sy = layer.h / mh;
    ctx.beginPath();
    for (let row = 0; row < mh; row++) {
      let start = -1;
      for (let col = 0; col <= mw; col++) {
        const on = col < mw && data[(row * mw + col) * 4 + 3] > 128;
        if (on && start < 0) start = col;
        if (!on && start >= 0) {
          ctx.rect(start * sx, row * sy, (col - start) * sx, sy + 0.5);
          start = -1;
        }
      }
    }
    ctx.fillShape(shape);
  };

  return <KonvaImage {...rest} image={canvas} width={layer.w} height={layer.h} hitFunc={hitFunc} />;
}

// Empty cutout slot: the template's own silhouette artwork when it ships one,
// otherwise a generic head-and-shoulders shape with the sticker outline — so
// the merchant sees where (and how big) the cut-out subject sits.
function CutoutPlaceholder({ layer, index }: { layer: PhotoSlotLayer; index: number }) {
  const { w, h } = layer;
  const outline = layer.cutout!.outlineWidth;
  const src = layer.cutout!.placeholder;
  const [art, setArt] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!src || src.startsWith("asset://")) return;
    const el = new window.Image();
    el.crossOrigin = "anonymous";
    el.onload = () => setArt(el);
    el.src = src;
    return () => {
      el.onload = null;
    };
  }, [src]);
  const label = (
    <KonvaText
      text={String(index).padStart(2, "0")}
      y={h * 0.1}
      width={w}
      height={h * 0.25}
      align="center"
      verticalAlign="middle"
      fontFamily="Inter"
      fontSize={w * 0.1}
      fill="#5A5A5A"
    />
  );
  if (src) {
    return (
      <Group x={layer.x} y={layer.y} rotation={layer.rotation} opacity={layer.opacity}>
        {art && <KonvaImage image={art} width={w} height={h} />}
        {art && label}
      </Group>
    );
  }
  return (
    <Group x={layer.x} y={layer.y} rotation={layer.rotation} opacity={layer.opacity}>
      <Shape
        sceneFunc={(ctx, shape) => {
          ctx.beginPath();
          ctx.ellipse(w / 2, h * 0.3, w * 0.2, h * 0.2, 0, 0, Math.PI * 2);
          ctx.moveTo(w * 0.06, h);
          ctx.bezierCurveTo(w * 0.06, h * 0.62, w * 0.3, h * 0.55, w / 2, h * 0.55);
          ctx.bezierCurveTo(w * 0.7, h * 0.55, w * 0.94, h * 0.62, w * 0.94, h);
          ctx.closePath();
          ctx.fillStrokeShape(shape);
        }}
        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
        fillLinearGradientEndPoint={{ x: w, y: h }}
        fillLinearGradientColorStops={[0, "#2A2A2A", 1, "#181818"]}
        stroke={layer.cutout!.outlineColor}
        strokeWidth={outline}
        fillAfterStrokeEnabled
      />
      {label}
    </Group>
  );
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
  const hexRadius = layer.shape === "hexagon" ? (layer.cornerRadius ?? 0) : 0;

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

    // A hexagon slot nests the image inside a clipped Group, so the image draws
    // at the group's origin and the group carries placement/rotation/opacity.
    const hex = layer.shape === "hexagon";
    const ix = hex ? 0 : layer.x;
    const iy = hex ? 0 : layer.y;

    const panProps = {
      draggable: canPan,
      // move the frame. Using `this.absolutePosition()` guarantees the node
      // stays exactly where it is in absolute space.
      dragBoundFunc: canPan ? function (this: Konva.Node) { return this.absolutePosition(); } : undefined,
    };
    const panHandlers = {
      onDragStart: (e: Konva.KonvaEventObject<DragEvent>) => {
        lastPointer.current = e.target.getStage()?.getPointerPosition() ?? null;
      },
      onDragMove: canPan ? handleDragMove : undefined,
      onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
        lastPointer.current = null;
        // Konva mutates the node's own x/y while dragging; react-konva won't
        // restore them because the props never changed. Reset explicitly.
        e.target.position({ x: ix, y: iy });
      },
      onMouseEnter: (e: Konva.KonvaEventObject<MouseEvent>) => {
        if (!canPan) return;
        const stage = e.target.getStage();
        if (stage) stage.container().style.cursor = "grab";
      },
      onMouseLeave: (e: Konva.KonvaEventObject<MouseEvent>) => {
        const stage = e.target.getStage();
        if (stage) stage.container().style.cursor = "default";
      },
    };

    if (layer.cutout) {
      return (
        <CutoutImage
          img={img}
          layer={layer}
          cropRect={cropRect}
          x={layer.x}
          y={layer.y}
          rotation={layer.rotation}
          opacity={layer.opacity}
          {...panProps}
          {...panHandlers}
        />
      );
    }

    const image = (
      <KonvaImage
        image={img}
        x={ix}
        y={iy}
        width={layer.w}
        height={layer.h}
        crop={cropRect}
        cornerRadius={radius}
        stroke={hex ? undefined : layer.border?.color}
        strokeWidth={hex ? undefined : layer.border?.width}
        rotation={hex ? 0 : layer.rotation}
        opacity={hex ? 1 : layer.opacity}
        {...panProps}
        {...panHandlers}
      />
    );

    if (!hex) return image;

    return (
      <Group x={layer.x} y={layer.y} rotation={layer.rotation} opacity={layer.opacity}>
        <Group clipFunc={(ctx) => hexagonPath(ctx, layer.w, layer.h, hexRadius)}>{image}</Group>
        {layer.border && (
          <HexagonShape
            w={layer.w}
            h={layer.h}
            radius={hexRadius}
            stroke={layer.border.color}
            strokeWidth={layer.border.width}
            lineJoin="round"
            listening={false}
          />
        )}
      </Group>
    );
  }

  // No photo assigned yet — the "empty template" state a merchant sees in the
  // builder before any customer photos exist.
  if (layer.cutout) return <CutoutPlaceholder layer={layer} index={index} />;
  return (
    <Group x={layer.x} y={layer.y} rotation={layer.rotation} opacity={layer.opacity}>
      {layer.shape === "hexagon" ? (
        <HexagonShape
          w={layer.w}
          h={layer.h}
          radius={hexRadius}
          fillLinearGradientStartPoint={{ x: 0, y: 0 }}
          fillLinearGradientEndPoint={{ x: layer.w, y: layer.h }}
          fillLinearGradientColorStops={[0, "#2A2A2A", 1, "#181818"]}
          stroke={layer.border?.color ?? "#3A3A3A"}
          strokeWidth={layer.border?.width ?? 2}
          lineJoin="round"
        />
      ) : (
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
      )}
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
  // Position by centre + offset so flip (negative scale) and rotation both act
  // around the middle and the drawn box stays exactly [x..x+w] × [y..y+h].
  return (
    <KonvaImage
      image={img}
      x={layer.x + layer.w / 2}
      y={layer.y + layer.h / 2}
      width={layer.w}
      height={layer.h}
      offsetX={layer.w / 2}
      offsetY={layer.h / 2}
      scaleX={layer.flipX ? -1 : 1}
      scaleY={layer.flipY ? -1 : 1}
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
    // Measure with exactly the style the text is drawn in, or an 800/900
    // weight measures as bold, overflows the box and gets ellipsised.
    ctx.font = `${konvaFontStyle(layer.weight, layer.italic)} ${size}px "${layer.font}"`;
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
      // Konva multiplies shadowBlur by the absolute scale, so the halo keeps
      // its proportions in the small preview and the full-res export alike.
      shadowEnabled={!!layer.glow}
      shadowColor={layer.glow?.color}
      shadowBlur={layer.glow?.blur}
      shadowOpacity={layer.glow?.opacity}
    />
  );
}

// `color` mixed toward white by `amount` (0..1), as an rgb() string.
function tint(color: string, amount: number) {
  const h = color.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.slice(0, 6);
  const mix = (i: number) => {
    const v = parseInt(full.slice(i, i + 2), 16) || 0;
    return Math.round(v + (255 - v) * amount);
  };
  return `rgb(${mix(0)}, ${mix(2)}, ${mix(4)})`;
}

// The "heartShape" calendar marker: a classic point-down heart centred on
// (cx, cy), `width` wide and a little less tall, lit softly from the upper
// middle like a glossy sticker. Drawn as a path so it doesn't depend on which
// fallback font happens to supply a ♥ glyph on the device.
function HeartMarker({ cx, cy, width, color }: { cx: number; cy: number; width: number; color: string }) {
  const w = width;
  const h = width * 0.85;
  return (
    <Shape
      x={cx - w / 2}
      y={cy - h / 2}
      sceneFunc={(ctx, shape) => {
        ctx.beginPath();
        ctx.moveTo(w / 2, h);
        ctx.bezierCurveTo(w * 0.17, h * 0.78, 0, h * 0.55, 0, h * 0.32);
        ctx.bezierCurveTo(0, h * 0.12, w * 0.12, 0, w * 0.27, 0);
        ctx.bezierCurveTo(w * 0.38, 0, w * 0.46, h * 0.07, w / 2, h * 0.19);
        ctx.bezierCurveTo(w * 0.54, h * 0.07, w * 0.62, 0, w * 0.73, 0);
        ctx.bezierCurveTo(w * 0.88, 0, w, h * 0.12, w, h * 0.32);
        ctx.bezierCurveTo(w, h * 0.55, w * 0.83, h * 0.78, w / 2, h);
        ctx.closePath();
        ctx.fillStrokeShape(shape);
      }}
      fillRadialGradientStartPoint={{ x: w / 2, y: h * 0.38 }}
      fillRadialGradientEndPoint={{ x: w / 2, y: h * 0.38 }}
      fillRadialGradientStartRadius={0}
      fillRadialGradientEndRadius={w * 0.62}
      fillRadialGradientColorStops={[0, tint(color, 0.3), 1, color]}
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

  // Free-standing month or year label, styled with the title settings.
  if (layer.variant === "month" || layer.variant === "year") {
    return (
      <Group x={layer.x} y={layer.y} rotation={layer.rotation} opacity={layer.opacity}>
        <KonvaText
          width={layer.w}
          align={layer.titleAlign}
          wrap="none"
          text={layer.variant === "month" ? title : String(layer.year)}
          fontFamily={layer.titleFont}
          fontStyle={konvaFontStyle(layer.titleWeight, false)}
          fontSize={layer.titleSizePx}
          fill={layer.titleColor}
        />
      </Group>
    );
  }

  const colW = layer.w / cols;
  const titleH = layer.showTitle ? layer.titleSizePx * 1.5 : 0;
  const headerH = layer.headerBandPx ?? layer.headerSizePx * 2;
  const gridH = layer.h - titleH - headerH;
  const rowH = gridH / Math.max(rowsUsed, 1);
  // An explicit highlightSizePx opts out of the row clamp — see the schema note.
  const markerBase = layer.highlightSizePx ?? fitMarkerSize(layer.cellSizePx * 1.9, colW, rowH);
  // Box the heart glyph is drawn in, in cell-local coordinates. Clamped to the
  // cell by default; an authored size gets its own oversized box centred on the
  // cell so Konva doesn't drop a glyph taller than the row.
  const markerBox = layer.highlightSizePx
    ? { x: colW / 2 - markerBase, y: rowH / 2 - markerBase * 0.75, w: markerBase * 2, h: markerBase * 1.5 }
    : { x: 0, y: 0, w: colW, h: rowH };

  const cells: React.ReactNode[] = [];
  if (layer.showLeadingDays) {
    const prevMonthDays = new Date(layer.year, layer.month - 1, 0).getDate();
    for (let col = 0; col < firstWeekday; col++) {
      const d = prevMonthDays - firstWeekday + 1 + col;
      cells.push(
        <KonvaText
          key={`p-${d}`}
          x={col * colW}
          y={titleH + headerH}
          width={colW}
          height={rowH}
          align="center"
          verticalAlign="middle"
          wrap="none"
          text={String(d)}
          fontFamily={layer.font}
          fontStyle={konvaFontStyle(layer.weight, false)}
          fontSize={layer.cellSizePx}
          fill={col === 0 && layer.sundayColor ? layer.sundayColor : layer.color}
          opacity={layer.leadingDaysOpacity}
        />
      );
    }
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const index = firstWeekday + (d - 1);
    const col = index % cols;
    const row = Math.floor(index / cols);
    const cx = col * colW;
    const cy = titleH + headerH + row * rowH;
    const marked = d === highlight;

    const sunday = col === 0 && layer.sundayColor;
    const dateColor = sunday ? layer.sundayColor! : layer.color;

    // "heart" swaps the number out for a glyph; the others keep the number and
    // draw a marker behind (filled disc / heart) or around it (hollow ring).
    if (marked && layer.highlightStyle !== "heart") {
      const markerSize = markerBase;
      const isRing = layer.highlightStyle === "ring";
      cells.push(
        <Group key={`d-${d}`} x={cx} y={cy}>
          {layer.highlightStyle === "heartDay" ? (
            <KonvaText
              x={markerBox.x}
              y={markerBox.y}
              width={markerBox.w}
              height={markerBox.h}
              align="center"
              verticalAlign="middle"
              wrap="none"
              text="♥"
              fontFamily={layer.font}
              fontSize={markerSize}
              fill={layer.heartColor}
            />
          ) : layer.highlightStyle === "heartShape" ? (
            <HeartMarker cx={colW / 2} cy={rowH / 2} width={markerSize} color={layer.heartColor} />
          ) : (
            <Ellipse
              x={colW / 2}
              y={rowH / 2}
              radiusX={markerSize / 2}
              radiusY={markerSize / 2}
              fill={isRing ? undefined : layer.heartColor}
              stroke={isRing ? layer.heartColor : undefined}
              strokeWidth={isRing ? Math.max(3, layer.cellSizePx * 0.09) : undefined}
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
            fill={isRing ? dateColor : layer.highlightTextColor}
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
        fill={marked ? layer.heartColor : dateColor}
      />
    );
  }

  return (
    <Group x={layer.x} y={layer.y} rotation={layer.rotation} opacity={layer.opacity}>
      {layer.showTitle && (
        <KonvaText
          x={0}
          y={0}
          width={layer.w}
          align={layer.titleAlign}
          text={title}
          fontFamily={layer.titleFont}
          fontStyle={konvaFontStyle(layer.titleWeight, false)}
          fontSize={layer.titleSizePx}
          fill={layer.titleColor}
        />
      )}
      {layer.showTitle && layer.showYear && (
        // Same line as the month label, pushed to the other end of the grid.
        <KonvaText
          x={0}
          y={0}
          width={layer.w}
          align={layer.titleAlign === "right" ? "left" : "right"}
          text={String(layer.year)}
          fontFamily={layer.titleFont}
          fontStyle={konvaFontStyle(layer.titleWeight, false)}
          fontSize={layer.titleSizePx}
          fill={layer.titleColor}
        />
      )}
      {layer.weekdayLabels.map((label, i) => (
        <KonvaText
          key={`h-${i}`}
          x={i * colW}
          y={titleH}
          width={colW}
          align="center"
          text={label}
          fontFamily={layer.headerFont ?? layer.font}
          fontStyle={konvaFontStyle(layer.headerWeight, false)}
          fontSize={layer.headerSizePx}
          fill={i === 0 && layer.sundayColor ? layer.sundayColor : layer.headerColor}
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
                // Konva hit-tests an image by its bounding box, not its alpha,
                // so a decorative corner spray drawn *after* a photo swallows
                // the drag meant for the photo underneath it. While adjusting
                // photo fit, only the photo slots may listen.
                listening={editable || (photoAdjust && layer.type === "photoSlot")}
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
