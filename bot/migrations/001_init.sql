-- Guide §6 "Data Model" — ❄ FROZEN. This file is a verbatim transcription of
-- the contract. Anything the running bot needs beyond it goes in a later
-- migration so the frozen shape stays auditable against the document.
create extension if not exists pgcrypto;

-- ============ SESSIONS (the state machine) ============
create table sessions (
  id              uuid primary key default gen_random_uuid(),
  phone_e164      text not null,                 -- '919876543210'
  wa_profile_name text,                          -- from webhook contacts[]

  lang            text default 'en'
                  check (lang in ('hi','en','mr','gu','te','ta','kn')),
  occasion        text,                          -- 'birthday','wedding',...
  template_id     text,                          -- your renderer's template key

  state           text not null default 'NEW' check (state in (
                    'NEW','AWAITING_LANG','AWAITING_OCCASION',
                    'AWAITING_TEMPLATE','AWAITING_PHOTOS','AWAITING_TEXT',
                    'RENDERING','AWAITING_APPROVAL','AWAITING_ORDER_ID',
                    'CONFIRMED','IN_PRINT','DISPATCHED',
                    'HUMAN','ABANDONED')),

  photos_needed   int,
  photos_received int not null default 0,
  field_values    jsonb not null default '{}',   -- {"name":"Priya","date":"25.08.2026"}

  revision_count  int not null default 0,
  current_render  text,                          -- path to latest rendered/vN.png

  source          text not null default 'unknown'
                  check (source in ('ctwa_ad','meesho','organic','unknown')),
  ad_id           text,                          -- from referral.source_id
  ctwa_clid       text,                          -- for ad attribution

  folder_path     text,
  window_expires_at timestamptz,                 -- last inbound + 24h
  fep_expires_at    timestamptz,                 -- CTWA arrival + 72h

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  last_inbound_at timestamptz
);
create unique index idx_sessions_active on sessions (phone_e164)
  where state not in ('CONFIRMED','IN_PRINT','DISPATCHED','ABANDONED');
create index idx_sessions_state on sessions (state, updated_at);
create index idx_sessions_window on sessions (window_expires_at)
  where state in ('AWAITING_PHOTOS','AWAITING_APPROVAL','AWAITING_ORDER_ID');

-- ============ ORDERS ============
create table orders (
  id                uuid primary key default gen_random_uuid(),
  session_id        uuid not null references sessions(id),
  phone_e164        text not null,
  channel           text not null check (channel in ('meesho','direct','other')),
  meesho_order_id   text,
  meesho_order_partial text,          -- OCR gave truncated id (§14)
  amount_paise      int,
  screenshot_path   text,
  ocr_raw           text,
  ocr_confidence    numeric,
  verified_by       text,             -- 'ocr_auto' | 'customer_confirm' | 'manual'
  status            text not null default 'placed' check (status in
                    ('placed','printing','printed','dispatched','delivered','cancelled')),
  final_file_path   text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index idx_orders_meesho on orders (meesho_order_id);
create index idx_orders_status on orders (status, created_at desc);

-- ============ MEDIA ============
create table media (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references sessions(id) on delete cascade,
  wa_media_id   text not null,
  wa_message_id text not null unique,            -- ⚠️ dedupe key (§19 E6)
  kind          text not null check (kind in ('photo','screenshot','other')),
  mime_type     text,
  bytes         bigint,
  sha256        text,
  local_path    text not null,
  slot_index    int,                              -- which frame slot
  created_at    timestamptz not null default now()
);
create index idx_media_session on media (session_id, kind, created_at);

-- ============ MESSAGE LOG (audit + debugging) ============
create table messages (
  id            bigint generated always as identity primary key,
  session_id    uuid references sessions(id) on delete cascade,
  phone_e164    text not null,
  direction     text not null check (direction in ('in','out')),
  wa_message_id text,
  type          text,                             -- text|image|interactive|template
  payload       jsonb,
  state_before  text,
  state_after   text,
  created_at    timestamptz not null default now()
);
create index idx_messages_session on messages (session_id, created_at);
create unique index idx_messages_dedupe on messages (wa_message_id)
  where direction = 'in' and wa_message_id is not null;

-- ============ WEBHOOK QUEUE (durability) ============
create table webhook_events (
  id          bigint generated always as identity primary key,
  raw         jsonb not null,
  status      text not null default 'pending'
              check (status in ('pending','processing','done','failed')),
  attempts    int not null default 0,
  error       text,
  created_at  timestamptz not null default now(),
  processed_at timestamptz
);
create index idx_webhook_pending on webhook_events (status, id)
  where status = 'pending';

-- ============ TEMPLATE CATALOG (your 4 designs) ============
create table designs (
  id            text primary key,                -- 'bday_collage_8'
  occasion      text not null,
  name_i18n     jsonb not null,                  -- {"en":"8-Photo Collage","hi":"..."}
  photos_needed int not null,
  fields        jsonb not null default '[]',     -- [{"key":"name","label_i18n":{...},"maxLen":30}]
  sample_image_url text not null,                -- public URL sent on WhatsApp
  active        boolean not null default true,
  sort_order    int not null default 0
);
