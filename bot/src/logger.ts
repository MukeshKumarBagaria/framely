// Structured logging. Fastify ships pino, so we reuse the same instance for the
// worker and cron jobs — one log stream, one format, greppable by session id.
import { pino } from "pino";
import { config, isProd } from "./config.ts";

export const logger = pino({
  level: config.LOG_LEVEL,
  // Never let a token reach the log stream (§23 "token leaked").
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers['x-hub-signature-256']",
      "headers.authorization",
      "token",
      "*.token",
      "WA_TOKEN",
    ],
    censor: "[redacted]",
  },
  transport: isProd
    ? undefined
    : { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss.l" } },
});

export type Logger = typeof logger;
