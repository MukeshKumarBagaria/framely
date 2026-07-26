// Meesho order-id capture — Guide §14. The order number is *truncated* on the
// order list screen ("Order #311778447421…"), so OCR alone can never be trusted:
// this module reports what it saw plus whether it saw an ellipsis, and the
// caller runs the confirmation ladder (§14.2).
import sharp from "sharp";
import { createWorker } from "tesseract.js";
import { logger } from "../logger.ts";

const ORDER_RX = /(?:order\s*#?\s*)?(\d{10,25})/gi;
const AMOUNT_RX = /₹\s?([\d,]+)/;
const DATE_RX = /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec))/i;

export type OcrResult = {
  raw: string;
  confidence: number;
  orderId: string | null;
  truncated: boolean;
  amountPaise: number | null;
  deliveryDate: string | null;
};

const EMPTY: OcrResult = {
  raw: "",
  confidence: 0,
  orderId: null,
  truncated: false,
  amountPaise: null,
  deliveryDate: null,
};

/**
 * Parsing is separated from OCR so the regex ladder can be unit-tested against
 * real screenshot text without spinning up tesseract.
 */
export function parseOrderText(text: string, confidence = 0): OcrResult {
  const ids = [...text.matchAll(ORDER_RX)].map((m) => m[1] ?? "").sort((a, b) => b.length - a.length);
  const amountMatch = text.match(AMOUNT_RX);
  return {
    raw: text,
    confidence,
    orderId: ids[0] ?? null,
    truncated: /\.\.\.|…/.test(text),
    amountPaise: amountMatch?.[1] ? Number.parseInt(amountMatch[1].replace(/,/g, ""), 10) * 100 : null,
    deliveryDate: text.match(DATE_RX)?.[1] ?? null,
  };
}

/**
 * §14.3 — upscale + grayscale + threshold before recognition. On phone
 * screenshots this is the difference between 60% and 90% accuracy.
 */
export async function ocrOrderScreenshot(input: Buffer | string): Promise<OcrResult> {
  let worker: Awaited<ReturnType<typeof createWorker>> | undefined;
  try {
    const prepped = await sharp(input)
      .resize({ width: 1400, withoutEnlargement: false })
      .grayscale()
      .normalise()
      .threshold(160)
      .toBuffer();

    worker = await createWorker("eng");
    await worker.setParameters({
      tessedit_char_whitelist:
        "0123456789#₹.,:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz ",
    });
    const { data } = await worker.recognize(prepped);
    return parseOrderText(data.text, data.confidence ?? 0);
  } catch (err) {
    // OCR is rung 2 of a 4-rung ladder. If it throws, we simply fall to rung 3
    // ("please type it") rather than failing the customer's message.
    logger.warn({ err }, "OCR failed — falling through to typed order id");
    return EMPTY;
  } finally {
    await worker?.terminate().catch(() => {});
  }
}

/** §14.4 — the bar for skipping "please confirm this id". */
export function isTrustworthy(ocr: OcrResult): boolean {
  return Boolean(ocr.orderId) && !ocr.truncated && ocr.confidence > 70;
}

/** Customer-typed ids: digits only, and long enough to be real (§14.4). */
export function normalizeTypedOrderId(text: string): string | null {
  const digits = text.replace(/\D/g, "");
  return digits.length >= 10 ? digits : null;
}
