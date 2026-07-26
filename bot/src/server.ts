// HTTP surface: the WhatsApp webhook, the dashboard API, and health checks.
import Fastify from "fastify";
import { config } from "./config.ts";
import { logger } from "./logger.ts";
import { queryOne } from "./db/index.ts";
import { webhookRoutes } from "./webhook/routes.ts";
import { adminRoutes } from "./admin/routes.ts";
import type { Worker } from "./webhook/queue.ts";

export async function buildServer(worker: Worker) {
  const app = Fastify({
    loggerInstance: logger,
    // Caddy terminates TLS and sets X-Forwarded-*; without this every request
    // logs as coming from the proxy.
    trustProxy: true,
    bodyLimit: 2 * 1024 * 1024,
  });

  app.get("/health", async () => ({ ok: true, uptime: process.uptime() }));

  // Readiness: the DB is the only hard dependency for accepting a webhook.
  app.get("/ready", async (_req, reply) => {
    try {
      await queryOne("select 1 as ok");
      return { ok: true };
    } catch (err) {
      logger.error({ err }, "readiness check failed");
      return reply.code(503).send({ ok: false });
    }
  });

  await app.register(webhookRoutes(worker));
  await app.register(adminRoutes);

  app.setErrorHandler((err: unknown, req, reply) => {
    req.log.error({ err }, "unhandled request error");
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    void reply.code(status).send({ error: "internal error" });
  });

  return app;
}

export type AppServer = Awaited<ReturnType<typeof buildServer>>;

export async function startServer(worker: Worker): Promise<AppServer> {
  const app = await buildServer(worker);
  await app.listen({ port: config.PORT, host: config.HOST });
  return app;
}
