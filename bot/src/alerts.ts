// Admin alerting — Guide §22.3. Deliberately dependency-free: the transport is
// registered from outside (index.ts wires the WhatsApp sink), so the WhatsApp
// client can raise a "token is dead" alert without importing the thing that
// sends alerts through the WhatsApp client.
import { logger } from "./logger.ts";

export type AlertSeverity = "critical" | "high" | "medium" | "low";
export type Alert = { severity: AlertSeverity; title: string; detail?: string };
export type AlertSink = (alert: Alert) => Promise<void>;

const sinks: AlertSink[] = [];

export function registerAlertSink(sink: AlertSink): void {
  sinks.push(sink);
}

// A misbehaving dependency can produce the same alert hundreds of times a
// minute (every Graph call 401ing, say). One message per key per window is
// enough to get someone to a terminal.
const DEDUPE_WINDOW_MS = 15 * 60_000;
const lastSent = new Map<string, number>();

export async function alertAdmin(alert: Alert): Promise<void> {
  // Call the method on the logger, don't detach it — pino's methods rely on
  // `this` and a bare `const log = logger.error` throws on first use.
  const line = `ALERT ${alert.severity}: ${alert.title}`;
  if (alert.severity === "critical" || alert.severity === "high") logger.error({ alert }, line);
  else logger.warn({ alert }, line);

  const key = `${alert.severity}:${alert.title}`;
  const now = Date.now();
  const previous = lastSent.get(key);
  if (previous !== undefined && now - previous < DEDUPE_WINDOW_MS) return;
  lastSent.set(key, now);

  const results = await Promise.allSettled(sinks.map((sink) => sink(alert)));
  for (const r of results) {
    if (r.status === "rejected") logger.error({ err: r.reason }, "alert sink failed");
  }
}

/** Test/ops helper — forget the dedupe window. */
export function resetAlertDedupe(): void {
  lastSent.clear();
}
