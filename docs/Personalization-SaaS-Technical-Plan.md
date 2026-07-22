# Technical Plan — Photo Personalization SaaS
*Stack verdict, architecture, template format, rendering pipeline, complete database schema, APIs, costs, and a realistic build roadmap. (July 2026)*

---

## 1. Stack Decision (the verdict first)

| Layer | Pick | Why |
|---|---|---|
| Web app (storefront + merchant dashboard + editor) | **Next.js 15 (App Router) on Vercel** | You know it; free to start; edge caching for template JSON; one codebase for admin + customer editor |
| Database / Auth / Storage / Realtime | **Supabase (Postgres)** | Relational schema below fits Postgres perfectly; RLS gives multi-tenancy for free; Storage has CDN + image transforms; you already know it |
| Canvas editor | **react-konva** | Confirmed — better React fit than Fabric.js, clean JSON serialization, good mobile perf |
| Server rendering (print files) | **Node worker: Konva-on-Node + skia-canvas + sharp + pdf-lib** | Same layout code as the browser ⇒ WYSIWYG parity (see §6) |
| Job queue | **pg-boss** (Postgres-backed) | Zero extra infra — the queue lives in your Supabase DB. No Redis to pay for or babysit |
| Worker hosting | **Fly.io or Railway** (1 small machine, scale later) | ₹300–600/mo to start; container = native deps (skia/sharp) just work |
| Payments | **Razorpay** (subscriptions + UPI), Stripe later for global | India-first billing |
| Email | Resend / Amazon SES | Transactional only at MVP |
| Big-file storage at scale | **Cloudflare R2** (phase 2) | $0.015/GB and **zero egress fees** — ideal for serving exports/previews |
| AI (phase 3) | Browser-first (free) → Replicate/remove.bg pay-per-use | See §14 |

### Why not the alternatives
- **Appwrite:** capable, but its document-style permission model and smaller ecosystem fight the deeply relational schema below (orgs → templates → projects → renders with cross-table constraints). Supabase gives you raw SQL, RLS, pg-boss, and a bigger hiring/help pool. Skip.
- **AWS-native (Cognito + RDS + S3 + Lambda):** you'd hand-assemble what Supabase gives you on day one, at a higher monthly floor and much higher ops burden. Revisit only at serious scale (Supabase is Postgres — migration to RDS later is straightforward).
- **Vision-doc's 14 microservices + Turborepo multi-app monorepo:** right *concepts*, wrong *deployment shape* for a solo builder. Keep the module boundaries as **folders/packages inside one app + one worker** (a "modular monolith"). Splitting into services is a refactor you do when a module's load demands it — not before. (More in §16.)

---

## 2. System Architecture

```
                        ┌───────────────────────────────────────────┐
                        │            Next.js app (Vercel)           │
                        │  /store/[slug]   customer storefront      │
                        │  /editor         Konva editor (2 modes:   │
                        │                  customer | template-builder)
                        │  /dashboard      merchant admin           │
                        │  /api/v1/*       REST API (route handlers)│
                        └────────┬──────────────────┬───────────────┘
                                 │ supabase-js (RLS) │ service-role (API)
                                 ▼                   ▼
        ┌───────────────────────────────────────────────────────────┐
        │                    SUPABASE (Postgres)                    │
        │  tables (§7) · RLS policies · pg-boss job queue ·         │
        │  Auth (merchants) · Storage buckets (§8) + CDN            │
        └───────────────────────────┬───────────────────────────────┘
                                    │ pg-boss poll
                                    ▼
                     ┌──────────────────────────────┐
                     │  Render worker (Fly/Railway) │
                     │  Konva-node + skia-canvas    │
                     │  sharp · pdf-lib · fonts     │
                     │  → writes exports to Storage │
                     │  → fires webhooks            │
                     └──────────────────────────────┘
```

**Repo shape (single pnpm workspace, no Turborepo needed yet):**

```
/apps/web            Next.js (storefront + dashboard + editor + API)
/apps/worker         render worker (Node)
/packages/render-core   pure layout+draw logic shared by both  ← the crown jewel
/packages/template-schema  zod schemas + TS types for template JSON
/packages/db         generated Supabase types, query helpers
```

The conceptual modules from your vision doc (Organization, Product, Template, Layer, Asset, Personalization, Canvas, Rendering, Export, Storage, API, SDK) all exist — as folders and packages, not deployments.

