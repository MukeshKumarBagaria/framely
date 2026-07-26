// Guide §9.2 / §9.3 — "Hard limits: violating any of these returns a 400".
// We enforce them locally instead of learning about them from Meta, because a
// 400 mid-flow means a customer sitting in silence. Regional scripts are the
// real hazard (§16.3): "जन्मदिन का कोलाज" is 16 chars, and Tamil overflows fast.
//
// Everything here counts *code points*, not UTF-16 units — an emoji in a button
// title is one character to WhatsApp, two to `String.length`.
import type { ListRow, ListSection, ReplyButton } from "./types.ts";

export const LIMITS = {
  listButton: 20,
  listSections: 10,
  listRowsTotal: 10,
  rowId: 200,
  rowTitle: 24,
  rowDescription: 72,
  headerText: 60,
  bodyText: 1024,
  footerText: 60,
  buttons: 3,
  buttonTitle: 20,
  buttonId: 256,
  imageCaption: 1024,
  textBody: 4096,
} as const;

export function len(s: string): number {
  return [...s].length;
}

/** Truncate on a code-point boundary, with an ellipsis when it actually cut. */
export function clamp(s: string, max: number): string {
  const chars = [...s];
  if (chars.length <= max) return s;
  return chars.slice(0, Math.max(0, max - 1)).join("") + "…";
}

export class LimitError extends Error {
  readonly field: string;
  constructor(field: string, message: string) {
    super(`${field}: ${message}`);
    this.name = "LimitError";
    this.field = field;
  }
}

function assertMax(value: string, max: number, field: string): void {
  if (len(value) > max) {
    throw new LimitError(field, `${len(value)} chars exceeds the ${max}-char limit ("${value}")`);
  }
}

/**
 * Validate an interactive list against every documented cap. Throws LimitError,
 * which the tests assert on for all 7 languages (§20.1).
 */
export function assertListValid(input: {
  button: string;
  body: string;
  header?: string;
  footer?: string;
  sections: ListSection[];
}): void {
  assertMax(input.button, LIMITS.listButton, "action.button");
  assertMax(input.body, LIMITS.bodyText, "body.text");
  if (input.header !== undefined) assertMax(input.header, LIMITS.headerText, "header.text");
  if (input.footer !== undefined) assertMax(input.footer, LIMITS.footerText, "footer.text");

  if (input.sections.length === 0) throw new LimitError("sections", "at least one section required");
  if (input.sections.length > LIMITS.listSections) {
    throw new LimitError("sections", `${input.sections.length} exceeds ${LIMITS.listSections}`);
  }

  const rows = input.sections.flatMap((s) => s.rows);
  if (rows.length === 0) throw new LimitError("rows", "at least one row required");
  if (rows.length > LIMITS.listRowsTotal) {
    throw new LimitError(
      "rows",
      `${rows.length} rows across all sections exceeds the hard total of ${LIMITS.listRowsTotal} — paginate instead`
    );
  }

  const seen = new Set<string>();
  for (const row of rows) {
    assertMax(row.id, LIMITS.rowId, "row.id");
    assertMax(row.title, LIMITS.rowTitle, "row.title");
    if (row.description !== undefined) assertMax(row.description, LIMITS.rowDescription, "row.description");
    if (seen.has(row.id)) throw new LimitError("row.id", `duplicate row id "${row.id}"`);
    seen.add(row.id);
  }
}

/** §9.3 — max 3 buttons, title ≤ 20, unique ids. */
export function assertButtonsValid(body: string, buttons: ReplyButton[]): void {
  assertMax(body, LIMITS.bodyText, "body.text");
  if (buttons.length === 0) throw new LimitError("buttons", "at least one button required");
  if (buttons.length > LIMITS.buttons) {
    throw new LimitError("buttons", `${buttons.length} exceeds the max of ${LIMITS.buttons}`);
  }
  const seen = new Set<string>();
  for (const b of buttons) {
    assertMax(b.title, LIMITS.buttonTitle, "button.title");
    assertMax(b.id, LIMITS.buttonId, "button.id");
    if (seen.has(b.id)) throw new LimitError("button.id", `duplicate button id "${b.id}"`);
    seen.add(b.id);
  }
}

/**
 * Best-effort fit for rows built from customer-facing catalog data (design
 * names), where we'd rather ship a truncated title than fail the send. Menu
 * strings we control are validated strictly instead.
 */
export function fitRow(row: ListRow): ListRow {
  return {
    id: clamp(row.id, LIMITS.rowId),
    title: clamp(row.title, LIMITS.rowTitle),
    ...(row.description === undefined ? {} : { description: clamp(row.description, LIMITS.rowDescription) }),
  };
}
