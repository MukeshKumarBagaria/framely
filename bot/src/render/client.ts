// Renderer integration — Guide §12 (❄ frozen contract). One HTTP call is the
// entire coupling between the bot and the template renderer; §24 says this seam
// later becomes `POST /v1/projects/:id/render` in the SaaS, so keep it clean.
import { config } from "../config.ts";
import { logger } from "../logger.ts";

export type RenderWarning = {
  code: string; // e.g. "LOW_DPI"
  slot?: number;
  effectiveDpi?: number;
  message?: string;
};

export type RenderRequest = {
  sessionId: string;
  designId: string;
  folder: string;
  photos: string[];
  fields: Record<string, string>;
  outputs: { kind: "preview" | "print"; format: "png" | "pdf"; maxWidth?: number; dpi?: number; bleedMm?: number }[];
  revision: number;
  photoLayoutId?: string;
};

export type RenderResponse = {
  ok: true;
  preview: string;
  print: string;
  warnings?: RenderWarning[];
  ms?: number;
};

export type RenderFailure = { ok: false; code?: string; message?: string };

export class RenderError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(`${code}: ${message}`);
    this.name = "RenderError";
    this.code = code;
  }
}

/** §12.1 default outputs: a 1080px preview for WhatsApp, a 300 DPI print PDF. */
export function defaultOutputs(): RenderRequest["outputs"] {
  return [
    { kind: "preview", format: "png", maxWidth: 1080 },
    { kind: "print", format: "pdf", dpi: 300, bleedMm: 3 },
  ];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * §12.4 — 90s timeout, 2 retries with 5s backoff. The caller turns a final
 * failure into a HUMAN escalation; the customer is never shown an error.
 */
export async function render(req: RenderRequest): Promise<RenderResponse> {
  const attempts = config.RENDERER_RETRIES + 1;
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const started = Date.now();
    try {
      const res = await fetch(`${config.RENDERER_URL}/render`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
        signal: AbortSignal.timeout(config.RENDERER_TIMEOUT_MS),
      });

      const body = (await res.json().catch(() => ({}))) as RenderResponse | RenderFailure;

      if (!res.ok || body.ok !== true) {
        const failure = body as RenderFailure;
        throw new RenderError(failure.code ?? `HTTP_${res.status}`, failure.message ?? "render failed");
      }

      logger.info(
        { sessionId: req.sessionId, revision: req.revision, ms: body.ms ?? Date.now() - started, attempt },
        "render ok"
      );
      return body;
    } catch (err) {
      lastError = err as Error;
      logger.warn({ err, sessionId: req.sessionId, attempt }, "render attempt failed");
      // ASSET_MISSING and friends are deterministic — retrying just wastes 90s.
      if (err instanceof RenderError && !/^HTTP_5|^HTTP_0/.test(err.code)) break;
      if (attempt < attempts) await sleep(5_000);
    }
  }

  throw new RenderError("RENDER_UNAVAILABLE", lastError?.message ?? "renderer did not respond");
}

/** §12.3 — LOW_DPI is the warning worth interrupting the customer for. */
export function lowDpiWarnings(warnings: RenderWarning[] | undefined): RenderWarning[] {
  return (warnings ?? []).filter((w) => w.code === "LOW_DPI");
}
