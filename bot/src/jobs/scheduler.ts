// §22.5 cron jobs, in-process. A 4-vCPU box running one bot container doesn't
// need a scheduler daemon; it needs jobs that can't overlap themselves and that
// log when they fail. That's all this is.
import { logger } from "../logger.ts";

export type Job = { name: string; run: () => Promise<void> };

type Handle = { stop: () => void };

const handles: Handle[] = [];

async function guarded(job: Job): Promise<void> {
  const started = Date.now();
  try {
    await job.run();
    logger.debug({ job: job.name, ms: Date.now() - started }, "job finished");
  } catch (err) {
    logger.error({ err, job: job.name }, "job failed");
  }
}

/** Run every `intervalMs`, never concurrently with itself. */
export function every(intervalMs: number, job: Job): void {
  let running = false;
  const timer = setInterval(async () => {
    if (running) return;
    running = true;
    await guarded(job);
    running = false;
  }, intervalMs);
  timer.unref();
  handles.push({ stop: () => clearInterval(timer) });
}

/**
 * Run once a day at local `HH:MM`. Re-arms after each run rather than using a
 * 24h interval, so a DST shift or a long-running job can't drift the schedule.
 */
export function dailyAt(hhmm: string, job: Job): void {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  let timer: NodeJS.Timeout;

  const schedule = () => {
    const now = new Date();
    const next = new Date(now);
    next.setHours(h, m, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    timer = setTimeout(async () => {
      await guarded(job);
      schedule();
    }, next.getTime() - now.getTime());
    timer.unref();
    handles.push({ stop: () => clearTimeout(timer) });
  };

  schedule();
}

export function stopAllJobs(): void {
  for (const h of handles) h.stop();
  handles.length = 0;
}
