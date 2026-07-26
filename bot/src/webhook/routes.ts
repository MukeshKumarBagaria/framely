// §10.1 / §10.2 — the webhook endpoints.
//
// "The single most common production bug": if the POST handler does real work
// and takes >5s, Meta marks the delivery failed and re-sends it, and you get
// duplicate photos, duplicate replies, duplicate counter increments. This
// handler verifies the signature, writes one row, and returns 200. Nothing
// else. All work happens in the worker.
import crypto from "node:crypto";
import type { FastifyInstance, FastifyPluginAsync, FastifyRequest } from "fastify";
import { config } from "../config.ts";
import { alertAdmin } from "../alerts.ts";
import { verifySignature } from "../whatsapp/signature.ts";
import { enqueue, type Worker } from "./queue.ts";

declare module "fastify" {
  interface FastifyRequest {
    rawBody?: Buffer;
  }
}

function safeEqual(a: string, b: string): boolean {
  const ha = crypto.createHash("sha256").update(a).digest();
  const hb = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

/**
 * `persist` is injectable so the route can be tested without a database — the
 * ACK-latency and signature behaviour are the parts worth testing, and neither
 * needs Postgres.
 */
export function webhookRoutes(worker: Worker, persist: (payload: unknown) => Promise<number> = enqueue): FastifyPluginAsync {
  return async (app: FastifyInstance) => {
    // Encapsulated parser: the raw bytes are required for HMAC verification,
    // and any reserialization (key order, whitespace) would break it.
    app.addContentTypeParser("application/json", { parseAs: "buffer" }, (req, body, done) => {
      const buf = body as Buffer;
      req.rawBody = buf;
      if (buf.length === 0) return done(null, {});
      try {
        done(null, JSON.parse(buf.toString("utf8")));
      } catch (err) {
        // A body that isn't JSON is the sender's bug, not ours — 400, not 500,
        // so it doesn't show up in the "server is broken" alerts.
        const bad = err as Error & { statusCode?: number };
        bad.statusCode = 400;
        done(bad, undefined);
      }
    });

    // ---- §10.1 verification handshake ----
    app.get(
      "/whatsapp/webhook",
      async (
        req: FastifyRequest<{
          Querystring: { "hub.mode"?: string; "hub.verify_token"?: string; "hub.challenge"?: string };
        }>,
        reply
      ) => {
        const mode = req.query["hub.mode"];
        const token = req.query["hub.verify_token"];
        const challenge = req.query["hub.challenge"] ?? "";

        if (mode === "subscribe" && token && safeEqual(token, config.WA_VERIFY_TOKEN)) {
          // Must be the raw challenge, not JSON.
          return reply.code(200).type("text/plain").send(challenge);
        }
        req.log.warn({ mode }, "webhook verification rejected");
        return reply.code(403).send();
      }
    );

    // ---- §10.2 receiver: ACK first, work later ----
    app.post("/whatsapp/webhook", async (req, reply) => {
      const raw = req.rawBody ?? Buffer.alloc(0);
      const signature = req.headers["x-hub-signature-256"];

      if (!verifySignature(raw, typeof signature === "string" ? signature : undefined, config.WA_APP_SECRET)) {
        // §19 E18 — wrong WA_APP_SECRET, or a proxy mangled the raw body.
        req.log.warn({ hasSignature: Boolean(signature) }, "webhook signature mismatch");
        void alertAdmin({
          severity: "high",
          title: "Webhook signature mismatch",
          detail: "Check WA_APP_SECRET and that no proxy is rewriting the request body (§19 E18).",
        });
        return reply.code(401).send();
      }

      await persist(req.body);
      reply.code(200).send();

      // After the ACK — the response is already on the wire.
      worker.wake();
      return reply;
    });
  };
}