---

## 3. Template Document Format (JSON)

Every template is a versioned JSON document. Nothing hardcoded. All coordinates in **canvas pixels at print resolution** (mm × dpi / 25.4), so the doc is print-exact and the browser just scales down.

```jsonc
{
  "schema": 1,
  "meta": { "name": "Golden Wedding Bliss", "occasion": ["wedding","anniversary"] },
  "canvas": {
    "widthMm": 304.8, "heightMm": 457.2,      // 12×18 in
    "dpi": 300, "bleedMm": 3,
    "widthPx": 3600, "heightPx": 5400,        // derived, stored for speed
    "background": "#FFF9F2"
  },
  "inputs": {
    "photos": { "min": 3, "max": 3 },          // drives auto-matching
    "fields": [
      { "key": "names",  "label": "Couple names", "type": "text", "maxLen": 40 },
      { "key": "date",   "label": "Wedding date",  "type": "text", "maxLen": 24 }
    ]
  },
  "layers": [
    { "id": "bg",   "type": "image", "role": "background",
      "src": "asset://floral-arch-01", "locked": true },

    { "id": "p1", "type": "photoSlot", "x": 350, "y": 600, "w": 1400, "h": 1866,
      "shape": "rect", "cornerRadius": 60, "fit": "cover",
      "focal": "faces", "rotation": -2,
      "border": { "width": 24, "color": "#C9A24B" } },

    { "id": "p2", "type": "photoSlot", "x": 1850, "y": 900, "w": 1400, "h": 1866,
      "shape": "rect", "cornerRadius": 60, "fit": "cover", "focal": "faces" },

    { "id": "p3", "type": "photoSlot", "x": 1100, "y": 2900, "w": 1400, "h": 1400,
      "shape": "circle", "fit": "cover", "focal": "faces" },

    { "id": "names", "type": "text", "binds": "names",
      "x": 300, "y": 4500, "w": 3000, "align": "center",
      "font": "Playfair Display", "weight": 600, "sizePx": 220,
      "color": "#7A5C1E", "maxLines": 1, "autoFit": true },

    { "id": "date", "type": "text", "binds": "date",
      "x": 300, "y": 4800, "w": 3000, "align": "center",
      "font": "Inter", "sizePx": 110, "color": "#8A8A8A" },

    { "id": "fg", "type": "image", "role": "overlay",
      "src": "asset://gold-corner-flourish", "locked": true }
  ]
}
```

**Layer types for MVP** (covers every pattern in your 11 samples): `image` (background/overlay/sticker), `photoSlot` (rect | rounded | circle | heart masks; `fit: cover`; `focal: faces|center`), `text` (placeholder bindings, autoFit, alignment), `shape` (rect/line/ellipse with fill/stroke). Defer: video, QR, gradients-as-layers, filters (add as `schema: 2` later — the version field exists for exactly this).

A **project** document = template doc + `photoAssignments` (slotId → uploadId + crop rect) + `fieldValues` + user layer overrides. Same schema family, validated with zod in `template-schema`.

---

## 4. The Auto-Preview Engine (your differentiator)

**Matching** is a cheap SQL query the moment uploads finish:

```sql
select id, name, doc, preview_path
from templates
where product_id = $1
  and status = 'published'
  and $2 between (inputs_min_photos) and (inputs_max_photos)
order by
  -- rank: orientation fit of user photos vs slot aspect ratios, then popularity
  orientation_score desc, usage_count desc
limit 40;
```

(`inputs_min_photos`, `inputs_max_photos`, and a precomputed slot-aspect summary are **generated columns** extracted from the JSON at publish time — see §7 — so matching never parses JSON at request time.)

**Preview generation is 100% client-side — this is the whole cost/speed trick:**
1. On upload, the browser downscales each photo (max 2048px, EXIF-corrected) *before* uploading — faster uploads, smaller storage.
2. Face detection runs **in the browser** with MediaPipe Face Detector (free, ~instant). Face boxes are stored per upload.
3. For each matched template, an offscreen Konva stage (from `render-core`) lays out the doc at ~400px, applies face-aware cover-crop per slot, and emits a thumbnail. 30–40 previews render in ~1–2s on a mid-range phone; virtualize the grid and render lazily.
4. Zero server compute, zero latency, works offline mid-session. The server is only touched again at **final print render**.

