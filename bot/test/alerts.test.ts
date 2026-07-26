import "./helpers/env.ts";
import test from "node:test";
import assert from "node:assert/strict";
import { alertAdmin, registerAlertSink, resetAlertDedupe } from "../src/alerts.ts";

// This file exists because the first version of alerts.ts did
// `const log = severity === "high" ? logger.error : logger.warn`, which detaches
// pino's method from its receiver and throws on first use — so the very first
// bad-signature webhook crashed the request instead of raising the alert.

test("alertAdmin logs and delivers without throwing", async () => {
  const seen: string[] = [];
  registerAlertSink(async (alert) => {
    seen.push(alert.title);
  });

  resetAlertDedupe();
  await assert.doesNotReject(() =>
    alertAdmin({ severity: "high", title: "Webhook signature mismatch", detail: "check WA_APP_SECRET" })
  );
  await alertAdmin({ severity: "critical", title: "WhatsApp token rejected" });
  await alertAdmin({ severity: "medium", title: "High escalation rate" });
  await alertAdmin({ severity: "low", title: "New order 311778447421" });

  assert.deepEqual(seen, [
    "Webhook signature mismatch",
    "WhatsApp token rejected",
    "High escalation rate",
    "New order 311778447421",
  ]);
});

test("repeat alerts are deduped inside the window", async () => {
  const seen: string[] = [];
  registerAlertSink(async (alert) => {
    seen.push(alert.title);
  });

  resetAlertDedupe();
  for (let i = 0; i < 5; i++) {
    await alertAdmin({ severity: "critical", title: "WhatsApp token rejected" });
  }
  // One 401 storm must not become 500 WhatsApp messages to the owner.
  assert.equal(seen.filter((t) => t === "WhatsApp token rejected").length, 1);
});

test("a throwing sink does not break the caller", async () => {
  registerAlertSink(async () => {
    throw new Error("telegram is down");
  });
  resetAlertDedupe();
  await assert.doesNotReject(() => alertAdmin({ severity: "high", title: "Failed webhook events" }));
});
