// §7.1 retention (DPDP Act 2023).
//
//   raw/ photos      60 days after dispatch
//   rendered/, final/ 90 days
//   screenshots/     60 days
//   DB rows          kept; phone anonymised after 1 year
//
// Deleting customer photos on a schedule is a legal obligation, not a disk
// cleanup — so this job logs what it removed and never silently skips.
import { query } from "../db/index.ts";
import { config } from "../config.ts";
import { logger } from "../logger.ts";
import { purgeSubfolder } from "../media/storage.ts";

type Row = { id: string; folder_path: string | null };

export async function runRetention(): Promise<void> {
  await purgeRawPhotos();
  await purgeRenders();
  await anonymiseOldSessions();
}

async function purgeRawPhotos(): Promise<void> {
  const res = await query<Row>(
    `select s.id, s.folder_path
       from sessions s
       left join orders o on o.session_id = s.id
      where s.raw_purged_at is null
        and s.folder_path is not null
        and coalesce(o.dispatched_at, s.updated_at) < now() - ($1 || ' days')::interval
      limit 500`,
    [String(config.RAW_RETENTION_DAYS)]
  );

  for (const row of res.rows) {
    if (!row.folder_path) continue;
    const photos = await purgeSubfolder(row.folder_path, "raw");
    const shots = await purgeSubfolder(row.folder_path, "screenshots");
    await query("update sessions set raw_purged_at = now() where id = $1", [row.id]);
    await query("delete from media where session_id = $1", [row.id]);
    logger.info({ sessionId: row.id, photos, screenshots: shots }, "raw media purged (retention)");
  }
}

async function purgeRenders(): Promise<void> {
  const res = await query<Row>(
    `select id, folder_path from sessions
      where renders_purged_at is null
        and folder_path is not null
        and updated_at < now() - ($1 || ' days')::interval
      limit 500`,
    [String(config.RENDER_RETENTION_DAYS)]
  );

  for (const row of res.rows) {
    if (!row.folder_path) continue;
    const rendered = await purgeSubfolder(row.folder_path, "rendered");
    const finals = await purgeSubfolder(row.folder_path, "final");
    await query(
      "update sessions set renders_purged_at = now(), current_render = null, current_print = null where id = $1",
      [row.id]
    );
    logger.info({ sessionId: row.id, rendered, finals }, "renders purged (retention)");
  }
}

/** "DB rows: keep (anonymize phone after 1 year)". */
async function anonymiseOldSessions(): Promise<void> {
  const res = await query(
    `update sessions
        set phone_e164 = 'anon_' || substr(md5(phone_e164), 1, 12),
            wa_profile_name = null,
            ctwa_clid = null
      where created_at < now() - interval '1 year'
        and phone_e164 not like 'anon_%'`
  );
  if (res.rowCount) logger.info({ count: res.rowCount }, "old sessions anonymised");
}
