-- Columns the running bot needs that §6 doesn't spell out. Kept separate so
-- 001 stays a faithful copy of the frozen contract and every deviation is
-- visible here with its justification.

alter table sessions
  -- §10.6 retryOrEscalate reads/writes session.retry_count.
  add column retry_count      int not null default 0,
  -- §13.1 `change_text` sets field_cursor: 0 — which text field we're asking for.
  add column field_cursor      int not null default 0,
  -- §13.2 photo replacement: next inbound image overwrites this slot instead of appending.
  add column replacing_slot    int,
  -- §15.2 nudge scheduler: `and nudge_count < 2`.
  add column nudge_count       int not null default 0,
  add column last_nudge_at     timestamptz,
  -- §11.1 note: "store ack_due_at on the session and have a cron sweep it" —
  -- the durable version of the in-memory debounce timer, so a restart mid-burst
  -- still sends exactly one "5 of 8".
  add column ack_due_at        timestamptz,
  -- §7.1 / §8 step 1: consent must be logged when the customer picks a language.
  add column consent_at        timestamptz,
  -- §17.3 returning a conversation from Chatwoot to the bot.
  add column human_reason      text,
  add column chatwoot_conversation_id text,
  -- §13 the design's alternative photo arrangement, when one was chosen.
  add column photo_layout_id   text,
  -- §12.3 LOW_DPI warnings surfaced before approval; kept for the dashboard.
  add column render_warnings   jsonb not null default '[]',
  -- §6 stores `current_render` (the preview) but not the print file, and §18's
  -- "Download print file" button needs it before an order row exists.
  add column current_print     text,
  add column approved_at       timestamptz,
  -- §7.1 retention sweep needs to know what's already been cleaned.
  add column raw_purged_at     timestamptz,
  add column renders_purged_at timestamptz;

create index idx_sessions_ack_due on sessions (ack_due_at) where ack_due_at is not null;
create index idx_sessions_nudge on sessions (last_inbound_at)
  where state in ('AWAITING_PHOTOS','AWAITING_TEXT','AWAITING_APPROVAL');

alter table orders
  -- §14.2 rung 3: partial id + amount + delivery date as a composite key.
  add column delivery_date_text text,
  -- §14.5 nightly reconciliation against the Meesho seller export.
  add column reconciled_at     timestamptz,
  add column dispatched_at     timestamptz,
  add column notes             text;

-- §6 makes `designs.id` the renderer's template key, which works until one
-- template serves two occasions (PF-000002 is birthday *and* friendship) — the
-- primary key can only hold it once. So the catalog id becomes the menu entry
-- ("PF-000002-friendship") and this column carries the renderer key. Null means
-- "same as id", which is the common case.
alter table designs add column renderer_template_id text;

-- §24: "Add org_id to every table from the start (nullable for now, always null
-- = you). Then multi-tenancy is a migration, not a rewrite."
alter table sessions add column org_id uuid;
alter table orders   add column org_id uuid;
alter table media    add column org_id uuid;
alter table messages add column org_id uuid;
alter table designs  add column org_id uuid;

-- §19 E1: media dedupe is by wa_message_id, but a customer can legitimately
-- re-send the same photo for a different slot. Unique on (message) stays; this
-- index serves the "photos for this session in slot order" read.
create index idx_media_slots on media (session_id, slot_index) where kind = 'photo';

-- updated_at maintenance. Doing this in a trigger means no code path can forget.
create or replace function touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger sessions_touch before update on sessions
  for each row execute function touch_updated_at();
create trigger orders_touch before update on orders
  for each row execute function touch_updated_at();
