# WhatsApp Order Automation — Implementation Guide
## Gift Mahal · Personalized Photo Frames
*Companion to `Personalization-SaaS-PRD.md` · `-Technical-Plan.md` · `-Business-Plan.md`*

| | |
|---|---|
| **Version** | 1.0 — Draft for build |
| **Date** | 26 July 2026 |
| **Scope** | Full automation of the WhatsApp order pipeline for the **current** business (Meesho + Meta ads), using only free / open-source tooling |
| **Relationship to the SaaS docs** | This is the **operating layer for your own brand (segment S0)**. It runs on top of the renderer you already have (4 templates). Every piece here maps to a future SaaS module — see §16 |
| **Status** | ❄ = freeze before coding · 🌱 = iterate during build |

---

## Table of Contents

1. Decision Record — why Cloud API, not Baileys
2. Cost Model (the actual numbers)
3. Prerequisites & Meta Account Setup
4. Infrastructure — free hosting, Docker stack
5. System Architecture
6. Data Model ❄
7. Storage & Folder Layout ❄
8. Conversation Flow Specification ❄
9. WhatsApp Message Payload Catalog ❄
10. Webhook Handler — implementation
11. Media Download Pipeline — implementation
12. Renderer Integration Contract ❄
13. Approval & Revision Loop
14. Meesho Order-ID Capture
15. Message Templates to Get Approved
16. Localization Strategy
17. Human Handoff (Chatwoot)
18. Print Dashboard Requirements
19. Edge Case & Failure Catalog 🌱
20. Testing Checklist
21. Build Phases
22. Operational Runbook
23. Risks & Mitigations
24. Migration Path to the SaaS

---

# 1. Decision Record — why Cloud API, not Baileys

**Decision: use Meta's official WhatsApp Cloud API directly, with no BSP.**

| Option | Fees | Ban risk | Interactive menus | Verdict |
|---|---|---|---|---|
| **Cloud API (direct)** | ₹0 for your flow (§2) | None | Native lists, buttons, Flows | ✅ **Chosen** |
| Baileys / Evolution API / WAHA | ₹0 | **High** — unofficial WhatsApp Web protocol; number bans are common and permanent | Emulated, unreliable | ❌ |
| BSP (Wati, AiSensy, Gupshup, Twilio) | $19–99/mo + per-message markup | None | Yes | ❌ Pays for a UI you're building anyway |

**Why the unofficial route is wrong for you specifically:**

Your entire flow is customer-initiated. Every Meesho buyer and every ad click messages *you* first. That is exactly the case Meta made free. You would be taking on permanent-ban risk on your primary business number to avoid a cost you were never going to incur.

Secondary reason: your flow needs **interactive list menus** (7 languages, ~7 occasions, N designs). Unofficial libraries either can't send these or send them unreliably across WhatsApp client versions. Falling back to "reply 1/2/3" text parsing across 7 languages is a support nightmare.

**When to revisit:** if Meta rejects your business verification twice, or if you need >250 business-initiated conversations/day before verification completes. Neither is likely.

---

# 2. Cost Model

## 2.1 The two windows that make this free

| Window | Opens when | Duration | What's free |
|---|---|---|---|
| **Customer Service Window** | Customer sends you any message | 24h, resets on each customer message | All free-form replies (text, image, list, button, document) |
| **Free Entry Point (FEP)** | Customer arrives via Click-to-WhatsApp ad or Facebook Page CTA **and you reply within 24h** | 72h | *Everything*, including template messages |

Your two acquisition channels both land inside these:

- **Meta ads → WhatsApp** → FEP opens → 72 free hours. Your whole flow (language → occasion → design → photos → preview → approval) takes 10–40 minutes. Enormous headroom.
- **Meesho buyer messages you** → 24h service window. Same story.

## 2.2 What you actually pay for

Only messages sent *after* the window closes, which must be pre-approved **templates**:

| Scenario | Category | Approx. India rate | Monthly at 500 orders |
|---|---|---|---|
| "Your design is ready" (customer went quiet >24h) | Utility | ~₹0.10–0.14 | ₹50–70 if 100% need it |
| "We're waiting for your photos" nudge | Utility | ~₹0.10–0.14 | ₹20–30 |
| "Order dispatched" | Utility | ~₹0.10–0.14 | ₹50–70 |
| Promotional broadcast to past customers | Marketing | ~₹0.80–1.00 | Only if you choose to |

**Realistic bill at 500 orders/month: ₹100–300.** Practically zero. Budget ₹500/mo and forget about it.

> ⚠️ Rates change quarterly. Verify against Meta's official pricing page before you plan any marketing broadcast, which is the only line item that can actually get expensive.

## 2.3 Infrastructure cost

