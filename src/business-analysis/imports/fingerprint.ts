// Content fingerprints for duplicate detection. A fingerprint is a SHA-256 of
// a canonical JSON encoding (sorted keys, trimmed strings), so the same data
// always hashes the same regardless of column order or stray whitespace.
import { createHash } from "node:crypto";

export function canonicalize(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "string") return JSON.stringify(value.trim().replace(/\s+/g, " "));
  if (typeof value === "number" || typeof value === "boolean") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalize(v)}`).join(",")}}`;
  }
  return JSON.stringify(String(value));
}

export function sha256Hex(data: string | Uint8Array): string {
  return createHash("sha256").update(data).digest("hex");
}

export function fingerprint(scope: string, value: unknown): string {
  return sha256Hex(`${scope}\n${canonicalize(value)}`);
}
