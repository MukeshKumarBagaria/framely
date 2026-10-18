import "server-only";
import { z } from "zod";
import { isValidTimeZone } from "../domain/dates";

// Server-side configuration. Everything here is read on the server only: the
// browser never talks to Supabase directly (all data goes through server
// components and route handlers), so no Supabase variable needs to be
// NEXT_PUBLIC_. The NEXT_PUBLIC_ names are accepted as fallbacks for projects
// that already define them.
//
// SUPABASE_SERVICE_ROLE_KEY is deliberately not read: every query runs as the
// signed-in user under Row Level Security.

const schema = z.object({
  supabaseUrl: z.string({ error: "SUPABASE_URL is not set (your Supabase project URL)" }).url("SUPABASE_URL must be your project URL, e.g. https://xyz.supabase.co"),
  supabaseAnonKey: z.string({ error: "SUPABASE_ANON_KEY is not set (the anon or publishable key)" }).min(20, "SUPABASE_ANON_KEY (or the publishable key) is missing"),
  allowedEmails: z.array(z.string().email()),
  maxUploadMb: z.number().int().min(1).max(50),
  timeZone: z.string().refine(isValidTimeZone, "BUSINESS_ANALYSIS_TIMEZONE must be an IANA timezone"),
  storageBucket: z.string().min(3).max(63),
  storeDocuments: z.boolean(),
});

export type ServerEnv = z.infer<typeof schema>;

export class ConfigurationError extends Error {
  constructor(public readonly issues: string[]) {
    super(`Business analysis is not configured: ${issues.join("; ")}`);
    this.name = "ConfigurationError";
  }
}

function read(name: string, ...fallbacks: string[]): string | undefined {
  for (const key of [name, ...fallbacks]) {
    const v = process.env[key];
    if (v !== undefined && v.trim() !== "" && !/^YOUR_/.test(v.trim())) return v.trim();
  }
  return undefined;
}

let cached: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = schema.safeParse({
    supabaseUrl: read("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"),
    supabaseAnonKey: read("SUPABASE_ANON_KEY", "SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    allowedEmails: parseAllowedEmails(read("BUSINESS_ANALYSIS_ALLOWED_EMAILS") ?? ""),
    maxUploadMb: Number(read("BUSINESS_ANALYSIS_MAX_UPLOAD_MB") ?? 20),
    timeZone: read("BUSINESS_ANALYSIS_TIMEZONE") ?? "Asia/Kolkata",
    storageBucket: read("BUSINESS_ANALYSIS_STORAGE_BUCKET") ?? "business-analysis",
    storeDocuments: (read("BUSINESS_ANALYSIS_STORE_DOCUMENTS") ?? "true").toLowerCase() !== "false",
  });
  if (!parsed.success) {
    throw new ConfigurationError(parsed.error.issues.map((i) => i.message));
  }
  cached = parsed.data;
  return cached;
}

export function parseAllowedEmails(raw: string): string[] {
  return raw
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0 && e.includes("@"));
}

/** Fail closed: an empty allowlist admits nobody. */
export function isEmailAllowed(email: string | null | undefined, allowed: string[]): boolean {
  if (!email) return false;
  return allowed.includes(email.trim().toLowerCase());
}
