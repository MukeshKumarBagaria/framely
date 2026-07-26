// §22.3 — the alert table, as code.
//
// | Condition                              | Severity |
// | webhook_events failed count > 0        | High     |
// | any 401 from Graph (token)             | Critical | ← raised in whatsapp/client
// | renderer failure rate > 5% in an hour  | High     |
// | escalation count > 10/day              | Medium   |
// | sessions stuck in RENDERING > 5 min    | High     |
import { query, queryOne } from "../db/index.ts";
import { alertAdmin } from "../alerts.ts";

export async function checkHealth(): Promise<void> {
  const failed = await queryOne<{ n: number }>(
    "select count(*)::int as n from webhook_events where status = 'failed'"
  );
  if ((failed?.n ?? 0) > 0) {
    await alertAdmin({
      severity: "high",
      title: "Failed webhook events",
      detail: `${failed?.n} events exhausted their retries. Inspect: select * from webhook_events where status='failed';`,
    });
  }

  const stuck = await query<{ id: string }>(
    "select id from sessions where state = 'RENDERING' and updated_at < now() - interval '5 minutes'"
  );
  if (stuck.rowCount) {
    await alertAdmin({
      severity: "high",
      title: "Sessions stuck in RENDERING",
      detail: `${stuck.rowCount} session(s) have been rendering for >5 min: ${stuck.rows
        .slice(0, 5)
        .map((r) => r.id)
        .join(", ")}`,
    });
  }

  const escalations = await queryOne<{ n: number }>(
    "select count(*)::int as n from sessions where state = 'HUMAN' and updated_at > now() - interval '1 day'"
  );
  if ((escalations?.n ?? 0) > 10) {
    await alertAdmin({
      severity: "medium",
      title: "High escalation rate",
      detail: `${escalations?.n} escalations in 24h. The most common reason is your next automation (§22.2).`,
    });
  }

  const renderFailures = await queryOne<{ failures: number; total: number }>(
    `select
       count(*) filter (where human_reason = 'render_failed')::int as failures,
       greatest(count(*), 1)::int as total
     from sessions where updated_at > now() - interval '1 hour'`
  );
  if (renderFailures && renderFailures.total >= 20 && renderFailures.failures / renderFailures.total > 0.05) {
    await alertAdmin({
      severity: "high",
      title: "Renderer failure rate above 5%",
      detail: `${renderFailures.failures}/${renderFailures.total} sessions in the last hour ended in render_failed.`,
    });
  }
}