Ranking niceties that make it feel magical (cheap to add): match photo orientations to slot orientations; order collages so the highest-face-quality photo lands in the hero slot; optionally tint-sort templates by the photos' dominant palette.

---

## 5. Editor (one core, two modes)

Build **one** Konva editor and ship it in two modes — this halves your scope:
- **Customer mode:** locked layers hidden from selection; can swap/crop photos in slots, edit bound text fields, nothing else (keeps output print-safe).
- **Builder mode (merchant/you):** full layer manipulation — add slots/text/images, snapping, guides, align, z-order, lock, group, undo/redo (command stack over the doc JSON).

Essentials: pinch-zoom + pan (mobile-first — Indian customers are on phones), keyboard nudging on desktop, autosave (debounced PATCH of project doc), safe-area/bleed guides overlay, image loading via 2048px working copies (never originals).

---

## 6. Server Rendering Pipeline (print files)

**Parity rule:** the *only* layout/draw code in the company lives in `packages/render-core` — pure functions that take `(doc, assetResolver)` and issue draw calls. The browser backs it with Konva/DOM canvas; the worker backs it with Konva-on-Node + **skia-canvas**. If they share the code, preview = print.

Worker flow per job:
1. Pull job from pg-boss → load project doc + assets (local disk cache for template assets/fonts).
2. Render full-res canvas (e.g. 3672×5472 incl. 3mm bleed at 300dpi) via render-core.
3. `sharp`: flatten, color-manage (sRGB now; CMYK via ICC profile — sharp/libvips supports `toColourspace('cmyk')` with e.g. FOGRA39 — as a Business-tier option later), strip GPS EXIF, encode PNG/JPEG(q92).
4. `pdf-lib`: embed image at exact physical size, set **MediaBox/TrimBox/BleedBox**, optional crop marks.
5. Upload to `exports` bucket → mark job done → enqueue webhook delivery.

**Fonts:** ship OFL/Google fonts only at launch; register identical font files in browser (`@font-face`) and worker (skia-canvas `FontLibrary`). **Test Devanagari/complex-script shaping in week 1** (render "शुभ विवाह" both sides, pixel-diff) — Hindi text on frames is a real differentiator and the riskiest rendering unknown; skia-canvas has proper shaping, node-canvas/Pango is the fallback.

**Golden tests:** for every published template, store a reference render; CI pixel-diffs worker output against it, and a dev harness diffs browser vs worker. This is what protects the product's core promise.

Performance targets: preview grid < 2s for 30 templates (client); print render p95 < 20s; render success ≥ 99.5%.

---

## 7. Complete Database Schema (Postgres / Supabase)

Multi-tenant from day one: **every tenant-owned row carries `org_id`**. `org_id IS NULL` = platform-owned (global catalog). Merchants use Supabase Auth + RLS; end customers are *not* auth users — they act through server-issued `share_token`s via the API (service role), which keeps checkout friction at zero.