| Item | Cost |
|---|---|
| Oracle Cloud Always Free (4 vCPU ARM / 24 GB RAM / 200 GB) | ₹0 |
| Domain for webhook (you likely have one) | ₹800/yr |
| TLS (Caddy + Let's Encrypt) | ₹0 |
| Postgres, n8n, Chatwoot, your app | ₹0 (self-hosted) |
| **Total** | **≈ ₹70/month** |

Fallback if Oracle's free ARM capacity is unavailable in your region: Hetzner CX22 at ~₹350/mo, or your existing hosting.

---

# 3. Prerequisites & Meta Account Setup

## 3.1 What you need before writing code

| # | Item | Notes |
|---|---|---|
| 1 | **A dedicated phone number** | ⚠️ Must NOT be registered on WhatsApp or WhatsApp Business app. Buy a new SIM. Once on Cloud API, the number can no longer use the phone app — you manage it via Chatwoot |
| 2 | Facebook account + **Meta Business Suite** account | business.facebook.com |
| 3 | **Meta Developer** account | developers.facebook.com |
| 4 | Business documents for verification | GST certificate / Udyam registration / bank statement with business name. Needed to exceed 250 business-initiated conversations/24h |
| 5 | A public HTTPS endpoint | For the webhook. `https://api.giftmahal.in/whatsapp/webhook` |
| 6 | Privacy policy page | Meta requires a live URL |

## 3.2 Setup sequence

```
1. Meta Business Suite → create Business Portfolio ("Gift Mahal")
2. developers.facebook.com → Create App → type: "Business"
3. Add product: "WhatsApp" → creates a WhatsApp Business Account (WABA)
   → gives you a free test number (use it for dev, it can only message
     5 pre-registered recipients)
4. WhatsApp → API Setup → "Add phone number" → your new SIM
   → verify via SMS/voice OTP
5. Note down: PHONE_NUMBER_ID, WABA_ID, and generate a
   System User token (permanent) — NOT the 24h temp token
   Business Settings → System Users → Add → Assign WABA asset
   → Generate token with scopes: whatsapp_business_messaging,
     whatsapp_business_management
6. Configure webhook: Callback URL + Verify Token
   → Subscribe to fields: messages  (and message_template_status_update)
7. Business Verification: Business Settings → Security Centre → Start
   (takes 2–10 working days)
8. Display name approval: WhatsApp Manager → Phone numbers → Edit
   → "Gift Mahal" (must match your business docs)
```

## 3.3 Messaging limits (before/after verification)

| State | Business-initiated conversations / 24h | Customer-initiated |
|---|---|---|
| Unverified | 250 unique customers | **Unlimited** |
| Verified, Tier 1 | 1,000 | Unlimited |
| Auto-scales with quality | 10k → 100k → unlimited | Unlimited |

Since your flow is customer-initiated, **you can launch before verification completes.** Do it.

## 3.4 Environment variables ❄

```bash
WA_GRAPH_VERSION=v23.0            # check current version in Meta docs
WA_PHONE_NUMBER_ID=123456789012345
WA_WABA_ID=987654321098765
WA_TOKEN=EAAxxxxx...              # permanent system user token
WA_VERIFY_TOKEN=<random 32 chars> # you invent this; used for webhook handshake
WA_APP_SECRET=<from app settings> # used to verify X-Hub-Signature-256

DATABASE_URL=postgres://...
STORAGE_ROOT=/data/customers
RENDERER_URL=http://localhost:4000
CHATWOOT_URL=http://chatwoot:3000
CHATWOOT_API_TOKEN=...
ADMIN_ALERT_PHONE=91XXXXXXXXXX
```

---

# 4. Infrastructure

## 4.1 Recommended: Oracle Cloud Always Free

Ampere A1 ARM instance, 4 OCPU / 24 GB RAM, 200 GB block storage — free forever, no credit card charge. Runs the entire stack with room to spare.

Region: choose Mumbai or Hyderabad for latency. If "Out of capacity" errors appear (common on ARM), retry via the API on a loop, or fall back to Hetzner.

## 4.2 docker-compose.yml

```yaml
services:
  caddy:
    image: caddy:2-alpine
    ports: ["80:80", "443:443"]
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: ${PG_PASSWORD}
      POSTGRES_DB: giftmahal
    volumes: [pgdata:/var/lib/postgresql/data]
    restart: unless-stopped

  bot:                       # your Node app: webhook + state machine
    build: ./bot
    env_file: .env
    volumes:
      - /data/customers:/data/customers
    depends_on: [db]
    restart: unless-stopped

  renderer:                  # your existing 4-template software
    build: ./renderer
    volumes:
      - /data/customers:/data/customers
    restart: unless-stopped

  chatwoot:
    image: chatwoot/chatwoot:latest
    env_file: .env.chatwoot
    depends_on: [db, redis]
    restart: unless-stopped

  redis:                     # required by Chatwoot only
    image: redis:7-alpine
    volumes: [redisdata:/data]
    restart: unless-stopped

  n8n:                       # optional — ops glue, not the core bot
    image: n8nio/n8n:latest
    environment:
      - N8N_HOST=n8n.giftmahal.in
      - WEBHOOK_URL=https://n8n.giftmahal.in
    volumes: [n8ndata:/home/node/.n8n]
    restart: unless-stopped

volumes: { pgdata:, redisdata:, n8ndata:, caddy_data: }
```

**Caddyfile** (auto-TLS, zero config):

```
api.giftmahal.in   { reverse_proxy bot:3000 }
chat.giftmahal.in  { reverse_proxy chatwoot:3000 }
n8n.giftmahal.in   { reverse_proxy n8n:5678 }
```

## 4.3 n8n or plain code? — the honest answer

I recommended n8n in the earlier conversation. On reflection, for **your** core flow, plain Node code wins:

| | n8n | Node code |
|---|---|---|
| 12-state machine with photo counting | Painful — lots of Switch/Set nodes, hard to read | ~500 lines, trivially testable |
| Media download + file writes | Awkward | Native |
| 7-language string lookup | Ugly | One JSON import |
| Debugging at 2am | Click through a canvas | `console.log` + stack trace |
| Version control | JSON blobs in git | Real diffs |

**Recommendation: build the bot as code. Keep n8n for side-automations** — daily order summary to your phone, Google Sheets sync, low-stock alerts, backup jobs. That's where its visual model genuinely helps.

If you strongly prefer visual flows, use **Typebot** (open source) for the *linear* part (language → occasion → design) and hand off to code at the photo-upload step.

---

# 5. System Architecture

```
  Meta Ads (CTWA)          Meesho listing / packaging insert
        │                              │
        └──────────► WhatsApp ◄────────┘
                        │
                        ▼
         ┌──────────────────────────────┐
         │  Meta WhatsApp Cloud API     │
         └──────┬─────────────────▲─────┘
        webhook │                 │ POST /messages
                ▼                 │
    ┌───────────────────────────────────────────┐
    │  BOT (Node)  api.giftmahal.in             │
    │  ├─ /whatsapp/webhook   verify + ACK 200  │
    │  ├─ queue → handler                       │
    │  ├─ state machine (§8)                    │
    │  ├─ i18n strings (§16)                    │
    │  └─ media downloader (§11)                │
    └───┬──────────────┬────────────┬───────────┘
        │              │            │
        ▼              ▼            ▼
   ┌─────────┐   ┌───────────┐  ┌──────────────┐
   │ Postgres│   │ /data/    │  │  RENDERER    │
   │ sessions│   │ customers │  │  (your app)  │
   │ orders  │   │ raw/      │  │  4 templates │
   └─────────┘   │ rendered/ │  │  → PNG/PDF   │
                 │ final/    │  └──────────────┘
                 └─────┬─────┘
                       │
              ┌────────▼─────────┐      ┌──────────────┐
              │ PRINT DASHBOARD  │      │  CHATWOOT    │
              │ (you & staff)    │      │ human handoff│
              └──────────────────┘      └──────────────┘
```

**Critical design rule:** the webhook endpoint does **nothing** except verify the signature, enqueue the event, and return `200`. All work happens in a separate consumer. Meta retries webhooks it thinks failed, and a slow handler = duplicate photos and duplicate replies.

---

# 6. Data Model ❄

```sql
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
```

**Note the `designs` table.** Do not hardcode your 4 templates in the bot. The whole point is that adding template #5 should be one INSERT, not a deploy. This is the same "products are configuration" principle from your SaaS Technical Plan §16.

---

# 7. Storage & Folder Layout ❄

Key is the **phone number**, because the Meesho order ID arrives *last*.

```
/data/customers/
  919876543210/
    2026-07-26_a3f9/                 ← session folder: date + short id
      raw/
        01_wamid.HBgM...jpg          ← original as received (dedupe by wamid)
        02_wamid.HBgM...jpg
        ...
      screenshots/
        meesho_01.jpg
      rendered/
        v1.png                       ← first auto-render
        v2.png                       ← after "change photo 3"
        v3.png
      final/
        print_v3.pdf                 ← 300 DPI with bleed
      meta.json
```

**meta.json** (human-readable mirror of the DB row — invaluable when debugging or handing a folder to a printer):

```json
{
  "session_id": "a3f9...",
  "phone": "919876543210",
  "customer_name": "Priya",
  "lang": "hi",
  "occasion": "birthday",
  "design_id": "bday_collage_8",
  "photos": ["raw/01_....jpg", "raw/02_....jpg"],
  "fields": { "name": "Priya", "date": "25.08.2026" },
  "revisions": 2,
  "approved_render": "rendered/v3.png",
  "final_file": "final/print_v3.pdf",
  "source": "ctwa_ad",
  "ad_id": "1203...",
  "meesho_order_id": "311778447421...",
  "timeline": [
    {"at": "2026-07-26T17:12:03Z", "event": "session_started"},
    {"at": "2026-07-26T17:14:41Z", "event": "photos_complete", "count": 8},
    {"at": "2026-07-26T17:15:10Z", "event": "render_v1"},
    {"at": "2026-07-26T17:19:55Z", "event": "approved"},
    {"at": "2026-07-26T17:26:02Z", "event": "order_id_captured"}
  ]
}
```

## 7.1 Retention (DPDP Act 2023)

| Data | Retention | Action |
|---|---|---|
| `raw/` photos | 60 days after dispatch | Nightly cron delete |
| `rendered/`, `final/` | 90 days | Then delete |
| `screenshots/` | 60 days | Then delete |
| DB rows | Keep (anonymize phone after 1 year) | |

Send the consent line in the very first bot message and log it. Sample copy in §8, step 1.

---

# 8. Conversation Flow Specification ❄

## 8.1 State machine

```
                    ┌─────┐
   inbound msg ───► │ NEW │
                    └──┬──┘
                       │ send welcome + language list
                       ▼
              ┌────────────────┐
              │ AWAITING_LANG  │◄── invalid reply: re-send list (max 3×)
              └────────┬───────┘
                       │ list_reply lang_*
                       ▼
              ┌────────────────────┐
              │ AWAITING_OCCASION  │
              └────────┬───────────┘
                       │ list_reply occ_*
                       ▼
              ┌────────────────────┐
              │ AWAITING_TEMPLATE  │  send N design images + list
              └────────┬───────────┘
                       │ list_reply design_*
                       ▼
              ┌────────────────────┐   each image → counter++
              │ AWAITING_PHOTOS    │◄──────────────┐
              └────────┬───────────┘               │
                       │ count == photos_needed    │
                       ▼                           │
              ┌────────────────────┐               │
              │ AWAITING_TEXT      │               │
              └────────┬───────────┘               │
                       │ all fields captured       │
                       ▼                           │
              ┌────────────────────┐               │
              │ RENDERING          │ call renderer │
              └────────┬───────────┘               │
                       │ preview ready             │
                       ▼                           │
              ┌────────────────────┐               │
              │ AWAITING_APPROVAL  │───────────────┘
              └───┬────────────┬───┘  "change photo"
       "approve"  │            │ "change text" → AWAITING_TEXT
                  ▼            │ 3rd revision  → HUMAN
        ┌────────────────────┐ │
        │ AWAITING_ORDER_ID  │ │  send Meesho link
        └─────────┬──────────┘ │
                  │ screenshot + id confirmed
                  ▼
           ┌─────────────┐   ┌──────────┐   ┌────────────┐
           │ CONFIRMED   │──►│ IN_PRINT │──►│ DISPATCHED │
           └─────────────┘   └──────────┘   └────────────┘

  ANY STATE ──"agent"/"help"/3 failed parses──► HUMAN (Chatwoot)
  ANY STATE ──no reply 48h──► nudge template ──no reply 7d──► ABANDONED
```

## 8.2 Step-by-step message spec

### Step 0 — Inbound (any message, state NEW)

Detect source from the webhook `referral` object:

| Signal | `source` |
|---|---|
| `referral.source_type === 'ad'` | `ctwa_ad` (also store `source_id`, `ctwa_clid`) |
| Message text contains "meesho" / order-like digits | `meesho` |
| Neither | `organic` |

### Step 1 — Welcome + Language ⏱ reply within 30s

> **Send:** interactive **list**
>
> *Header:* `Gift Mahal 🎁`
> *Body (bilingual, since we don't know their language yet):*
> `Welcome to Gift Mahal! We make personalised photo frames. 🖼️\n\nGift Mahal में आपका स्वागत है! अपनी भाषा चुनें।\n\nBy continuing you agree that your photos will be used only to make your product.`
> *Button:* `Select Language`
> *Rows (7):* हिन्दी · English · मराठी · ગુજરાતી · తెలుగు · தமிழ் · ಕನ್ನಡ

Row IDs: `lang_hi`, `lang_en`, `lang_mr`, `lang_gu`, `lang_te`, `lang_ta`, `lang_kn`.

⚠️ **List limit is 10 rows total.** 7 languages fits exactly with room to spare. Do not add an 8th language without splitting into sections.

Log the consent line as accepted on selection.

### Step 2 — Occasion

> **Send:** interactive **list** in the chosen language
> *Body:* "Which occasion is this frame for?"
> *Rows:* Birthday 🎂 · Anniversary 💑 · Wedding 💍 · Friendship 🤝 · Baby / Newborn 👶 · Retirement 🎓 · Other ✨

Row IDs: `occ_birthday`, `occ_anniversary`, `occ_wedding`, `occ_friendship`, `occ_baby`, `occ_retirement`, `occ_other`.

7 rows — again inside the 10 limit. **When you exceed 10 occasions, split into two sections** (`sections[]` supports up to 10 sections × 10 rows, but total rows still capped at 10 — so you'd need a two-step "category → occasion" instead).

### Step 3 — Design selection

Query `designs where occasion = X and active`. Then:

1. Send each design as an **image message** with caption `1️⃣ 8-Photo Collage — 8 photos needed`
   *(send max 4–5; if more, paginate with a "See more designs" row)*
2. Send interactive **list**: `Choose your design` with rows `design_bday_collage_8` etc.

**Better option once you have >10 designs:** put them in the Meta Commerce catalog and send a **Multi-Product Message** (up to 30 items, native product cards, tap-to-select). Free. Requires catalog setup in Meta Business Suite.

### Step 4 — Photo collection

> **Send:** text
> `Great choice! 📸 Please send me **8 photos**, one by one or all together.\n\nTip: send the clearest photos — better photos, better frame!`

Set `photos_needed = design.photos_needed`, `state = AWAITING_PHOTOS`.

On each inbound image:
- dedupe on `wa_message_id`
- download, save to `raw/{NN}_{wamid}.jpg`
- increment counter
- **debounce the acknowledgement**: don't reply per photo. Wait 3 seconds of silence, then send one message: `Received 5 of 8 ✅ — 3 more to go`

Add utility commands, understood in all languages:
- `undo` / `हटाओ` → delete last photo, decrement
- `restart` / `फिर से` → reset session

When `photos_received == photos_needed` → advance. If they send extra, reply: `You've sent 9 — I'll use the first 8. Reply "undo" to remove the last one.`

### Step 5 — Text fields

Iterate `design.fields`. One question per field, one at a time:

> `What name should I write on the frame?` → store `field_values.name`
> `What date? (e.g. 25.08.2026) — or reply "skip"` → store `field_values.date`

Enforce `maxLen` server-side. Devanagari / regional scripts must be accepted verbatim — your renderer needs Noto Sans Devanagari etc. registered (Technical Plan §6).

### Step 6 — Render + preview

`state = RENDERING`. Send a holding message immediately: `Making your design… ⏳ (about 30 seconds)`

Call the renderer (§12). On success:

> **Send:** image (the preview PNG) with caption
> `Here's your frame! 🖼️ Happy with it?`
>
> **Then send:** interactive **buttons** (max 3):
> `[✅ Perfect]` `[🔄 Change photo]` `[✏️ Change text]`

Button IDs: `approve`, `change_photo`, `change_text`.

### Step 7 — Approval → Meesho

> **Send:** text with `preview_url: true`
> `Wonderful! 🎉 Please place your order here:\n\nhttps://meesho.com/s/p/XXXXX\n\nAfter ordering, send me a **screenshot of the order** and I'll start printing right away.`

`state = AWAITING_ORDER_ID`

### Step 8 — Order confirmation

See §14. On success:

> `Order #3117784474… confirmed ✅\nYour frame goes to print today. Delivery by 1 Aug.\n\nThank you for choosing Gift Mahal! 🎁`

`state = CONFIRMED`, create `orders` row, alert your dashboard + Chatwoot.

## 8.3 Global interrupts (checked before state routing)

| Trigger | Action |
|---|---|
| Text matches `agent\|help\|मदद\|बात\|call` | → `HUMAN`, notify Chatwoot, stop bot replies for this session |
| 3 consecutive unparseable replies in same state | → `HUMAN` |
| Text matches `restart\|फिर से\|start over` | Reset session, keep phone + lang |
| Inbound while `state = HUMAN` | Forward to Chatwoot, bot stays silent |

---

# 9. WhatsApp Message Payload Catalog ❄

Base: `POST https://graph.facebook.com/{WA_GRAPH_VERSION}/{WA_PHONE_NUMBER_ID}/messages`
Header: `Authorization: Bearer {WA_TOKEN}` · `Content-Type: application/json`

## 9.1 Text

```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "919876543210",
  "type": "text",
  "text": { "body": "Received 5 of 8 ✅", "preview_url": false }
}
```

## 9.2 Interactive List

```json
{
  "messaging_product": "whatsapp",
  "to": "919876543210",
  "type": "interactive",
  "interactive": {
    "type": "list",
    "header": { "type": "text", "text": "Gift Mahal 🎁" },
    "body":   { "text": "Welcome! Please choose your language." },
    "footer": { "text": "Gift Mahal · Personalised Frames" },
    "action": {
      "button": "Select Language",
      "sections": [{
        "title": "Languages",
        "rows": [
          { "id": "lang_hi", "title": "हिन्दी",  "description": "Hindi" },
          { "id": "lang_en", "title": "English", "description": "English" },
          { "id": "lang_mr", "title": "मराठी",  "description": "Marathi" },
          { "id": "lang_gu", "title": "ગુજરાતી", "description": "Gujarati" },
          { "id": "lang_te", "title": "తెలుగు",  "description": "Telugu" },
          { "id": "lang_ta", "title": "தமிழ்",   "description": "Tamil" },
          { "id": "lang_kn", "title": "ಕನ್ನಡ",   "description": "Kannada" }
        ]
      }]
    }
  }
}
```

**Hard limits — violating any of these returns a 400:**

| Field | Limit |
|---|---|
| `action.button` | 20 chars |
| `sections` | 10 |
| **total rows across all sections** | **10** |
| `row.id` | 200 chars |
| `row.title` | 24 chars |
| `row.description` | 72 chars |
| `header.text` | 60 chars |
| `body.text` | 1024 chars |
| `footer.text` | 60 chars |

⚠️ Regional-script titles eat characters fast. "ગુજરાતી" is 7 chars — fine. But "जन्मदिन का कोलाज" is 16. Test every language against the 24-char row title limit.

## 9.3 Interactive Buttons

```json
{
  "messaging_product": "whatsapp",
  "to": "919876543210",
  "type": "interactive",
  "interactive": {
    "type": "button",
    "body": { "text": "Here's your frame! Happy with it?" },
    "action": {
      "buttons": [
        { "type": "reply", "reply": { "id": "approve",       "title": "✅ Perfect" } },
        { "type": "reply", "reply": { "id": "change_photo",  "title": "🔄 Change photo" } },
        { "type": "reply", "reply": { "id": "change_text",   "title": "✏️ Change text" } }
      ]
    }
  }
}
```

Limits: **max 3 buttons**, `title` ≤ 20 chars, `id` ≤ 256 chars, unique ids.

## 9.4 Image (by public URL)

```json
{
  "messaging_product": "whatsapp",
  "to": "919876543210",
  "type": "image",
  "image": {
    "link": "https://cdn.giftmahal.in/designs/bday_collage_8.jpg",
    "caption": "1️⃣ 8-Photo Collage — needs 8 photos"
  }
}
```

Limits: image ≤ 5 MB, JPEG/PNG only, caption ≤ 1024 chars. The URL must be publicly reachable over HTTPS.

For previews (private), **upload first** then send by ID:

```bash
# 1. upload
curl -X POST "https://graph.facebook.com/v23.0/${PHONE_NUMBER_ID}/media" \
  -H "Authorization: Bearer ${TOKEN}" \
  -F "messaging_product=whatsapp" \
  -F "type=image/png" \
  -F "file=@rendered/v1.png"
# → { "id": "1234567890" }

# 2. send
# "image": { "id": "1234567890", "caption": "..." }
```

## 9.5 Template (outside the window)

```json
{
  "messaging_product": "whatsapp",
  "to": "919876543210",
  "type": "template",
  "template": {
    "name": "preview_ready",
    "language": { "code": "hi" },
    "components": [
      { "type": "body", "parameters": [
          { "type": "text", "text": "Priya" },
          { "type": "text", "text": "8-Photo Collage" } ] }
    ]
  }
}
```

## 9.6 Inbound webhook shapes ❄

**Text message with CTWA referral:**

```json
{
  "object": "whatsapp_business_account",
  "entry": [{ "id": "WABA_ID", "changes": [{ "field": "messages", "value": {
    "messaging_product": "whatsapp",
    "metadata": { "display_phone_number": "919...", "phone_number_id": "123..." },
    "contacts": [{ "profile": { "name": "Priya" }, "wa_id": "919876543210" }],
    "messages": [{
      "from": "919876543210",
      "id": "wamid.HBgMOTE5ODc2NTQzMjEwFQIAEhgg...",
      "timestamp": "1785000000",
      "type": "text",
      "text": { "body": "Hi" },
      "referral": {
        "source_url": "https://fb.me/xyz",
        "source_id": "120210000000000",
        "source_type": "ad",
        "headline": "Personalised Photo Frames",
        "body": "Starting ₹181",
        "ctwa_clid": "ARAa..."
      }
    }]
  }}]}]
}
```

**List reply:**
```json
"messages": [{ "from":"91...", "id":"wamid...", "type":"interactive",
  "interactive": { "type":"list_reply",
    "list_reply": { "id":"lang_hi", "title":"हिन्दी", "description":"Hindi" } } }]
```

**Button reply:**
```json
"interactive": { "type":"button_reply",
  "button_reply": { "id":"approve", "title":"✅ Perfect" } }
```

**Image:**
```json
"messages": [{ "from":"91...", "id":"wamid...", "type":"image",
  "image": { "mime_type":"image/jpeg", "sha256":"...", "id":"MEDIA_ID_HERE" } }]
```

**Status update (delivery receipts — subscribe but mostly ignore):**
```json
"statuses": [{ "id":"wamid...", "status":"delivered", "timestamp":"...",
  "recipient_id":"91...", "conversation": { "id":"...",
  "origin": { "type":"referral_conversion" } }, "pricing": { "billable": false } }]
```

`pricing.billable: false` on your conversations confirms the free-window logic is working. Log it.

---

# 10. Webhook Handler — implementation

## 10.1 Verification endpoint (GET)

```js
// GET /whatsapp/webhook
app.get('/whatsapp/webhook', (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === process.env.WA_VERIFY_TOKEN) {
    return res.status(200).send(challenge);   // must be raw, not JSON
  }
  res.sendStatus(403);
});
```

## 10.2 Receiver (POST) — ACK first, work later

```js
import crypto from 'crypto';

// IMPORTANT: capture the raw body for signature verification
app.use('/whatsapp/webhook', express.raw({ type: 'application/json' }));

app.post('/whatsapp/webhook', async (req, res) => {
  // 1. verify signature
  const sig = req.get('X-Hub-Signature-256') || '';
  const expected = 'sha256=' + crypto
    .createHmac('sha256', process.env.WA_APP_SECRET)
    .update(req.body)                      // raw Buffer
    .digest('hex');
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return res.sendStatus(401);
  }

  // 2. persist + ACK IMMEDIATELY (target < 200ms)
  const payload = JSON.parse(req.body.toString());
  await db.query(
    'insert into webhook_events (raw) values ($1)', [payload]);
  res.sendStatus(200);

  // 3. nudge the worker (or let it poll every 500ms)
  worker.wake();
});
```

> ⚠️ **The single most common production bug.** If you process inline and take >5s, Meta marks the delivery failed and re-sends. You get duplicate photos, duplicate replies, duplicate counter increments. ACK first. Always.

## 10.3 Worker loop

```js
async function processNext() {
  const { rows } = await db.query(`
    update webhook_events set status='processing', attempts = attempts + 1
    where id = (select id from webhook_events
                where status='pending' order by id limit 1
                for update skip locked)
    returning *`);
  if (!rows.length) return false;

  const ev = rows[0];
  try {
    await handleEvent(ev.raw);
    await db.query(`update webhook_events set status='done',
                    processed_at=now() where id=$1`, [ev.id]);
  } catch (err) {
    const status = ev.attempts >= 3 ? 'failed' : 'pending';
    await db.query(`update webhook_events set status=$2, error=$3 where id=$1`,
                   [ev.id, status, err.message]);
    if (status === 'failed') await alertAdmin(ev.id, err);
  }
  return true;
}

setInterval(async () => { while (await processNext()) {} }, 500);
```

## 10.4 Event dispatcher

```js
async function handleEvent(payload) {
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const v = change.value;
      if (change.field !== 'messages') continue;

      // delivery receipts — log only
      for (const st of v.statuses ?? []) await logStatus(st);

      for (const msg of v.messages ?? []) {
        // DEDUPE — the second most common bug
        const ins = await db.query(
          `insert into messages (phone_e164, direction, wa_message_id, type, payload)
           values ($1,'in',$2,$3,$4)
           on conflict (wa_message_id) where direction='in' do nothing
           returning id`,
          [msg.from, msg.id, msg.type, msg]);
        if (!ins.rows.length) continue;      // already handled

        const profileName = v.contacts?.[0]?.profile?.name;
        await runStateMachine(msg, profileName);
      }
    }
  }
}
```

## 10.5 State machine skeleton

```js
async function runStateMachine(msg, profileName) {
  const session = await getOrCreateSession(msg.from, msg, profileName);
  await touchWindow(session, msg);           // update window_expires_at

  // --- global interrupts, checked first ---
  if (isHelpRequest(msg))  return escalateToHuman(session, 'user_requested');
  if (isRestart(msg))      return resetSession(session);
  if (session.state === 'HUMAN') return forwardToChatwoot(session, msg);

  const input = normalize(msg);
  // → { kind:'list'|'button'|'text'|'image'|'other', id?, text?, mediaId? }

  switch (session.state) {
    case 'NEW':               return sendWelcome(session);
    case 'AWAITING_LANG':     return onLanguage(session, input);
    case 'AWAITING_OCCASION': return onOccasion(session, input);
    case 'AWAITING_TEMPLATE': return onDesign(session, input);
    case 'AWAITING_PHOTOS':   return onPhoto(session, input, msg);
    case 'AWAITING_TEXT':     return onFieldValue(session, input);
    case 'RENDERING':         return send(session, t(session,'please_wait'));
    case 'AWAITING_APPROVAL': return onApproval(session, input);
    case 'AWAITING_ORDER_ID': return onOrderProof(session, input, msg);
    default:                  return escalateToHuman(session, 'unknown_state');
  }
}

function normalize(msg) {
  if (msg.type === 'interactive') {
    const i = msg.interactive;
    if (i.type === 'list_reply')   return { kind:'list',   id: i.list_reply.id };
    if (i.type === 'button_reply') return { kind:'button', id: i.button_reply.id };
  }
  if (msg.type === 'text')  return { kind:'text',  text: msg.text.body.trim() };
  if (msg.type === 'image') return { kind:'image', mediaId: msg.image.id,
                                     mime: msg.image.mime_type };
  return { kind: 'other' };
}
```

## 10.6 Handling misfires

```js
async function onLanguage(session, input) {
  if (input.kind !== 'list' || !input.id.startsWith('lang_')) {
    return retryOrEscalate(session, () => sendLanguageList(session));
  }
  await updateSession(session.id, {
    lang: input.id.replace('lang_',''),
    state: 'AWAITING_OCCASION', retry_count: 0
  });
  return sendOccasionList(session);
}

async function retryOrEscalate(session, resend) {
  const n = (session.retry_count ?? 0) + 1;
  if (n >= 3) return escalateToHuman(session, 'parse_failures');
  await updateSession(session.id, { retry_count: n });
  await send(session, t(session, 'didnt_understand'));
  return resend();
}
```

---

# 11. Media Download Pipeline — implementation

Two-step: media ID → short-lived URL → authenticated download.

```js
import fs from 'fs/promises';
import path from 'path';

const GRAPH = `https://graph.facebook.com/${process.env.WA_GRAPH_VERSION}`;
const AUTH  = { Authorization: `Bearer ${process.env.WA_TOKEN}` };

async function downloadMedia(mediaId) {
  // step 1 — resolve URL (valid ~5 minutes)
  const metaRes = await fetch(`${GRAPH}/${mediaId}`, { headers: AUTH });
  if (!metaRes.ok) throw new Error(`media meta ${metaRes.status}`);
  const meta = await metaRes.json();
  // → { url, mime_type, sha256, file_size, id, messaging_product }

  // step 2 — download WITH the bearer token (a plain fetch returns 401)
  const binRes = await fetch(meta.url, { headers: AUTH });
  if (!binRes.ok) throw new Error(`media download ${binRes.status}`);
  const buf = Buffer.from(await binRes.arrayBuffer());

  return { buf, mime: meta.mime_type, sha256: meta.sha256, bytes: meta.file_size };
}

async function onPhoto(session, input, msg) {
  if (input.kind !== 'image') {
    return send(session, t(session, 'send_photos_only'));
  }

  const { buf, mime, sha256, bytes } = await downloadMedia(input.mediaId);

  const ext  = mime === 'image/png' ? 'png' : 'jpg';
  const idx  = String(session.photos_received + 1).padStart(2, '0');
  const rel  = `raw/${idx}_${msg.id.slice(-12)}.${ext}`;
  const abs  = path.join(session.folder_path, rel);

  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, buf);

  await db.query(`insert into media
      (session_id, wa_media_id, wa_message_id, kind, mime_type, bytes,
       sha256, local_path, slot_index)
     values ($1,$2,$3,'photo',$4,$5,$6,$7,$8)
     on conflict (wa_message_id) do nothing`,
    [session.id, input.mediaId, msg.id, mime, bytes, sha256, rel,
     session.photos_received + 1]);

  const count = await countPhotos(session.id);
  await updateSession(session.id, { photos_received: count });

  if (count >= session.photos_needed) {
    await updateSession(session.id, { state: 'AWAITING_TEXT' });
    return askNextField({ ...session, photos_received: count });
  }
  return debouncedAck(session, count);   // §11.1
}
```

## 11.1 Debounced acknowledgement

Customers send 8 photos in a burst. Replying 8 times is spammy and burns rate limit.

```js
const ackTimers = new Map();

function debouncedAck(session, count) {
  clearTimeout(ackTimers.get(session.id));
  ackTimers.set(session.id, setTimeout(async () => {
    ackTimers.delete(session.id);
    const fresh = await getSession(session.id);
    if (fresh.state !== 'AWAITING_PHOTOS') return;   // already advanced
    const left = fresh.photos_needed - fresh.photos_received;
    await send(fresh, t(fresh, 'photos_progress', {
      got: fresh.photos_received, need: fresh.photos_needed, left }));
  }, 3000));
}
```

> **Note:** an in-memory timer map dies on restart. Acceptable at your volume — the worst case is a missing "5 of 8" message. If you want durability, store `ack_due_at` on the session and have a 1s cron sweep it.

## 11.2 Media limits

| Type | Max size | Formats |
|---|---|---|
| Image inbound/outbound | 5 MB | jpeg, png |
| Document | 100 MB | pdf, doc, xls… |
| Media URL validity | ~5 min | Download immediately, never store the URL |

If a customer sends a photo as a **document** (some Android galleries do this for full quality), handle `msg.type === 'document'` with an image mime and treat it as a photo. This is common in India and worth handling on day one.

---

# 12. Renderer Integration Contract ❄

Keep the bot and the renderer decoupled by one HTTP call. This is the seam that later becomes your SaaS render API (Technical Plan §9).

## 12.1 Request

```http
POST http://renderer:4000/render
Content-Type: application/json

{
  "sessionId": "a3f9...",
  "designId": "bday_collage_8",
  "folder": "/data/customers/919876543210/2026-07-26_a3f9",
  "photos": ["raw/01_....jpg", "raw/02_....jpg", "..."],
  "fields": { "name": "Priya", "date": "25.08.2026" },
  "outputs": [
    { "kind": "preview", "format": "png", "maxWidth": 1080 },
    { "kind": "print",   "format": "pdf", "dpi": 300, "bleedMm": 3 }
  ],
  "revision": 1
}
```

## 12.2 Response

```json
{
  "ok": true,
  "preview": "rendered/v1.png",
  "print":   "final/print_v1.pdf",
  "warnings": [
    { "code": "LOW_DPI", "slot": 3, "effectiveDpi": 118,
      "message": "Photo 3 may print blurry" }
  ],
  "ms": 4200
}
```

Errors: `{ "ok": false, "code": "ASSET_MISSING", "message": "..." }`

## 12.3 Bot behaviour on warnings

Surface `LOW_DPI` to the customer *before* they approve — it prevents the most common refund:

> `⚠️ Photo 3 is a bit low quality and may look blurry in print. Want to send a clearer one?`
> `[🔄 Replace photo 3]` `[👍 It's fine]`

## 12.4 Timeouts

| | |
|---|---|
| Bot → renderer timeout | 90s |
| Retries | 2, with 5s backoff |
| On final failure | `state = HUMAN`, alert admin, tell customer `"Our designer is finishing this by hand — you'll get it within an hour"` (never show an error) |

---

# 13. Approval & Revision Loop

## 13.1 Handling each button

```js
async function onApproval(session, input) {
  if (input.kind !== 'button') return retryOrEscalate(session, () => resendPreview(session));

  switch (input.id) {
    case 'approve':
      await updateSession(session.id, { state: 'AWAITING_ORDER_ID' });
      return sendMeeshoLink(session);

    case 'change_text':
      await updateSession(session.id, { state: 'AWAITING_TEXT', field_cursor: 0 });
      return askNextField(session);

    case 'change_photo':
      return askWhichPhoto(session);      // → list: "Photo 1..Photo 8" (max 10 ✓)
  }
}
```

## 13.2 Photo replacement sub-flow

1. Send list `Which photo do you want to change?` → rows `slot_1` … `slot_8`
   *(⚠️ exactly at the 10-row limit for an 8-photo collage. For a 12-photo design you must ask them to **type** the number instead.)*
2. Store `replacing_slot = 3`, `state = AWAITING_PHOTOS` (with `photos_needed` unchanged)
3. Next inbound image overwrites `raw/03_*.jpg` rather than appending
4. Re-render as `v{n+1}.png`, `revision_count++`

## 13.3 Revision cap

```js
if (session.revision_count >= 3) {
  await escalateToHuman(session, 'revision_limit');
  return send(session, t(session, 'connecting_designer'));
}
```

Three automated revisions is the right cap. Beyond that the customer usually wants something the templates can't do, and a human should read the thread. Track this — **the average revision count per design is your best signal for which templates to fix or retire.**

---

# 14. Meesho Order-ID Capture

This is your biggest operational pain and it deserves care.

## 14.1 The truncation problem ⚠️

On the Meesho **order list / order details** screen, the order number renders truncated:

```
Order #311778447421...
```

OCR of that screenshot gives you a **partial ID**. You cannot reliably reconstruct the rest. Design for this rather than fighting it.

## 14.2 The capture ladder

Try each rung; fall through on failure.

| # | Method | Reliability |
|---|---|---|
| 1 | Ask customer to **type/paste** the order ID (Meesho supports copy on the sub-order screen) | Highest |
| 2 | OCR the screenshot → extract digits → **confirm with the customer** | Good |
| 3 | Store the partial + amount + delivery date as a composite key; you reconcile manually against your Meesho seller panel | Fallback |
| 4 | `HUMAN` escalation | Last resort |

**Message copy:**

> `Order placed? 🎉 Please send:\n1️⃣ A screenshot of the order, and\n2️⃣ The Order ID as text (copy it from the order page)\n\nThis helps us match your photos to your order.`

Asking for both up front means rung 1 usually succeeds and OCR just cross-checks it.

## 14.3 OCR implementation

```js
import { createWorker } from 'tesseract.js';
import sharp from 'sharp';

const ORDER_RX = /(?:order\s*#?\s*)?(\d{10,25})/gi;
const AMOUNT_RX = /₹\s?([\d,]+)/;
const DATE_RX   = /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec))/i;

async function ocrOrderScreenshot(absPath) {
  // preprocess: upscale + grayscale + threshold → big accuracy win on
  // mobile screenshots
  const prepped = await sharp(absPath)
    .resize({ width: 1400, withoutEnlargement: false })
    .grayscale()
    .normalise()
    .threshold(160)
    .toBuffer();

  const worker = await createWorker('eng');
  await worker.setParameters({ tessedit_char_whitelist:
    '0123456789#₹.,:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz ' });
  const { data } = await worker.recognize(prepped);
  await worker.terminate();

  const text = data.text;
  const ids  = [...text.matchAll(ORDER_RX)].map(m => m[1])
                 .sort((a,b) => b.length - a.length);
  return {
    raw: text,
    confidence: data.confidence,
    orderId: ids[0] ?? null,
    truncated: /\.\.\.|…/.test(text),
    amountPaise: AMOUNT_RX.test(text)
      ? parseInt(text.match(AMOUNT_RX)[1].replace(/,/g,'')) * 100 : null,
    deliveryDate: text.match(DATE_RX)?.[1] ?? null
  };
}
```

## 14.4 Confirmation flow — never trust OCR silently

```js
async function onOrderProof(session, input, msg) {
  // customer typed the ID
  if (input.kind === 'text') {
    const typed = input.text.replace(/\D/g,'');
    if (typed.length >= 10) return confirmOrder(session, typed, 'customer_typed');
    return send(session, t(session, 'order_id_too_short'));
  }

  // customer sent a screenshot
  if (input.kind === 'image') {
    const { buf, mime } = await downloadMedia(input.mediaId);
    const rel = `screenshots/meesho_${Date.now()}.jpg`;
    await saveFile(session, rel, buf);

    const ocr = await ocrOrderScreenshot(path.join(session.folder_path, rel));
    await recordScreenshot(session, rel, ocr);

    if (ocr.orderId && !ocr.truncated && ocr.confidence > 70) {
      return sendButtons(session, {
        body: t(session,'confirm_order_id', { id: ocr.orderId }),
        buttons: [
          { id: `oid_ok:${ocr.orderId}`, title: '✅ Correct' },
          { id: 'oid_retype',            title: '✏️ Type it' }
        ]
      });
    }
    // truncated or low confidence → ask for the text
    return send(session, t(session, 'please_type_order_id'));
  }

  return send(session, t(session, 'send_screenshot_or_id'));
}
```

## 14.5 Reconciliation

Nightly, export your Meesho seller-panel orders (CSV) and match on:

1. Exact `meesho_order_id`
2. Partial prefix + amount + date
3. Nothing matched → flag in the dashboard as **"Unmatched — check manually"**

Do not block printing on a match. Print on approval; match for accounting.

---

# 15. Message Templates to Get Approved

Templates need Meta approval (usually 1–24h, sometimes rejected). Submit these in **week 1** so they're ready when you launch. Category **UTILITY** — cheaper and higher approval rate than MARKETING.

| Name | Category | Body (English; submit each language separately) | Use |
|---|---|---|---|
| `preview_ready` | Utility | `Hi {{1}}, your Gift Mahal frame design is ready! 🖼️ Reply to this message to see it and approve.` | Window closed while rendering |
| `photos_pending` | Utility | `Hi {{1}}, we're still waiting for {{2}} more photo(s) to make your frame. Reply here to continue.` | 24h nudge |
| `order_confirmed` | Utility | `Your order {{1}} is confirmed ✅ Your frame is going to print. Expected delivery: {{2}}.` | Post-confirmation |
| `dispatch_notice` | Utility | `Good news {{1}}! Your frame has been dispatched 📦 Order {{2}}. Delivery by {{3}}.` | Shipping |
| `design_reminder` | Utility | `Hi {{1}}, your frame design is waiting for approval. Reply here to see it again.` | 48h nudge |

## 15.1 Approval tips

- **No promotional language in a utility template.** "Sale!", "Offer!", "Limited time!" gets it reclassified as marketing or rejected.
- Variables must have sample values when submitting.
- Do not start or end the body with a variable.
- Every language needs its own submission under the same template name.
- Rejected? Read the reason in WhatsApp Manager, edit, resubmit. Repeated rejections hurt account quality.

## 15.2 Nudge scheduler

```sql
-- run every 15 min
select * from sessions
where state in ('AWAITING_PHOTOS','AWAITING_TEXT','AWAITING_APPROVAL')
  and last_inbound_at < now() - interval '24 hours'
  and last_inbound_at > now() - interval '7 days'
  and nudge_count < 2;
```

Nudge at +24h and +72h. After 7 days → `ABANDONED`. Do not nudge more than twice; block rates rise sharply and a low quality rating shrinks your messaging limits.

---

# 16. Localization Strategy

## 16.1 Ship 2 languages, structure for 7

Translating a flow you haven't validated is wasted work. **Launch with Hindi + English.** Add the other five once the flow is stable — it becomes a pure data change.

## 16.2 Structure

```
/bot/i18n/
  en.json
  hi.json
  mr.json  gu.json  te.json  ta.json  kn.json
```

```json
{
  "welcome_body": "Welcome to Gift Mahal! We make personalised photo frames. 🖼️",
  "choose_occasion": "Which occasion is this frame for?",
  "send_photos": "Great choice! 📸 Please send me *{{need}} photos*, one by one or all together.",
  "photos_progress": "Received {{got}} of {{need}} ✅ — {{left}} more to go",
  "ask_name": "What name should I write on the frame?",
  "rendering": "Making your design… ⏳ (about 30 seconds)",
  "preview_caption": "Here's your frame! 🖼️ Happy with it?",
  "btn_approve": "✅ Perfect",
  "btn_change_photo": "🔄 Change photo",
  "btn_change_text": "✏️ Change text",
  "meesho_link": "Wonderful! 🎉 Please place your order here:\n\n{{link}}\n\nAfter ordering, send me a screenshot and the Order ID.",
  "confirm_order_id": "Is this your Order ID?\n\n{{id}}",
  "didnt_understand": "Sorry, I didn't catch that. Please tap one of the options below 👇",
  "connecting_designer": "Connecting you with our designer — one moment 🙏"
}
```

```js
function t(session, key, vars = {}) {
  const dict = strings[session.lang] ?? strings.en;
  let s = dict[key] ?? strings.en[key] ?? key;
  for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{{${k}}}`, v);
  return s;
}
```

## 16.3 Script-specific gotchas ❄

| Issue | Handling |
|---|---|
| Row title 24-char limit | Test every string in every language. Devanagari and Tamil overflow fast |
| Renderer font coverage | Noto Sans Devanagari (hi/mr), Noto Sans Gujarati, Telugu, Tamil, Kannada — all OFL, all free |
| Client↔print parity | The **exact same font files** must be in the browser preview and the print renderer. This is Technical Plan §6's parity rule and it applies here |
| Mixed script + emoji | `"Rohit ♥ प्रिया"` must render identically. Add it to your render test set on day one |

---

# 17. Human Handoff (Chatwoot)

## 17.1 Why you still need it

Automation gets you ~85% of conversations. The other 15% — unusual requests, complaints, "can you add my dog", angry customers — need you. Without a proper inbox you'll be reading raw webhook logs.

## 17.2 Setup

Chatwoot has a native **WhatsApp Cloud API** channel. You point *the same* `PHONE_NUMBER_ID` at it. Two consumers, one number:

**Option A (simple, recommended to start):** Bot owns the webhook. On escalation, the bot pushes the conversation history into Chatwoot via API and stops replying. You reply from Chatwoot, which sends via the Cloud API directly.

```js
async function escalateToHuman(session, reason) {
  await updateSession(session.id, { state: 'HUMAN' });

  const contact = await chatwoot.upsertContact({
    phone_number: '+' + session.phone_e164,
    name: session.wa_profile_name ?? session.phone_e164,
    custom_attributes: {
      session_id: session.id,
      lang: session.lang,
      occasion: session.occasion,
      design: session.template_id,
      photos: `${session.photos_received}/${session.photos_needed}`,
      revisions: session.revision_count,
      folder: session.folder_path,
      preview: session.current_render,
      escalation_reason: reason
    }
  });

  const conv = await chatwoot.createConversation(contact.id, { status: 'open' });
  for (const m of await getMessages(session.id)) {
    await chatwoot.createMessage(conv.id, {
      content: renderForAgent(m),
      message_type: m.direction === 'in' ? 'incoming' : 'outgoing'
    });
  }
  await chatwoot.addLabels(conv.id, ['escalated', reason, session.lang]);
  await notifyAdmin(`🔔 Escalation: ${session.phone_e164} (${reason})`);
}
```

**Option B (cleaner, more work):** Chatwoot owns the webhook; an n8n workflow between Chatwoot and your bot decides bot-vs-human per conversation. Do this only if you hire staff.

## 17.3 Returning to the bot

Add a Chatwoot canned response / label `bot-resume` that calls a webhook on your bot to set `state` back. Otherwise a customer stuck in `HUMAN` never gets automated flow again.

---

# 18. Print Dashboard Requirements

You need one screen. Build it in React (you already do this daily).

| Column | Source |
|---|---|
| Thumbnail | `rendered/vN.png` |
| Customer | `wa_profile_name` + phone (click → open WhatsApp / Chatwoot) |
| Design | `designs.name_i18n` |
| Order ID | `orders.meesho_order_id` — 🔴 red badge if unmatched |
| Approved at | timestamp |
| Status | dropdown: placed → printing → printed → dispatched |
| Actions | **Download print file** · Open folder · Re-render · Message customer |

**Filters:** status, date, channel (meesho/direct), unmatched-only.
**Default view:** `status = 'placed'` sorted oldest-first — that's your print queue.

**Bulk action worth building early:** select 20 rows → download a ZIP of all print PDFs, named `{orderid}_{name}.pdf`. That's the single biggest time-saver at 50+ orders/day.

**Status change → WhatsApp:** flipping to `dispatched` fires the `dispatch_notice` template. This closes the loop with zero manual messaging.

---

# 19. Edge Case & Failure Catalog 🌱

| # | Case | Required behaviour |
|---|---|---|
| E1 | Duplicate webhook delivery | Dedupe on `wa_message_id` before any side effect (§10.4) |
| E2 | Customer sends 12 photos for an 8-slot design | Use first 8; tell them; offer `undo` |
| E3 | Customer sends photo as **document** | Detect image mime on `type:'document'`, treat as photo |
| E4 | Photo > 5 MB | WhatsApp rejects it before reaching you; customer sees WhatsApp's own error. Add a proactive line: "If a photo won't send, try sharing it as a normal photo, not a file" |
| E5 | HEIC from iPhone | WhatsApp converts to JPEG automatically. No action |
| E6 | Photo burst → 8 replies | Debounced ack (§11.1) |
| E7 | Customer picks language, then writes in a different one | Ignore; keep selected language. Offer `restart` |
| E8 | Renderer down | 2 retries → `HUMAN` + admin alert; customer told a designer is finishing it |
| E9 | Render succeeds but preview upload fails | Retry upload 3× → send print PDF as document instead |
| E10 | Customer disappears mid-flow (window closes) | Nudge template at +24h, +72h; `ABANDONED` at 7d |
| E11 | Customer returns after 3 days | Session is `ABANDONED` → start fresh but greet by name and skip language selection |
| E12 | OCR reads wrong order ID | Always confirm with buttons; never auto-accept (§14.4) |
| E13 | Order ID truncated in screenshot | Ask for typed ID; fall back to composite key (§14.2) |
| E14 | Two people share one phone / two orders in one chat | One active session per phone (unique partial index). Finish one, then start the next. Tell them: "Let's finish this frame first" |
| E15 | Customer asks for something templates can't do | 3-revision cap → `HUMAN` |
| E16 | Meta token expires | Use a **System User** token (never expires), not the 24h temp token. Alert on any 401 |
| E17 | Rate limit (429) | Exponential backoff, respect `Retry-After`. Cloud API default is generous (80 msg/s) — you will not hit this |
| E18 | Webhook signature mismatch | Return 401, log, alert. Usually means `WA_APP_SECRET` is wrong or a proxy mangled the raw body |
| E19 | Customer sends abusive/illegal image | Flag to `HUMAN`, retain for evidence, block via Chatwoot. Have a one-line ToS on your privacy page |
| E20 | Server restart mid-flow | State is in Postgres, so nothing is lost. Only in-memory ack timers die (harmless) |
| E21 | Same customer messages from a second number | Treated as a new session. Manual merge in dashboard |
| E22 | Customer requests photo deletion (DPDP) | Delete `raw/` + `media` rows within 72h; keep the order row anonymized |

---

# 20. Testing Checklist

## 20.1 Before touching production

- [ ] Webhook GET verification returns the raw challenge
- [ ] Signature verification rejects a tampered body
- [ ] Handler ACKs in < 200ms (measure it)
- [ ] Replaying the same webhook payload twice creates **one** message row, **one** photo, **one** counter increment
- [ ] Every list has ≤ 10 rows, every button set ≤ 3, every title ≤ 24/20 chars **in all 7 languages**
- [ ] Photo burst of 8 → exactly one progress reply
- [ ] `undo`, `restart`, `help` work from every state
- [ ] Renderer timeout → escalation, not a stuck session
- [ ] Devanagari + emoji string renders identically in preview and print PDF
- [ ] Media download uses the bearer token (a naked fetch on `meta.url` must fail — verify you handle it)

## 20.2 End-to-end drills

| Drill | Pass criteria |
|---|---|
| Full golden path, Hindi, 8 photos | Order confirmed, folder complete, print PDF valid at 300 DPI |
| Full golden path, English, 1 photo | Same |
| Change photo 3, then change text, then approve | `v3.png` exists, revision_count = 2 |
| Kill the renderer mid-flow | Session goes to HUMAN, admin alerted, customer sees no error |
| Kill the bot container mid-flow, restart | Session resumes at the right state |
| Send a truncated Meesho screenshot | Bot asks for typed ID |
| Say "help" at step 4 | Chatwoot conversation appears with full history + preview link |
| Wait 25h at AWAITING_PHOTOS | Nudge template delivered |

---

# 21. Build Phases

| Phase | Deliverable | Effort | Definition of done |
|---|---|---|---|
| **0** | Meta setup, new SIM, system user token, webhook echoes messages | 1–2 days | You message the number and see JSON in your logs |
| **1** | DB schema, webhook queue, dedupe, message log, state machine skeleton | 2–3 days | Replaying a payload twice is a no-op |
| **2** | Language + occasion + design lists (Hindi + English only) | 2–3 days | Full menu flow works end-to-end |
| **3** | Photo collection: download, folders, counter, debounced ack, undo | 3–4 days | 8 photos land in `raw/` correctly, every time |
| **4** | Text fields + renderer integration + preview send | 3–4 days | Customer gets a real preview of their real photos |
| **5** | Approval buttons + revision loop + revision cap | 2–3 days | 3 revisions then human handoff |
| **6** | Meesho link + screenshot + OCR + confirmation + `orders` row | 2–3 days | Order ID captured with confirmation |
| **7** | Chatwoot handoff + admin alerts | 2 days | "help" reaches you with full context |
| **8** | Print dashboard + bulk ZIP download + status→WhatsApp | 3–4 days | You can run a print day without opening a terminal |
| **9** | Templates approved + nudge scheduler + retention cron | 2 days | Abandoned carts get one recovery attempt |
| **10** | Remaining 5 languages | 2 days | Data-only change |
| **11** | Templates 5–20 | ongoing | Each new template = 1 INSERT |

**Total to production: roughly 4–6 weeks part-time.** Phases 0–6 alone (≈3 weeks) already eliminate the manual WhatsApp work — ship there and iterate.

---

# 22. Operational Runbook

## 22.1 Daily

- Check dashboard: `status = 'placed'` queue, unmatched order IDs
- Check Chatwoot: open escalations
- Check `webhook_events where status='failed'`

## 22.2 Weekly

- Review **WhatsApp Manager → Quality rating**. If it drops to Medium/Low, stop all nudges immediately and investigate — low quality shrinks messaging limits and eventually restricts the number
- Review `revision_count` by design — a design averaging >1.5 revisions needs fixing
- Review escalation reasons — the most common one is your next automation

## 22.3 Alerts to wire up (Telegram/email via n8n)

| Condition | Severity |
|---|---|
| `webhook_events` failed count > 0 | High |
| Any 401 from Graph API (token issue) | Critical |
| Renderer failure rate > 5% in an hour | High |
| Escalation count > 10/day | Medium |
| Sessions stuck in `RENDERING` > 5 min | High |
| Quality rating dropped | Critical |

## 22.4 Backups

```bash
# nightly cron
pg_dump giftmahal | gzip > /backup/db_$(date +%F).sql.gz
tar czf /backup/customers_$(date +%F).tar.gz /data/customers
find /backup -mtime +14 -delete
```

Push to any free object store or a second machine. Losing `/data/customers` means losing in-flight orders.

## 22.5 Cron jobs

| Job | Schedule | Action |
|---|---|---|
| `nudge.pending` | */15 min | §15.2 |
| `abandon.stale` | daily 03:00 | Sessions idle 7d → `ABANDONED` |
| `retention.photos` | daily 03:30 | Delete `raw/` >60d post-dispatch |
| `reconcile.meesho` | daily 09:00 | Match order IDs against seller export |
| `backup` | daily 02:00 | §22.4 |

---

# 23. Risks & Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| **Meesho contact-sharing policy** — putting a WhatsApp number in listing images violates most marketplace rules and can suspend the catalog or account | **High** | Get the Meta ads → WhatsApp channel working *before* you depend on the Meesho-listing path. Consider a packaging insert / thank-you card with the number instead, which is outside Meesho's listing rules |
| WhatsApp quality rating drops → messaging restricted | High | Cap nudges at 2. Never broadcast to non-consenting numbers. Reply fast (bot does this by design) |
| Meta business verification rejected | Medium | Submit GST/Udyam docs matching your display name exactly. You can operate unverified at 250 business-initiated/day meanwhile |
| Token leaked | High | System user token in env vars only, never in git. Rotate if exposed |
| Customer photo privacy (DPDP Act 2023) | High | Consent in message 1, 60-day auto-delete, deletion on request ≤72h, photos never reused |
| Preview ≠ print | High | Same fonts and same layout code both sides. Add Devanagari + emoji to the golden test set (Technical Plan §6) |
| Single machine = single point of failure | Medium | Nightly backups; the whole stack is a `docker compose up` away from restoration |
| Solo bandwidth | Medium | Ship phases 0–6, then stop and run the business for two weeks before building more |
| Meta changes API/pricing | Medium | Pin `WA_GRAPH_VERSION`; read the changelog quarterly. Keep the send/receive layer behind one module so a version bump is one file |

---

# 24. Migration Path to the SaaS

Nothing here is throwaway. Every component maps to a module in `Personalization-SaaS-PRD.md`:

| Built here | Becomes |
|---|---|
| `sessions` table | `projects` (PRD §7 project doc) |
| `designs` table | `templates` (Technical Plan §7) |
| `/data/customers/{phone}/` | Supabase Storage `uploads/{org}/{yyyymm}/` |
| Renderer HTTP contract (§12) | `POST /v1/projects/:id/render` (PRD §8) |
| Bot state machine | The **WhatsApp channel** — a differentiator no competitor has |
| Order-ID reconciliation | `orders.source` + `external_ref` (Technical Plan §7) |
| OCR + confirmation ladder | A merchant-facing feature: "connect your marketplace" |

Add `org_id` to every table from the start (nullable for now, always `null` = you). Then multi-tenancy is a migration, not a rewrite.

**The strategic point:** you are not building a side project. You are dogfooding segment S0 from your Business Plan §3, on real orders, with real customers, in the exact market you intend to sell to. When you pitch a print shop in Indore, "here's the WhatsApp bot that runs my own frame business" is a far better demo than a feature list.

---

*End of guide v1.0. Freeze §6–§9 and §12 before writing feature code; everything else iterates.*
