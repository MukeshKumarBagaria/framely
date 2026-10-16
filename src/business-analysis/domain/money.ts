// Decimal-safe money helpers. Amounts travel through the module as strings
// ("1234.50") and are only turned into JavaScript numbers at the very edge,
// for chart geometry. All arithmetic goes through decimal.js.
import Decimal from "decimal.js";

Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

export type Money = string;
export type DecimalInput = Decimal.Value | null | undefined;

export function dec(value: DecimalInput): Decimal {
  if (value === null || value === undefined || value === "") return new Decimal(0);
  return new Decimal(value);
}

export function sum(values: Iterable<DecimalInput>): Decimal {
  let total = new Decimal(0);
  for (const v of values) total = total.plus(dec(v));
  return total;
}

/** Two-decimal string, half-up — the storage and wire format for rupees. */
export function money(value: DecimalInput): Money {
  return dec(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2);
}

export function isZero(value: DecimalInput): boolean {
  return dec(value).isZero();
}

/** a / b, or null when the denominator is zero (never NaN or Infinity). */
export function safeDivide(numerator: DecimalInput, denominator: DecimalInput): Decimal | null {
  const d = dec(denominator);
  if (d.isZero()) return null;
  return dec(numerator).dividedBy(d);
}

/** numerator / denominator × 100, rounded to 2 dp, or null on a zero denominator. */
export function percentOf(numerator: DecimalInput, denominator: DecimalInput): string | null {
  const ratio = safeDivide(numerator, denominator);
  return ratio === null ? null : ratio.times(100).toDecimalPlaces(2).toFixed(2);
}

export type ParsedAmount =
  | { ok: true; value: Money | null }
  | { ok: false; reason: string };

/**
 * Parses an amount as it appears in Indian marketplace exports:
 * "₹1,23,456.50", "Rs. 499", "INR 1,000", "(250.00)" (accounting negative),
 * "-12.5", "1 234". Empty cells and dashes are "no value" (null), which is
 * different from zero. Anything else that is not a clean number is rejected
 * rather than guessed at.
 */
export function parseAmount(raw: unknown): ParsedAmount {
  if (raw === null || raw === undefined) return { ok: true, value: null };
  if (typeof raw === "number") {
    if (!Number.isFinite(raw)) return { ok: false, reason: "not a finite number" };
    return { ok: true, value: money(new Decimal(raw)) };
  }
  let text = String(raw).trim();
  if (text === "" || /^[-–—]$/.test(text) || /^(na|n\/a|nil|null)$/i.test(text)) {
    return { ok: true, value: null };
  }

  let negative = false;
  if (/^\(.*\)$/.test(text)) {
    negative = true;
    text = text.slice(1, -1).trim();
  }
  text = text
    .replace(/^(₹|rs\.?|inr)\s*/i, "")
    .replace(/\s*(₹|rs\.?|inr)$/i, "")
    .replace(/[\s ]/g, "");
  if (text.startsWith("-")) {
    negative = !negative;
    text = text.slice(1);
  } else if (text.startsWith("+")) {
    text = text.slice(1);
  }
  text = text.replace(/^(₹|rs\.?|inr)/i, "");

  // Thousands separators are commas, grouped either the Indian way
  // (1,23,45,678) or the Western way (12,345,678). Anything else — including
  // a comma used as a decimal separator — is rejected rather than guessed.
  const [whole, fraction, ...rest] = text.split(".");
  const wholeOk =
    /^\d+$/.test(whole) || /^\d{1,3}(,\d{3})+$/.test(whole) || /^\d{1,2}(,\d{2})*,\d{3}$/.test(whole);
  if (!wholeOk || rest.length > 0 || (fraction !== undefined && !/^\d+$/.test(fraction))) {
    return { ok: false, reason: `"${String(raw).trim()}" is not a valid amount` };
  }
  const value = new Decimal(text.replace(/,/g, ""));
  return { ok: true, value: money(negative ? value.negated() : value) };
}

const inrFormatters = new Map<string, Intl.NumberFormat>();
function inrFormatter(fractionDigits: number): Intl.NumberFormat {
  const key = String(fractionDigits);
  let f = inrFormatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
    inrFormatters.set(key, f);
  }
  return f;
}

/** ₹1,23,456.50 — Indian digit grouping. */
export function formatINR(value: DecimalInput, options: { decimals?: 0 | 2 } = {}): string {
  const decimals = options.decimals ?? 2;
  const d = dec(value).toDecimalPlaces(decimals, Decimal.ROUND_HALF_UP);
  // Intl formats decimal strings exactly (no float round-trip).
  return inrFormatter(decimals).format(d.toFixed(decimals) as unknown as number);
}

/** ₹4.2K, ₹1.35L, ₹2.1Cr — for KPI tiles and chart axes. */
export function formatCompactINR(value: DecimalInput): string {
  const d = dec(value);
  const sign = d.isNegative() ? "-" : "";
  const abs = d.abs();
  const scaled = (divisor: number, suffix: string) => {
    const v = abs.dividedBy(divisor);
    const digits = v.greaterThanOrEqualTo(100) ? 0 : v.greaterThanOrEqualTo(10) ? 1 : 2;
    return `${sign}₹${v.toDecimalPlaces(digits).toString()}${suffix}`;
  };
  if (abs.greaterThanOrEqualTo(1e7)) return scaled(1e7, "Cr");
  if (abs.greaterThanOrEqualTo(1e5)) return scaled(1e5, "L");
  if (abs.greaterThanOrEqualTo(1e3)) return scaled(1e3, "K");
  return `${sign}₹${abs.toDecimalPlaces(0).toString()}`;
}

const integerFormatter = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
export function formatCount(value: DecimalInput): string {
  return integerFormatter.format(dec(value).toDecimalPlaces(0).toFixed(0) as unknown as number);
}

export function formatPercent(value: DecimalInput | null, decimals = 1): string {
  if (value === null || value === undefined) return "—";
  return `${dec(value).toDecimalPlaces(decimals).toFixed(decimals)}%`;
}

/** Chart-only: converts a money string to a JS number for plotting. */
export function toChartNumber(value: DecimalInput): number {
  return dec(value).toDecimalPlaces(2).toNumber();
}

export { Decimal };