```sql
-- ============ EXTENSIONS ============
create extension if not exists pgcrypto;     -- gen_random_uuid
create extension if not exists pg_trgm;      -- fuzzy template search

-- ============ TENANCY & BILLING ============
create table orgs (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text not null unique,                  -- subdomain: slug.yourapp.in
  branding      jsonb not null default '{}',           -- logo, colors, custom_domain
  plan_code     text not null default 'trial',
  trial_ends_at timestamptz,
  created_at    timestamptz not null default now()
);

create table org_members (
  org_id     uuid not null references orgs(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null check (role in ('owner','admin','designer','viewer')),
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

create table plans (
  code             text primary key,                   -- trial|starter|growth|business|enterprise
  name             text not null,
  price_month_inr  int  not null default 0,
  limits           jsonb not null default '{}'         -- {exports:300, brands:1, storage_gb:25, templates:100}
);

create table subscriptions (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null references orgs(id) on delete cascade,
  plan_code           text not null references plans(code),
  provider            text not null default 'razorpay',
  provider_sub_id     text unique,
  status              text not null check (status in ('trialing','active','past_due','cancelled')),
  current_period_end  timestamptz,
  created_at          timestamptz not null default now()
);
create index on subscriptions (org_id, status);

create table usage_counters (                          -- plan-limit enforcement
  org_id       uuid not null references orgs(id) on delete cascade,
  metric       text not null,                          -- 'exports' | 'ai_credits' | 'storage_bytes'
  period_start date not null,                          -- month bucket
  used         bigint not null default 0,
  primary key (org_id, metric, period_start)
);

-- ============ CATALOG ============
create table product_types (                           -- platform-defined: frame, mug, calendar...
  id     uuid primary key default gen_random_uuid(),
  slug   text not null unique,
  name   text not null,
  config jsonb not null default '{}'                   -- default dpi, notes, render hints
);

create table products (                                -- a sellable size/variant
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid references orgs(id) on delete cascade,   -- null = platform preset
  product_type_id uuid not null references product_types(id),
  name            text not null,                       -- '12x18 Portrait Frame'
  sku             text,
  width_mm        numeric not null,
  height_mm       numeric not null,
  bleed_mm        numeric not null default 3,
  safe_mm         numeric not null default 5,
  dpi             int     not null default 300,
  orientation     text not null check (orientation in ('portrait','landscape','square')),
  price_paise     int,                                 -- merchant retail price (optional)
  status          text not null default 'active' check (status in ('active','archived')),
  created_at      timestamptz not null default now()
);
create index on products (org_id, status);

create table categories (                              -- occasions: wedding, birthday...
  id        uuid primary key default gen_random_uuid(),
  slug      text not null unique,
  name      text not null,
  parent_id uuid references categories(id)
);

-- ============ TEMPLATES ============
create table templates (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid references orgs(id) on delete cascade,  -- null = platform library
  product_id  uuid not null references products(id),
  name        text not null,
  doc         jsonb not null,                          -- the template JSON (§3)
  -- generated columns so auto-matching never parses JSON at query time:
  min_photos  int generated always as ((doc->'inputs'->'photos'->>'min')::int) stored,
  max_photos  int generated always as ((doc->'inputs'->'photos'->>'max')::int) stored,
  orientation text,                                    -- denormalized from product at publish
  tags        text[] not null default '{}',
  preview_path text,                                   -- rendered thumbnail in Storage
  is_premium  boolean not null default false,
  usage_count int not null default 0,                  -- for ranking
  version     int not null default 1,
  status      text not null default 'draft' check (status in ('draft','published','archived')),
  created_by  uuid references auth.users(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index idx_templates_match on templates (product_id, status, min_photos, max_photos);
create index idx_templates_org   on templates (org_id, status);
create index idx_templates_tags  on templates using gin (tags);
create index idx_templates_name  on templates using gin (name gin_trgm_ops);

create table template_versions (                       -- immutable history
  template_id uuid not null references templates(id) on delete cascade,
  version     int  not null,
  doc         jsonb not null,
  created_by  uuid references auth.users(id),
  created_at  timestamptz not null default now(),
  primary key (template_id, version)
);

create table template_categories (
  template_id uuid not null references templates(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  primary key (template_id, category_id)
);

-- ============ ASSETS & FONTS ============
create table assets (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid references orgs(id) on delete cascade,   -- null = platform asset
  kind         text not null check (kind in ('background','overlay','sticker','frame','shape','misc')),
  name         text not null,
  storage_path text not null,
  thumb_path   text,
  width        int, height int, bytes bigint,
  tags         text[] not null default '{}',
  license_note text,                                   -- provenance log (IP risk control)
  created_at   timestamptz not null default now()
);
create index on assets (org_id, kind);
create index on assets using gin (tags);

create table fonts (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid references orgs(id) on delete cascade,   -- null = platform (OFL) fonts
  family       text not null,
  weight       int  not null default 400,
  style        text not null default 'normal',
  storage_path text not null,
  license      text not null default 'OFL',
  unique (org_id, family, weight, style)
);

-- ============ CUSTOMER SESSIONS ============
create table customers (                               -- end buyers (no auth account)
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references orgs(id) on delete cascade,
  name        text, email text, phone text,
  created_at  timestamptz not null default now()
);
create index on customers (org_id, phone);

create table uploads (                                 -- customer photos
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references orgs(id) on delete cascade,
  customer_id  uuid references customers(id) on delete set null,
  storage_path text not null,                          -- 2048px working copy
  original_path text,                                  -- optional full-res (lifecycle-deleted)
  width        int not null, height int not null, bytes bigint,
  faces        jsonb,                                  -- [{x,y,w,h,score}] from client MediaPipe
  palette      jsonb,                                  -- dominant colors (ranking)
  expires_at   timestamptz,                            -- retention policy (DPDP)
  created_at   timestamptz not null default now()
);
create index on uploads (org_id, created_at);
create index on uploads (expires_at) where expires_at is not null;

create table projects (                                -- a personalization session
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references orgs(id) on delete cascade,
  product_id   uuid not null references products(id),
  template_id  uuid references templates(id),
  customer_id  uuid references customers(id) on delete set null,
  doc          jsonb not null,                         -- project doc (§3): assignments, crops, field values
  status       text not null default 'draft' check (status in ('draft','completed','ordered','expired')),
  share_token  text not null unique default encode(gen_random_bytes(16),'hex'),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index on projects (org_id, status, updated_at desc);

-- ============ RENDERS & ORDERS ============
create table render_jobs (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references orgs(id) on delete cascade,
  project_id  uuid not null references projects(id) on delete cascade,
  kind        text not null check (kind in ('preview','print')),
  format      text not null check (format in ('png','jpg','pdf')),
  dpi         int  not null default 300,
  with_bleed  boolean not null default true,
  with_marks  boolean not null default false,
  status      text not null default 'queued' check (status in ('queued','processing','done','failed')),
  output_path text,
  error       text,
  attempts    int not null default 0,
  started_at  timestamptz, finished_at timestamptz,
  created_at  timestamptz not null default now()
);
create index idx_render_queue on render_jobs (status, created_at) where status = 'queued';
create index on render_jobs (org_id, created_at desc);

create table orders (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references orgs(id) on delete cascade,
  project_id     uuid not null references projects(id),
  render_job_id  uuid references render_jobs(id),
  source         text not null default 'storefront',   -- storefront|api|shopify|woo|manual
  external_ref   text,                                  -- Shopify order id etc.
  customer_id    uuid references customers(id),
  amount_paise   int, currency text default 'INR',
  status         text not null default 'placed' check (status in ('placed','printing','shipped','delivered','cancelled')),
  print_file_path text,
  created_at     timestamptz not null default now()
);
create index on orders (org_id, status, created_at desc);

-- ============ PLATFORM / API ============
create table api_keys (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references orgs(id) on delete cascade,
  name       text not null,
  key_prefix text not null,                            -- shown in UI: 'pk_live_ab12…'
  key_hash   text not null,                            -- sha256; never store raw key
  scopes     text[] not null default '{read,write}',
  last_used_at timestamptz, revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index on api_keys (org_id) where revoked_at is null;

create table webhooks (
  id      uuid primary key default gen_random_uuid(),
  org_id  uuid not null references orgs(id) on delete cascade,
  url     text not null,
  secret  text not null,
  events  text[] not null default '{render.completed,order.created}',
  active  boolean not null default true
);

create table webhook_deliveries (
  id          uuid primary key default gen_random_uuid(),
  webhook_id  uuid not null references webhooks(id) on delete cascade,
  event       text not null,
  payload     jsonb not null,
  status      text not null default 'pending' check (status in ('pending','delivered','failed')),
  attempts    int not null default 0,
  next_retry_at timestamptz,
  created_at  timestamptz not null default now()
);
create index on webhook_deliveries (status, next_retry_at);

create table audit_logs (
  id        bigint generated always as identity primary key,
  org_id    uuid references orgs(id) on delete cascade,
  user_id   uuid references auth.users(id),
  action    text not null,                             -- 'template.publish', 'apikey.create'...
  entity    text, entity_id uuid,
  meta      jsonb,
  created_at timestamptz not null default now()
);
create index on audit_logs (org_id, created_at desc);
```

