// The §22.5 cron table, wired up.
//
// | Job              | Schedule  | Action                                    |
// | ack.sweep        | 1s        | §11.1 durable debounced photo ack         |
// | nudge.pending    | */15 min  | §15.2 nudge at +24h and +72h              |
// | abandon.stale    | daily 03  | sessions idle 7d → ABANDONED              |
// | retention.photos | daily 03:30 | delete raw/ >60d, renders >90d (§7.1)   |
// | reconcile.meesho | daily 09  | match order ids against the seller export |
// | health.alerts    | 5 min     | §22.3 alert conditions                    |
import { config } from "../config.ts";
import { logger } from "../logger.ts";
import { dailyAt, every } from "./scheduler.ts";
import { sweepAcks } from "./ack.ts";
import { runNudges } from "./nudge.ts";
import { abandonStale } from "./abandon.ts";
import { runRetention } from "./retention.ts";
import { reconcileFromFile } from "./reconcile.ts";
import { checkHealth } from "./health.ts";

export function startJobs(): void {
  if (!config.CRON_ENABLED) {
    logger.warn("cron jobs disabled (CRON_ENABLED=false)");
    return;
  }

  every(1_000, { name: "ack.sweep", run: sweepAcks });
  every(15 * 60_000, { name: "nudge.pending", run: runNudges });
  every(5 * 60_000, { name: "health.alerts", run: checkHealth });
  dailyAt("03:00", { name: "abandon.stale", run: abandonStale });
  dailyAt("03:30", { name: "retention.photos", run: runRetention });
  dailyAt("09:00", { name: "reconcile.meesho", run: reconcileFromFile });

  logger.info("cron jobs started");
}

export { sweepAcks, runNudges, abandonStale, runRetention, reconcileFromFile, checkHealth };
