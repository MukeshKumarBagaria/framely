// The durable webhook queue (§10.3). Rows in `webhook_events` are claimed with
// `for update skip locked`, so you can run two bot containers without either
// processing the same delivery twice.
import { query, queryOne } from "../db/index.ts";
import { config } from "../config.ts";
import { logger } from "../logger.ts";
import { alertAdmin } from "../alerts.ts";

export type WebhookEvent = {
  id: number;
  raw: unknown;
  status: "pending" | "processing" | "done" | "failed";
  attempts: number;
  error: string | null;
  created_at: Date;
};

export async function enqueue(payload: unknown): Promise<number> {
  const row = await queryOne<{ id: number }>(
    "insert into webhook_events (raw) values ($1) returning id",
    [JSON.stringify(payload)]
  );
  return row?.id ?? 0;
}

async function claimNext(): Promise<WebhookEvent | null> {
  return queryOne<WebhookEvent>(`
    update webhook_events set status = 'processing', attempts = attempts + 1
     where id = (select id from webhook_events
                  where status = 'pending'
                  order by id
                  limit 1
                  for update skip locked)
    returning *`);
}

/** Returns true when it processed something, so the caller can drain in a loop. */
export async function processNext(handler: (raw: unknown) => Promise<void>): Promise<boolean> {
  const event = await claimNext();
  if (!event) return false;

  try {
    await handler(event.raw);
    await query("update webhook_events set status = 'done', processed_at = now(), error = null where id = $1", [
      event.id,
    ]);
  } catch (err) {
    const message = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    const exhausted = event.attempts >= config.WORKER_MAX_ATTEMPTS;
    const status = exhausted ? "failed" : "pending";
    await query("update webhook_events set status = $2, error = $3 where id = $1", [
      event.id,
      status,
      message.slice(0, 2000),
    ]);
    logger.error({ err, eventId: event.id, attempts: event.attempts, status }, "webhook event failed");
    if (exhausted) {
      await alertAdmin({
        severity: "high",
        title: "Webhook event failed permanently",
        detail: `event ${event.id} after ${event.attempts} attempts: ${message.slice(0, 300)}`,
      });
    }
  }
  return true;
}

export type Worker = { wake: () => void; stop: () => Promise<void> };

/**
 * Poll-plus-wake loop. The webhook route calls `wake()` after ACKing, so the
 * usual latency is "as fast as Postgres", and the poll interval is only a
 * safety net for events enqueued by another process.
 */
export function startWorker(handler: (raw: unknown) => Promise<void>): Worker {
  let running = false;
  let stopped = false;
  let timer: NodeJS.Timeout | undefined;

  const drain = async (): Promise<void> => {
    if (running || stopped) return;
    running = true;
    try {
      while (!stopped && (await processNext(handler))) {
        /* keep draining */
      }
    } catch (err) {
      logger.error({ err }, "worker loop error");
    } finally {
      running = false;
    }
  };

  timer = setInterval(() => void drain(), config.WORKER_POLL_MS);
  timer.unref();
  void drain();

  return {
    wake: () => void drain(),
    stop: async () => {
      stopped = true;
      if (timer) clearInterval(timer);
      // Let an in-flight event finish rather than killing it mid-send.
      for (let i = 0; i < 100 && running; i++) await new Promise((r) => setTimeout(r, 50));
    },
  };
}

/** §22.1 daily check — surfaced on the dashboard and by the alert cron. */
export async function failedCount(): Promise<number> {
  const row = await queryOne<{ n: number }>(
    "select count(*)::int as n from webhook_events where status = 'failed'"
  );
  return row?.n ?? 0;
}