### RLS (the multi-tenancy backbone)

```sql
create or replace function my_orgs() returns setof uuid
language sql stable security definer as
$$ select org_id from org_members where user_id = auth.uid() $$;

alter table templates enable row level security;

create policy templates_read on templates for select
  using (org_id is null and status = 'published'      -- platform library
         or org_id in (select my_orgs()));

create policy templates_write on templates for all
  using  (org_id in (select my_orgs()))
  with check (org_id in (select my_orgs()));
```

Repeat the pattern for every `org_id` table (assets, products, projects, uploads, orders, render_jobs...). **Customer-facing routes never touch the DB directly** — they hit `/api/v1/*`, which validates the project `share_token` (or API key) and uses the service-role client. Enable RLS on every table anyway; defense in depth.

Housekeeping jobs (pg-boss cron): delete `uploads` past `expires_at` (+Storage objects), expire stale draft `projects` (30d), reset `usage_counters` monthly, retry `webhook_deliveries` with backoff.

---

## 8. Storage Layout & Retention

Supabase Storage buckets (move `exports`/`uploads` to Cloudflare R2 when egress bills appear):

| Bucket | Access | Path convention | Lifecycle |
|---|---|---|---|
| `assets` | public via CDN | `{org|platform}/{kind}/{id}.png` | permanent |
| `fonts` | public via CDN | `platform/{family}/{file}.woff2` + `.ttf` (worker) | permanent |
| `uploads` | private, signed URLs | `{org}/{yyyymm}/{uploadId}.jpg` | delete at `expires_at` (default 60d post-order) |
| `previews` | private, signed | `{org}/{templateId}/thumb.webp` | regenerate on publish |
| `exports` | private, signed (7-day links) | `{org}/{projectId}/{jobId}.pdf` | 180d |

