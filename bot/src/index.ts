// Entry point. Migrate, wire alerting, start the worker, the HTTP server and
// the cron table — then shut all of it down cleanly on SIGTERM so a deploy
// never kills a send mid-flight.
import { config } from "./config.ts";
import { logger } from "./logger.ts";
import { closePool } from "./db/index.ts";
import { migrate } from "./db/migrate.ts";
import { registerAlertSink } from "./alerts.ts";
import { sendText } from "./whatsapp/client.ts";
import { startWorker } from "./webhook/queue.ts";
import { handleEvent } from "./webhook/dispatcher.ts";
import { startServer } from "./server.ts";
import { startJobs } from "./jobs/index.ts";
import { stopAllJobs } from "./jobs/scheduler.ts";

async function main(): Promise<void> {
  await migrate();

  // §22.3 — alerts go to your own WhatsApp. Registered here rather than inside
  // the alert module so a token failure can still raise an alert (it just
  // won't be able to deliver this particular one).
  if (config.ADMIN_ALERT_PHONE) {
    registerAlertSink(async (alert) => {
      const icon = alert.severity === "critical" ? "🚨" : alert.severity === "high" ? "⚠️" : "ℹ️";
      await sendText(
        config.ADMIN_ALERT_PHONE!,
        `${icon} ${alert.title}\n\n${alert.detail ?? ""}`.trim()
      );
    });
  }

  const worker = config.WORKER_ENABLED
    ? startWorker(handleEvent)
    : { wake: () => {}, stop: async () => {} };
  if (!config.WORKER_ENABLED) logger.warn("webhook worker disabled (WORKER_ENABLED=false)");

  const app = await startServer(worker);
  startJobs();

  logger.info(
    { port: config.PORT, graph: config.WA_GRAPH_VERSION, env: config.NODE_ENV },
    "gift mahal bot is up"
  );

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, "shutting down");
    stopAllJobs();
    // Stop accepting webhooks first — Meta will retry anything we refuse now,
    // which is exactly the behaviour we want during a restart.
    await app.close().catch((err) => logger.error({ err }, "server close failed"));
    await worker.stop();
    await closePool().catch(() => {});
    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("unhandledRejection", (err) => logger.error({ err }, "unhandled rejection"));
}

main().catch((err) => {
  logger.fatal({ err }, "failed to start");
  process.exit(1);
});
