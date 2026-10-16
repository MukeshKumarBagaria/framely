"use client";

// Browser-side calls to /api/business-analysis. Every mutation carries the
// CSRF header the server requires; an expired session sends the user to the
// login page with a clear message instead of failing silently.

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const BASE = "/api/business-analysis";

type Options = { method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE"; body?: unknown; form?: FormData; signal?: AbortSignal };

export async function api<T = unknown>(path: string, opts: Options = {}): Promise<T> {
  const method = opts.method ?? (opts.body !== undefined || opts.form ? "POST" : "GET");
  const headers: Record<string, string> = { "x-business-analysis": "1", accept: "application/json" };
  let body: BodyInit | undefined;
  if (opts.form) body = opts.form;
  else if (opts.body !== undefined) {
    headers["content-type"] = "application/json";
    body = JSON.stringify(opts.body);
  }
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { method, headers, body, signal: opts.signal, credentials: "same-origin", cache: "no-store" });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new ApiError(0, "network", "Could not reach the server. Check your connection.");
  }
  if (res.status === 401) {
    const json = await res.json().catch(() => null);
    const code = json?.error?.code ?? "unauthenticated";
    if (!path.startsWith("/auth/")) {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/business-analysis/login?reason=${code === "session_expired" ? "expired" : "signin"}&next=${next}`;
    }
    throw new ApiError(401, code, json?.error?.message ?? "Please sign in again.");
  }
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new ApiError(res.status, json?.error?.code ?? "error", json?.error?.message ?? `Request failed (${res.status})`, json?.error?.details);
  }
  return json as T;
}

/** Field-level messages from a 400 response, keyed by path. */
export function fieldErrors(e: unknown): Record<string, string> {
  if (!(e instanceof ApiError) || !Array.isArray(e.details)) return {};
  const out: Record<string, string> = {};
  for (const d of e.details as { path: string; message: string }[]) if (d.path && !out[d.path]) out[d.path] = d.message;
  return out;
}

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    const fields = fieldErrors(e);
    const first = Object.entries(fields)[0];
    return first ? `${e.message} ${first[0]}: ${first[1]}` : e.message;
  }
  return "Something went wrong.";
}

/** Upload with progress (fetch cannot report upload progress). */
export function uploadWithProgress<T>(path: string, form: FormData, onProgress: (fraction: number) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${BASE}${path}`);
    xhr.setRequestHeader("x-business-analysis", "1");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onerror = () => reject(new ApiError(0, "network", "Upload failed. Check your connection."));
    xhr.onload = () => {
      let json: { error?: { code?: string; message?: string; details?: unknown } } | null = null;
      try {
        json = JSON.parse(xhr.responseText);
      } catch {
        /* non-JSON error page */
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(json as T);
      else if (xhr.status === 401) {
        window.location.href = `/business-analysis/login?reason=expired&next=${encodeURIComponent(window.location.pathname)}`;
        reject(new ApiError(401, "unauthenticated", "Please sign in again."));
      } else reject(new ApiError(xhr.status, json?.error?.code ?? "error", json?.error?.message ?? `Upload failed (${xhr.status})`, json?.error?.details));
    };
    xhr.send(form);
  });
}
