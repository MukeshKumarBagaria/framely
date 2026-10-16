// Business dates. A "business date" is a plain calendar date ("2026-10-16")
// in the business's timezone (Asia/Kolkata by default). Arithmetic happens on
// UTC-midnight Date objects so it is immune to the server's own timezone.
// Indian financial years run 1 April – 31 March (configurable start month).

export type IsoDate = string; // YYYY-MM-DD

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isIsoDate(value: unknown): value is IsoDate {
  if (typeof value !== "string") return false;
  const m = ISO_RE.exec(value);
  if (!m) return false;
  return isValidYmd(Number(m[1]), Number(m[2]), Number(m[3]));
}

export function isValidYmd(y: number, m: number, d: number): boolean {
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return false;
  if (y < 1900 || y > 2200 || m < 1 || m > 12 || d < 1) return false;
  return d <= daysInMonth(y, m);
}

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function toUtc(iso: IsoDate): Date {
  const m = ISO_RE.exec(iso);
  if (!m) throw new Error(`invalid ISO date: ${iso}`);
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

function fromUtc(d: Date): IsoDate {
  return d.toISOString().slice(0, 10);
}

export function ymd(y: number, m: number, d: number): IsoDate {
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function parts(iso: IsoDate): { y: number; m: number; d: number } {
  const m = ISO_RE.exec(iso);
  if (!m) throw new Error(`invalid ISO date: ${iso}`);
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

export function addDays(iso: IsoDate, days: number): IsoDate {
  const d = toUtc(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return fromUtc(d);
}

/** Adds calendar months, clamping to the month's last day (31 Jan + 1 → 28/29 Feb). */
export function addMonths(iso: IsoDate, months: number): IsoDate {
  const { y, m, d } = parts(iso);
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return ymd(ny, nm, Math.min(d, daysInMonth(ny, nm)));
}

/** Whole days from a to b (b − a). */
export function diffDays(a: IsoDate, b: IsoDate): number {
  return Math.round((toUtc(b).getTime() - toUtc(a).getTime()) / 86_400_000);
}

/** Inclusive day count of a range. */
export function rangeLength(from: IsoDate, to: IsoDate): number {
  return diffDays(from, to) + 1;
}

export function compareIso(a: IsoDate, b: IsoDate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function minIso(a: IsoDate, b: IsoDate): IsoDate {
  return a <= b ? a : b;
}

export function eachDay(from: IsoDate, to: IsoDate): IsoDate[] {
  const out: IsoDate[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

/** Today's calendar date in the given IANA timezone. */
export function todayIn(timeZone: string, now: Date = new Date()): IsoDate {
  return dateInTimeZone(now, timeZone);
}

export function dateInTimeZone(instant: Date, timeZone: string): IsoDate {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(instant); // en-CA formats as YYYY-MM-DD
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** ISO weekday, Monday = 1 … Sunday = 7. */
export function isoWeekday(iso: IsoDate): number {
  const day = toUtc(iso).getUTCDay();
  return day === 0 ? 7 : day;
}

/** Weeks start on Monday. */
export function startOfWeek(iso: IsoDate): IsoDate {
  return addDays(iso, 1 - isoWeekday(iso));
}

export function startOfMonth(iso: IsoDate): IsoDate {
  const { y, m } = parts(iso);
  return ymd(y, m, 1);
}

export function endOfMonth(iso: IsoDate): IsoDate {
  const { y, m } = parts(iso);
  return ymd(y, m, daysInMonth(y, m));
}

export type FinancialYear = { start: IsoDate; end: IsoDate; label: string; startYear: number };

/** The financial year containing `iso`. With startMonth 4: 1 Apr 2026 – 31 Mar 2027 = "FY 2026-27". */
export function financialYearOf(iso: IsoDate, startMonth = 4): FinancialYear {
  const { y, m } = parts(iso);
  const startYear = m >= startMonth ? y : y - 1;
  const start = ymd(startYear, startMonth, 1);
  const end = addDays(addMonths(start, 12), -1);
  const label =
    startMonth === 1
      ? `FY ${startYear}`
      : `FY ${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
  return { start, end, label, startYear };
}

/** Financial quarter (Q1 = first three months of the FY). */
export function financialQuarterOf(iso: IsoDate, startMonth = 4): { quarter: number; start: IsoDate; end: IsoDate } {
  const fy = financialYearOf(iso, startMonth);
  const { y, m } = parts(iso);
  const monthsIn = (y - fy.startYear) * 12 + (m - startMonth);
  const quarter = Math.floor(monthsIn / 3) + 1;
  const start = addMonths(fy.start, (quarter - 1) * 3);
  return { quarter, start, end: addDays(addMonths(start, 3), -1) };
}

// ---- Indian display formats ---------------------------------------------------

/** DD/MM/YYYY */
export function formatDateIN(iso: IsoDate | null | undefined): string {
  if (!iso) return "—";
  const { y, m, d } = parts(iso.slice(0, 10));
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "16 Oct" / "16 Oct 2026" — for chart axes. */
export function formatShortDate(iso: IsoDate, withYear = false): string {
  const { y, m, d } = parts(iso);
  return `${d} ${MONTHS[m - 1]}${withYear ? ` ${y}` : ""}`;
}

export function formatMonthLabel(iso: IsoDate): string {
  const { y, m } = parts(iso);
  return `${MONTHS[m - 1]} ${y}`;
}

/** DD/MM/YYYY, HH:MM in the business timezone. */
export function formatDateTimeIN(instant: string | Date | null | undefined, timeZone: string): string {
  if (!instant) return "—";
  const date = typeof instant === "string" ? new Date(instant) : instant;
  if (Number.isNaN(date.getTime())) return "—";
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return fmt.format(date).replace(",", "");
}

// ---- Parsing dates found in imported reports -------------------------------------

export type DateOrder = "dmy" | "mdy";

const MONTH_NAMES: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5,
  jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9,
  oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
};

function expandYear(y: number): number {
  return y < 100 ? 2000 + y : y;
}

/**
 * Parses a calendar date written the way Indian marketplace exports write
 * them. Numeric day/month order is ambiguous ("03/04/2026"), so the caller
 * passes the order detected for the whole file (see detectDateOrder). Any time
 * component is dropped: platform timestamps are already in IST, the business
 * timezone. ISO timestamps with an explicit offset are converted.
 */
export function parseReportDate(raw: unknown, order: DateOrder = "dmy", timeZone = "Asia/Kolkata"): IsoDate | null {
  if (raw === null || raw === undefined) return null;
  if (raw instanceof Date) {
    return Number.isNaN(raw.getTime()) ? null : dateInTimeZone(raw, timeZone);
  }
  const text = String(raw).trim();
  if (text === "") return null;

  // 2026-10-16, 2026/10/16, optionally with a time.
  let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:$|[T\s])/.exec(text);
  if (m) {
    // An explicit UTC offset means an instant, not a calendar date.
    if (/T.*(Z|[+-]\d{2}:?\d{2})$/.test(text)) {
      const instant = new Date(text);
      return Number.isNaN(instant.getTime()) ? null : dateInTimeZone(instant, timeZone);
    }
    const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
    return isValidYmd(y, mo, d) ? ymd(y, mo, d) : null;
  }

  // 16-10-2026, 16/10/26, 16.10.2026 (+ optional time)
  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})(?:$|\s)/.exec(text);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    const y = expandYear(Number(m[3]));
    const [d, mo] = order === "dmy" ? [a, b] : [b, a];
    return isValidYmd(y, mo, d) ? ymd(y, mo, d) : null;
  }

  // 16-Oct-2026, 16 Oct 2026, 16 October, 2026
  m = /^(\d{1,2})[\s-]+([A-Za-z]{3,9})[\s,-]+(\d{2}|\d{4})(?:$|\s)/.exec(text);
  if (m) {
    const mo = MONTH_NAMES[m[2].toLowerCase()];
    const y = expandYear(Number(m[3]));
    const d = Number(m[1]);
    return mo && isValidYmd(y, mo, d) ? ymd(y, mo, d) : null;
  }

  // Oct 16, 2026
  m = /^([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})(?:$|\s)/.exec(text);
  if (m) {
    const mo = MONTH_NAMES[m[1].toLowerCase()];
    const d = Number(m[2]);
    const y = Number(m[3]);
    return mo && isValidYmd(y, mo, d) ? ymd(y, mo, d) : null;
  }

  return null;
}

/**
 * Decides day-first vs month-first for a whole column of numeric dates. If any
 * value can only be read month-first (second part > 12, first ≤ 12) and none
 * can only be read day-first, the column is month-first; otherwise day-first,
 * the Indian convention. `ambiguous` is true when every value fits either way.
 */
export function detectDateOrder(values: unknown[]): { order: DateOrder; ambiguous: boolean; conflicting: boolean } {
  let dayFirstOnly = 0;
  let monthFirstOnly = 0;
  let numeric = 0;
  for (const v of values) {
    if (typeof v !== "string") continue;
    const m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})/.exec(v.trim());
    if (!m) continue;
    numeric++;
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (a > 12 && b <= 12) dayFirstOnly++;
    if (b > 12 && a <= 12) monthFirstOnly++;
  }
  const conflicting = dayFirstOnly > 0 && monthFirstOnly > 0;
  const order: DateOrder = monthFirstOnly > 0 && dayFirstOnly === 0 ? "mdy" : "dmy";
  return { order, ambiguous: numeric > 0 && dayFirstOnly === 0 && monthFirstOnly === 0, conflicting };
}