Client pipeline before upload: EXIF-rotate → downscale to 2048px → JPEG q85. Cuts upload time ~10×, storage ~10×, and makes the editor snappy on mobile data.

---

## 9. API Surface (v1)

Auth: merchant dashboard = Supabase JWT (RLS). Server-to-server = `Authorization: Bearer pk_live_…` (hash-checked). Customer editor = `share_token` scoped to one project.

| Method & path | Auth | Purpose |
|---|---|---|
| `GET /v1/products` | key/public | List sellable products for a store |
| `GET /v1/templates?product=&photos=3&category=wedding` | key/public | **Auto-match query** (§4) |
| `POST /v1/uploads/sign` | token | Signed upload URL + creates row |
| `POST /v1/projects` | key/token | Create project from template + assignments |
| `PATCH /v1/projects/:id` | token | Autosave doc |
| `POST /v1/projects/:id/render` | token/key | Enqueue print render (checks plan quota, bumps `usage_counters`) |
| `GET /v1/renders/:id` | token/key | Poll status → signed download URL |
| `GET /v1/orders` / `POST /v1/orders` | key | Merchant order ops |
| `POST /v1/templates` `…/publish` | JWT | Builder CRUD + snapshot to `template_versions` |
| `POST /v1/billing/webhook` | Razorpay sig | Subscription lifecycle |
| Webhooks out | HMAC | `render.completed`, `order.created` |

The embeddable widget (Growth plan) is just this API behind an iframe first (`<iframe src="https://app.../embed/{storeId}">`), npm SDK second — an iframe ships in a day and avoids CSS wars on merchant sites.

---

## 10. Multi-tenancy & Security Checklist

- RLS on every table; `org_id` non-null on all tenant data; service-role key only in server code.
- API keys: show once, store SHA-256, prefix for UI, per-key scopes, revocation.
- Signed URLs everywhere for private buckets; short TTLs on exports.
- Plan limits enforced in `POST /render` transactionally against `usage_counters`.
- Rate limits on public endpoints (Vercel middleware + per-key counters).
- Strip GPS EXIF on all processed images; consent checkbox at upload; deletion endpoint (DPDP Act).
- Webhook signatures (HMAC-SHA256) + retries with backoff.
- Audit log on destructive/admin actions.

---

## 11. Performance Playbook ("very fast responsive")

1. **Previews client-side** (§4) — the single biggest speed *and* cost decision.
2. Template JSON + assets served from CDN with immutable versioned URLs (`?v={version}`) — cache forever.
3. Editor loads 2048px working copies, never originals; thumbnails as WebP with blurhash placeholders.
4. Template grid virtualized; Konva preview stages pooled and reused.
5. `idx_templates_match` makes the match query a straight index scan.
6. Worker keeps fonts + platform assets on local disk; renders stream to Storage.
7. Next.js: storefront pages statically cached per store, revalidated on template publish.
8. Measure from day one: Vercel analytics + a `render_jobs` timing dashboard.

---

## 12. Background Jobs (pg-boss)

