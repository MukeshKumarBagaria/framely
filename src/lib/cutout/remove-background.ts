"use client";

// In-browser background removal for `cutout` photo slots. Runs MODNet (a
// portrait-matting model, Apache-2.0) through transformers.js inside a Web
// Worker, so the editor stays responsive during the few seconds inference
// takes. The library and model weights load from public CDNs on first use and
// are then cached by the browser; nothing is added to the app bundle, and the
// photo itself never leaves the device.

const TRANSFORMERS_URL = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1";
const MODEL = "Xenova/modnet";

// Longest side of the cut-out we hand back. Enough for a hero slot at full
// print resolution with room to zoom, without pushing tens of megapixels
// through the model's post-processing.
const MAX_SIDE = 2400;

// Built from a string (a blob-URL module worker) so the bundler never tries to
// resolve the CDN import. The pipeline is created once and reused.
const WORKER_SOURCE = `
let ready;
function load() {
  ready ??= import(${JSON.stringify(TRANSFORMERS_URL)}).then(async ({ pipeline, env, RawImage }) => {
    env.allowLocalModels = false;
    const segment = await pipeline("background-removal", ${JSON.stringify(MODEL)}, { dtype: "fp32", device: "wasm" });
    return { segment, RawImage };
  });
  return ready;
}
self.onmessage = async (e) => {
  const { id, buffer, width, height } = e.data;
  try {
    const { segment, RawImage } = await load();
    const [out] = await segment(new RawImage(new Uint8ClampedArray(buffer), width, height, 4));
    const rgba = out.channels === 4 ? out : out.rgba();
    const data = new Uint8ClampedArray(rgba.data);
    self.postMessage({ id, buffer: data.buffer, width: rgba.width, height: rgba.height }, [data.buffer]);
  } catch (err) {
    ready = undefined;
    self.postMessage({ id, error: String((err && err.message) || err) });
  }
};
`;

type Reply = { id: number; buffer?: ArrayBuffer; width?: number; height?: number; error?: string };

let worker: Worker | null = null;
let nextId = 0;
const waiting = new Map<number, { resolve: (r: Reply) => void; reject: (e: Error) => void }>();

function getWorker() {
  if (worker) return worker;
  const url = URL.createObjectURL(new Blob([WORKER_SOURCE], { type: "text/javascript" }));
  const w = new Worker(url, { type: "module" });
  URL.revokeObjectURL(url);
  w.onmessage = (e: MessageEvent<Reply>) => {
    const entry = waiting.get(e.data.id);
    if (!entry) return;
    waiting.delete(e.data.id);
    if (e.data.error) entry.reject(new Error(e.data.error));
    else entry.resolve(e.data);
  };
  w.onerror = (e) => {
    for (const entry of waiting.values()) entry.reject(new Error(e.message || "Background removal failed to start"));
    waiting.clear();
    w.terminate();
    worker = null;
  };
  worker = w;
  return w;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Couldn't read this photo"));
    img.src = url;
  });
}

function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't encode the cut-out"))), "image/png")
  );
}

// A photo that already has a see-through background (e.g. a PNG cut out in
// another app) is used as-is rather than run through the model again.
function hasTransparency(canvas: HTMLCanvasElement) {
  const probe = document.createElement("canvas");
  probe.width = 64;
  probe.height = 64;
  const ctx = probe.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(canvas, 0, 0, 64, 64);
  const { data } = ctx.getImageData(0, 0, 64, 64);
  let clear = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] < 250) clear++;
  return clear / (64 * 64) > 0.02;
}

// Cuts the subject out of the photo at `url`, returning a transparent PNG.
export async function removeBackground(url: string): Promise<Blob> {
  const img = await loadImage(url);
  const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  if (hasTransparency(canvas)) return canvasToPng(canvas);

  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const id = ++nextId;
  const reply = await new Promise<Reply>((resolve, reject) => {
    waiting.set(id, { resolve, reject });
    getWorker().postMessage(
      { id, buffer: pixels.data.buffer, width: canvas.width, height: canvas.height },
      [pixels.data.buffer]
    );
  });

  const out = document.createElement("canvas");
  out.width = reply.width!;
  out.height = reply.height!;
  out.getContext("2d")!.putImageData(new ImageData(new Uint8ClampedArray(reply.buffer!), out.width, out.height), 0, 0);
  return canvasToPng(out);
}
