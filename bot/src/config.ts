// Environment contract — Guide §3.4 (❄ frozen) plus the operational knobs the
// runbook (§22) needs. Parsed once, at boot, so a missing secret is a startup
// crash and never a 2am `undefined` in a Graph API call.
import { z } from "zod";

// "true"/"1"/"yes" → true, "false"/"0"/"no" → false. Absent → the given default.
const bool = (fallback: boolean) => z.stringbool().default(fallback);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default("0.0.0.0"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),

  // ---- WhatsApp Cloud API (§3.4) ----
  WA_GRAPH_VERSION: z.string().regex(/^v\d+\.\d+$/).default("v23.0"),
  WA_PHONE_NUMBER_ID: z.string().min(1),
  WA_WABA_ID: z.string().min(1).optional(),
  WA_TOKEN: z.string().min(1),
  WA_VERIFY_TOKEN: z.string().min(16, "invent a random 32-char string"),
  WA_APP_SECRET: z.string().min(1),

  // ---- Storage & services ----
  DATABASE_URL: z.string().min(1),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),
  STORAGE_ROOT: z.string().default("/data/customers"),
  PUBLIC_BASE_URL: z.string().url().default("https://api.giftmahal.in"),

  RENDERER_URL: z.string().url().default("http://renderer:4000"),
  RENDERER_TIMEOUT_MS: z.coerce.number().int().positive().default(90_000), // §12.4
  RENDERER_RETRIES: z.coerce.number().int().min(0).default(2), // §12.4

  CHATWOOT_URL: z.string().url().optional(),
  CHATWOOT_API_TOKEN: z.string().optional(),
  CHATWOOT_ACCOUNT_ID: z.string().optional(),
  CHATWOOT_INBOX_ID: z.string().optional(),

  ADMIN_ALERT_PHONE: z.string().regex(/^\d{10,15}$/).optional(),
  ADMIN_API_TOKEN: z.string().min(16, "dashboard bearer token, >=16 chars"),

  // ---- Business config ----
  MEESHO_STORE_LINK: z.string().url().default("https://meesho.com/s/p/XXXXX"),
  DESIGN_ASSET_BASE_URL: z.string().url().default("https://cdn.giftmahal.in"),

  // ---- Behaviour knobs (defaults are the guide's numbers) ----
  PHOTO_ACK_DEBOUNCE_MS: z.coerce.number().int().positive().default(3_000), // §11.1
  MAX_REVISIONS: z.coerce.number().int().positive().default(3), // §13.3
  MAX_PARSE_RETRIES: z.coerce.number().int().positive().default(3), // §10.6
  MAX_NUDGES: z.coerce.number().int().min(0).default(2), // §15.2
  ABANDON_AFTER_DAYS: z.coerce.number().int().positive().default(7), // §8.1
  RAW_RETENTION_DAYS: z.coerce.number().int().positive().default(60), // §7.1
  RENDER_RETENTION_DAYS: z.coerce.number().int().positive().default(90), // §7.1

  WORKER_ENABLED: bool(true),
  WORKER_POLL_MS: z.coerce.number().int().positive().default(500), // §10.3
  WORKER_MAX_ATTEMPTS: z.coerce.number().int().positive().default(3),
  CRON_ENABLED: bool(true),
});

export type Config = z.infer<typeof envSchema>;

function load(): Config {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}

export const config: Config = load();

export const isProd = config.NODE_ENV === "production";