Queues: `render.print` (priority by plan tier), `render.preview` (template thumbnails on publish), `webhook.deliver`, `cleanup.uploads`, `cleanup.projects`, `usage.rollup`. Job handlers are idempotent (job id = render id); 3 retries with exponential backoff; failures set `render_jobs.status='failed'` with `error` surfaced in the dashboard.

---

## 13. Cost Model

| Item | MVP (0–10 merchants) | Growth (10–100) | Scale (100–500) |
|---|---|---|---|
| Vercel | ₹0 (Hobby) | ₹1,700 (Pro) | ₹1,700+ |
| Supabase | ₹0 (Free) | ₹2,100 (Pro) – ₹7,000 (+compute) | ₹7,000–20,000 |
| Render worker (Fly/Railway) | ₹300–600 | ₹2,000–4,000 | ₹8,000–15,000 (2–3 machines) |
| Cloudflare R2 + CDN | — | ₹800–2,500 | ₹3,000–8,000 |
| Email (Resend/SES) | ₹0 | ₹0–1,700 | ₹1,700 |
| Domain/misc | ₹150 | ₹500 | ₹1,000 |
| **Total /mo** | **≈ ₹500–3,000** | **≈ ₹8,000–18,000** | **≈ ₹25,000–60,000** |

Marginal cost per print export ≈ 5–15s CPU + ~20MB storage + one download ≈ **< ₹0.50** → 90%+ gross margin at every tier.

---

## 14. AI Roadmap (cost-friendly order)

| Feature | Phase | How (cheapest first) |
|---|---|---|
| Face detection → smart crop | **MVP** | MediaPipe in browser — free, no server |
| Auto-placement ranking | MVP | Heuristics on face boxes + orientation + palette — free |
| Background removal | 3 | `@imgly/background-removal` (WASM, in-browser, free) → fallback Replicate/rembg or remove.bg API for quality tier, sold as credits |
| Enhancement / upscaling | 3 | Real-ESRGAN on Replicate, pay-per-use, credits |
| Blur/quality warnings | 3 | Laplacian variance in browser — free |
| Smart layout suggestions | 4 | Claude API scoring photo sets → template picks (few paise per call) |

Pattern: **browser-first (free) → pay-per-use API (metered) → never self-host GPUs** until credits revenue proves demand.

---

## 15. Build Roadmap (realistic)

Full-time ≈ 10–12 weeks to MVP; evenings/weekends ≈ 4–6 months. Sequenced so every stage is demoable:

- **Week 1–2 — Foundations & de-risking:** repo, Supabase schema + RLS, template JSON v1 frozen (zod), render-core skeleton, **Devanagari parity spike (§6)**, 3 templates rebuilt as JSON.
- **Week 3–5 — The magic:** upload pipeline (client resize + MediaPipe), match query, client preview grid. *Demoable: upload 3 photos → 12 live previews.*
- **Week 6–8 — Editor + print:** customer-mode editor, autosave, worker + pg-boss, PDF/PNG exports with bleed, golden tests. *Demoable: end-to-end order with print file.*
- **Week 9–10 — Merchant shell:** org onboarding, builder-mode editor (reuse core), template publish + thumbnails, order dashboard, hosted storefront per org.
- **Week 11–12 — Money:** Razorpay subscriptions, plan limits, usage counters, watermarked trial, your own brand live.
- **Post-MVP order:** iframe embed → API keys + webhooks → pay-per-export plan → 2nd product type (config only — the proof of the architecture) → AI credits → Shopify app.

---

## 16. Deliberately NOT Building Yet (pushback on the vision doc)

The vision doc's concepts are right; two prescriptions in it would sink a solo builder:

1. **"14 independent systems"** → build them as *modules in one app + one worker*. A queue table and a folder boundary give you 90% of the decoupling with 5% of the ops. Extract the render worker's siblings into services only when a module's load or team demands it.
2. **"150–200 page PRD before any code"** → that's 2+ months of writing that goes stale by week 3 of building. Write a **15–25 page lean PRD**: the template JSON spec (§3), the API table (§9), this schema (§7), the MVP screen list, and plan limits. Freeze the JSON schema and DB contracts hard; let everything else iterate.

Also parked, on purpose: Turborepo/multi-app split, Kubernetes, custom API gateway, GraphQL, Redis, video/AR/3D layers, template marketplace, native SDKs, self-hosted AI, multi-region. Each has a natural trigger point later; none earns its complexity before your first 50 merchants.
