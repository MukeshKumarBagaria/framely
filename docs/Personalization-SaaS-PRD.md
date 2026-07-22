# Product Requirements Document (PRD)
## Photo Personalization Platform — v1 "Frames MVP"
*(Working codename: **Framely** — replace once named)*

| | |
|---|---|
| **Version** | 1.0 — Draft for build |
| **Date** | 13 July 2026 |
| **Owner** | Mukesh (Product + Engineering) |
| **Status** | Draft → sections marked ❄ **CONTRACT** freeze on approval; sections marked 🌱 **LIVING** iterate during build |
| **Companion docs** | `Personalization-SaaS-Business-Plan.md` (market, pricing, GTM) · `Personalization-SaaS-Technical-Plan.md` (stack, architecture, full DB DDL) |
| **Scope of this PRD** | v1.0 MVP + v1.1 flags. Product = **photo frames**. Everything is specified so a 2nd product type ships with zero schema/code changes. |

**How to use this document:** §6 (Template JSON), §7 (Project doc), §8 (API + errors), and the DB schema in the Technical Plan are ❄ CONTRACTS — freeze them before writing feature code; every other section may evolve. Requirement IDs (`FR-XXX-n`) are referenced in commits, tests, and issues.

---

## Table of Contents
1. Overview: Problem, Goals, Non-Goals, Success Metrics
2. Personas & Roles
3. Permission Matrix ❄
4. End-to-End User Journeys
5. Functional Requirements (Modules A–N) 🌱
6. Template Document Specification (JSON v1) ❄
7. Project Document Specification ❄
8. API Specification & Error Codes ❄
9. Plans, Limits & Feature Matrix ❄
10. Non-Functional Requirements
11. Analytics & Instrumentation Events
12. Edge-Case & Failure Catalog
13. Out of Scope (v1)
14. Open Questions & Decisions Log
15. Release Criteria (v1.0 launch gate)
16. Traceability Matrix
17. Glossary
Appendix A. Screen Inventory — every v1 screen with elements & states

---

# 1. Overview

## 1.1 Problem
Selling personalized photo products today requires a human designer per order: customers send photos over WhatsApp, the shop mocks up designs in Photoshop/Canva, proofs go back and forth, and a print file is produced manually. This caps order volume, kills margins, and makes online self-serve selling impossible for small print shops, photo studios, and gifting brands. Existing personalizer SaaS (Zakeke, Customily) is priced in USD with per-sale transaction fees, requires per-product manual setup, and never shows the customer *all* available designs with their photos placed.

## 1.2 Product summary
A multi-tenant SaaS where a merchant publishes photo-product templates once, and every customer who uploads photos **instantly sees those photos auto-placed (face-aware) on every matching template**, fine-tunes in a mobile-first editor, and places an order. The platform automatically produces the 300-DPI print-ready file with bleed. Merchants pay a flat INR subscription; previews cost the platform nothing (rendered client-side); only final print renders touch a server.

## 1.3 Goals (v1)
| # | Goal | Measure |
|---|---|---|
| G1 | Ship the magic moment | Upload → preview grid of ≥10 designs in ≤ 2s (p75, mid Android) |
| G2 | Fully automatic print output | ≥ 99.5% render success; 0 manual designer steps per order |
| G3 | Self-serve merchant onboarding | Signup → published store with 10 templates in < 60 min without support |
| G4 | Revenue-ready | Trial → paid conversion flow live (Razorpay), quotas enforced |
| G5 | Product-agnostic core | Adding "mug" later = catalog config + templates, no code |

## 1.4 Non-Goals (v1) — see §13 for full list
No in-platform customer payments (v1.1 flag), no Shopify/Woo apps, no template marketplace, no AI beyond client-side face detection, no multi-page products, no native mobile apps, no UI localization (English UI; **Devanagari text rendering in designs IS in scope**).

## 1.5 Success metrics (first 90 days post-launch)
- Activation: ≥ 60% of signups publish a store within 7 days.
- Magic funnel: upload → template selected ≥ 55%; template selected → order placed ≥ 25%.
- Reliability: render success ≥ 99.5%; render p95 ≤ 20s; preview grid p75 ≤ 2s.
- Business: 10 paying merchants by day 90; churn signal < 10%/mo; ≥ 1 merchant on Growth.

---

# 2. Personas & Roles

| Persona | Description | Primary device | Top jobs-to-be-done |
|---|---|---|---|
| **P1 — End Customer ("Priya")** | Buying a wedding/birthday frame; no account, low patience, mobile on 4G, may prefer Hindi names on the design | Android phone | See her photos on designs fast; tweak names/date; order; get confirmation |
| **P2 — Merchant Owner ("Ravi")** | Runs a print/photo shop or gifting D2C brand; non-technical; WhatsApp-centric | Android + desktop | Get a working store; receive orders; download print files; control costs |
| **P3 — Merchant Designer** | Ravi's part-time designer (or Ravi himself) | Desktop | Build/duplicate templates; manage assets; publish safely |
| **P4 — Merchant Staff (Viewer)** | Counter staff fulfilling orders | Desktop/phone | View orders, download files, update statuses |
| **P5 — Platform Admin (Mukesh)** | Operates the platform | Desktop | Curate platform library, monitor renders, manage orgs/billing |
| **P6 — API Developer** (v1.1+) | Integrates a merchant's existing site | — | Keys, docs, webhooks, embed |

**Auth model:** P2–P4 are Supabase Auth users attached to an org via `org_members.role`. P1 is **never** an auth user — she acts through a server-issued `share_token` scoped to one project. P5 uses an internal admin flag.

---

# 3. Permission Matrix ❄

Roles: **Owner** (one per org, transferable), **Admin**, **Designer**, **Viewer**. Enforced server-side (RLS + API checks); UI additionally hides forbidden actions.

| Capability | Owner | Admin | Designer | Viewer |
|---|:-:|:-:|:-:|:-:|
| View dashboard, orders, download print files | ✅ | ✅ | ✅ | ✅ |
| Update order status | ✅ | ✅ | ✅ | ✅ |
| Cancel order | ✅ | ✅ | ❌ | ❌ |
| Create/edit templates & assets (draft) | ✅ | ✅ | ✅ | ❌ |
| **Publish/unpublish templates** | ✅ | ✅ | ✅ | ❌ |
| Manage products & categories | ✅ | ✅ | ❌ | ❌ |
| Store settings & branding | ✅ | ✅ | ❌ | ❌ |
| Custom domain | ✅ | ✅ | ❌ | ❌ |
| Invite/remove members, change roles | ✅ | ✅ (not Owner) | ❌ | ❌ |
| Billing: plan, payment method, invoices | ✅ | ❌ | ❌ | ❌ |
| API keys & webhooks | ✅ | ✅ | ❌ | ❌ |
| Delete org / transfer ownership | ✅ | ❌ | ❌ | ❌ |

---

# 4. End-to-End User Journeys

### J1 — Customer: photos → ordered frame (the golden path)
1. Priya opens `ravistore.framely.in` (link from Instagram/WhatsApp). Store home shows products.
2. Taps **12×18 Portrait Frame** → product page: occasion chips (Wedding, Anniversary, Birthday…), price, "Personalize now."
3. Upload screen: taps "Add photos," selects 3 from gallery. Consent checkbox → enabled Upload. Client resizes/strips GPS, detects faces, uploads with progress (FR-UPL).
4. **Auto-preview gallery** appears: "12 designs for your 3 photos." Her photos are already placed, faces centered, in every card (FR-MAT). She filters "Wedding."
5. Taps a design → **Editor**: swaps photo 2 and 3, pinch-zooms her face in the circle slot, edits `Names` → "Rohit ♥ Priya", `Date` → "25.08.2026" (FR-EDT).
6. Taps **Preview** → full-screen final view with safe-area note. Taps **Order**.
7. Enters name + phone → order placed. Confirmation screen with order ID + resume link (auto-copied for WhatsApp). Print render starts in background (FR-ORD, FR-RND).
8. Ravi gets an email + dashboard alert; downloads the print-ready PDF; marks Printing → Shipped.

**Journey targets:** step 2→4 ≤ 60s on 4G; step 4 grid ≤ 2s after upload completes; zero dead-ends (every empty/error state has a next action).

### J2 — Merchant: signup → published store (< 60 min)
1. Ravi signs up (email or Google), verifies email.
2. Onboarding wizard: shop name → slug check (`ravistore` ✓) → logo (optional) → pick product presets (8×12, 12×18) → pick 10 platform templates to duplicate → **Store is live (trial)**.
3. Dashboard home shows checklist: ✅ store live · ⬜ share your link · ⬜ customize a template · ⬜ add payment method.
4. Opens a duplicated template in **Builder**, swaps the background asset, publishes (validation gate passes) (FR-TPL-5).
5. Shares store link on WhatsApp status. First test order arrives; downloads file.

### J3 — Designer: new template from scratch
Create → choose product (defines canvas mm/DPI) → Builder: add background asset → draw 3 photo slots (snap guides, safe-area overlay) → add text layers bound to new fields `names`, `date` → set fonts (Playfair Display, Noto Sans Devanagari fallback) → Save draft (autosaves) → **Publish** → validation runs (schema, asset refs, bounds, server test-render + thumbnail) → errors=0 → live; version snapshot recorded (FR-TPL-4/5).

### J4 — Billing lifecycle
Trial (14d, watermarking, 10 exports) → banner day-3 "Add payment" → subscribes to Starter via Razorpay (UPI autopay) → month 2 hits 80% exports (email + banner) → 100%: overage kicks in at ₹3/export (default ON, cap ₹2,000) → later upgrades to Growth (immediate, prorated) → card fails → `past_due` 7-day grace (renders still work) → resolved via updated mandate. Cancel: end of period; store paused after; data retained 60 days (FR-BIL).

### J5 — Failure journey (render fails)
Print render fails 3× (e.g. corrupt asset) → order remains `placed` with badge "file pending" → Ravi emailed with error summary + "Retry" button → platform admin sees it grouped in render monitor → fix → retry succeeds → customer never saw an error (FR-RND-5).

---

# 5. Functional Requirements 🌱

Notation: **FR-<MODULE>-<n>** · Priority **P0** (v1.0 blocker) / **P1** (v1.0 nice) / **P2** (v1.1) · AC = acceptance criteria.

## Module A — Accounts, Organizations & Team (FR-ORG)

**FR-ORG-1 (P0) Signup & login.** Email+password and Google OAuth (Supabase Auth). Email verification required before dashboard access.
AC: unverified users land on a verify screen with resend (60s cooldown); password min 8 chars; sessions persist 30 days; logout everywhere option.

**FR-ORG-2 (P0) Org creation wizard.** Name (2–60 chars), slug (3–30, `[a-z0-9-]`, live uniqueness check, reserved words blocked: `www, api, app, admin, mail`), optional logo (≤2 MB png/jpg/svg).
AC: slug immutable after creation (custom domain covers rebrands); wizard completable in ≤ 5 steps; abandoning mid-wizard resumes on next login.

**FR-ORG-3 (P0) Trial.** Org creation starts a 14-day trial (plan `trial`). Persistent banner shows days remaining; day-3 and day-12 emails.
AC: trial limits per §9; on expiry without subscription → org `paused` state (J4); data retained 60 days then purge job.

**FR-ORG-4 (P1) Team invites (Growth+).** Invite by email with role; invitee without an account gets signup-then-join flow.
AC: pending invites expire in 7 days; seat limits per §9 enforced at invite time; Owner transfer requires password re-auth; removing a member revokes sessions within 60s.

**FR-ORG-5 (P0) Role enforcement.** Every mutation checked server-side per §3; RLS on all tenant tables (Technical Plan §7).
AC: a Viewer JWT calling `POST /v1/templates` receives `403 ERR_FORBIDDEN_ROLE`; UI never renders forbidden primary actions.

**FR-ORG-6 (P1) Org switcher.** Users belonging to multiple orgs switch via top-bar menu; last org remembered per device.

**FR-ORG-7 (P1) Org deletion.** Owner-only, type-slug-to-confirm, soft delete with 30-day recovery; purge removes DB rows + Storage objects + cancels subscription.

## Module B — Store & Branding (FR-STR)

**FR-STR-1 (P0) Hosted storefront.** Every org gets `{slug}.framely.in` serving products with ≥1 published template. SSR-cached; revalidated on publish/branding change.

**FR-STR-2 (P0) Branding.** Logo, primary color, accent color applied to storefront theme tokens; live preview before save. Contrast guard: if primary fails 3:1 against white, auto-adjust text tokens.

**FR-STR-3 (P2) Custom domain (Business).** Merchant adds `gifts.ravistore.com` → shown CNAME instructions → verification poll → TLS auto (Vercel). States: `pending / verified / failed(reason)`.

**FR-STR-4 (P0) Store visibility.** Toggle live/paused; paused shows branded holding page ("We'll be back"). Billing states can force-pause (J4).

**FR-STR-5 (P1) Occasion categories.** Enable/disable platform categories per store; custom categories (Growth+).

**FR-STR-6 (P0) Trial marks.** Trial orgs: storefront footer badge "Made with Framely" + all exports watermarked (FR-RND-3).

## Module C — Product Catalog (FR-PRD)

**FR-PRD-1 (P0) Platform presets.** Seed frame presets: 8×12", 12×18", A4, 12×12", 16×24" (portrait+landscape variants). One-click add to org.

**FR-PRD-2 (P0) Custom product.** Fields: name, width/height mm, bleed (default 3mm), safe margin (default 5mm), DPI (default 300; allowed 150–600), optional retail price (paise), orientation auto-derived.
AC: sides 50–1200 mm; guard `side_px = mm×dpi/25.4 ≤ 12,000` (render memory cap) → `422 ERR_VALIDATION` with explanation.

**FR-PRD-3 (P0) Storefront visibility rule.** Product appears only when it has ≥1 published template; empty products show "draft" badge in dashboard.

**FR-PRD-4 (P1) Archive.** Archiving a product requires archiving its published templates first (guided bulk action); archived products hidden from storefront, orders history intact.

## Module D — Template System (FR-TPL)

**FR-TPL-1 (P0) Library.** Two tabs: Platform (read-only, duplicable) and My Templates. Filters: product, occasion, photo count, status, premium. Search by name (trigram). Card shows thumbnail, name, slots count, status.

**FR-TPL-2 (P0) Duplicate.** Platform → org copy: deep-copies `doc`, keeps `asset://` refs to platform assets (allowed), status `draft`, name suffixed "(copy)".

**FR-TPL-3 (P0) Builder.** Full editor in builder mode (§ Module H covers shared editor; builder adds): layers panel (reorder/lock/hide), properties panel per layer type, photo-slot drawing tool, text-binding creator (creates `inputs.fields` entries), asset picker, font picker, canvas rulers + safe/bleed overlays, snap-to-guides & to other layers (5px threshold), multi-select align/distribute, zoom 10–400%.
AC: all layer mutations undoable; doc always validates against zod schema on save (invalid = blocked save with inline errors).

**FR-TPL-4 (P0) Draft autosave & versioning.** Autosave 5s debounce + manual save; **publish snapshots** `doc` into `template_versions` with incremented `version`.
AC: draft edits after publish don't affect live version until re-publish; version history list with restore-as-draft.

**FR-TPL-5 (P0) Publish gate.** Publishing runs validations; publish allowed only when errors = 0 (warnings allowed with confirm):

| Check | Severity |
|---|---|
| Doc validates against schema v1 (§6) | Error |
| ≥ 1 `photoSlot`; `inputs.photos.min == max == slotCount` (v1 rule) | Error |
| Every `asset://` resolves & org has access; every font in library | Error |
| Every `binds` references an existing field key; field keys unique | Error |
| Layers within canvas bounds (unless `bleed:true`) | Error |
| Slot or text inside safe margin | Warning |
| Photo slot smaller than 200px either side | Error |
| Effective slot DPI < 150 at product size | Warning |
| Server test-render succeeds & thumbnail generated | Error |
| Client↔server parity diff ≤ threshold (internal CI gate) | Error (internal) |

**FR-TPL-6 (P0) Unpublish/archive.** Existing projects keep working (they pin `templateRef.version`). Archived templates hidden everywhere except order history.

**FR-TPL-7 (P0) Plan limits.** Template create blocked over plan cap → `402 ERR_PLAN_LIMIT` with upgrade CTA.

**FR-TPL-8 (P1) Premium flag.** Badge on storefront card; reserved for future pricing logic.

**FR-TPL-9 (P1) Usage counter.** `usage_count++` when an order is placed with the template (feeds ranking FR-MAT-2).

**FR-TPL-10 (P1) Bulk actions.** Multi-select: publish, archive, assign categories.

## Module E — Assets & Fonts (FR-AST)

**FR-AST-1 (P0) Asset upload.** png/jpg/webp/svg, ≤ 20 MB; kinds: background, overlay, sticker, frame, shape, misc; auto-thumbnail (webp 400px); required provenance field: `owned / licensed / CC0-public` + note (IP risk log, Business Plan §10).

**FR-AST-2 (P0) SVG sanitization.** Strip scripts/event handlers/external refs on upload; reject if sanitization fails.

**FR-AST-3 (P1) Asset management.** Search/filter by kind+tags; "used in N templates" indicator; delete blocked while referenced (list referencing templates).

**FR-AST-4 (P0) Platform fonts.** Curated OFL set incl. Latin (Inter, Playfair Display, Poppins, Great Vibes…) and **Devanagari (Noto Sans/Serif Devanagari, Mukta, Hind)**. Identical files registered in browser (`@font-face`) and worker (Technical Plan §6).

**FR-AST-5 (P2) Org fonts (Growth+).** ttf/otf/woff2 upload with license confirmation checkbox (logged); weight/style metadata; preview renders Latin + Devanagari sample; worker syncs font on first use.

## Module F — Customer Upload Pipeline (FR-UPL)

**FR-UPL-1 (P0) Selection.** Multi-select up to 12 photos; jpg/png/webp/heic (HEIC converted client-side); each ≤ 25 MB pre-processing; camera capture on mobile.

**FR-UPL-2 (P0) Client processing (before upload).** EXIF-orientation fix → downscale longest side to 2048px → JPEG q85 → strip all EXIF incl. GPS. Upload 3 concurrent with per-file progress and per-file retry (3×).
AC: 3 typical photos on 4G upload in ≤ 15s; a failed file never blocks the others.

**FR-UPL-3 (P0) Face detection.** MediaPipe Face Detector in-browser after decode; boxes `[{x,y,w,h,score}]` (normalized) stored on the upload row; 2s/photo timeout → `faces: []` fallback.

**FR-UPL-4 (P0) Consent.** Unchecked-by-default checkbox linking to store privacy page; blocks upload until checked; consent flag stored with session; copy: "I have the right to use these photos and agree to processing for creating my product."

**FR-UPL-5 (P0) Quality flags.** Record dimensions; `low_res` flag if longest side < 800px (drives editor warnings FR-EDT-6).

**FR-UPL-6 (P0) Server side.** `POST /v1/uploads/sign` issues signed URL scoped to `uploads/{org}/{yyyymm}/`; row created transactionally; org storage quota checked → `413 ERR_STORAGE_FULL`.

**FR-UPL-7 (P1) Duplicate detection.** Content hash; duplicate shows subtle "already added" toast, still allowed.

**FR-UPL-8 (P0) Retention.** `expires_at = now()+90d`; on order placement reset to `order_date+60d` (org-configurable 30/60/180); nightly cleanup deletes Storage object + row (DPDP compliance, §10.4).

## Module G — Auto-Match & Preview Gallery (FR-MAT)

**FR-MAT-1 (P0) Matching.** `GET /v1/templates?product&photos=N[&category]` returns published templates of that product where `min_photos ≤ N ≤ max_photos` (v1: equality), limit 40. Uses generated-column index (Technical Plan §7); target ≤ 50ms DB time.

**FR-MAT-2 (P0) Ranking.** Order by (1) orientation-fit score: fraction of slots whose aspect class (portrait/landscape/square, thresholds 0.9/1.1) matches an uploaded photo's class, (2) `usage_count` desc, (3) newest.

**FR-MAT-3 (P0) Client preview farm.** For each result, offscreen render via shared `render-core` at 400px width; virtualized grid renders lazily with shimmer skeletons.
AC: 30 previews ≤ 2s p75 on Moto-G-class Android; scrolling stays ≥ 50fps; previews reuse pooled canvases.

**FR-MAT-4 (P0) Auto-assignment.** Deterministic heuristic: sort slots by area desc; sort photos by (max face score desc, resolution desc); assign with an orientation-match pass first, remainder by order. Same inputs → same output (testable).

**FR-MAT-5 (P0) Face-aware crop.** Cover-fit baseline; crop centered on union of face boxes + 20% padding, clamped to image; no faces → center. Encoded per §7 crop model so server reproduces exactly.

**FR-MAT-6 (P0) Zero matches.** Show templates for N±1 photos with note "uses 2 of your 3 photos" / "add 1 more photo", plus "change product" CTA. Never a dead end.

**FR-MAT-7 (P0) Too many photos.** If N > every template's max: selection sheet "choose up to K photos to continue" (K = global max for the product).

**FR-MAT-8 (P1) Gallery controls.** Occasion filter chips, premium toggle, header count "X designs for your Y photos", pull-to-refresh re-shuffles (FR-MAT-9).

**FR-MAT-9 (P1) Shuffle.** Re-runs assignment with rotated photo order for variety; deterministic per shuffle index.

## Module H — Editor (customer mode + builder mode share one core) (FR-EDT)

**FR-EDT-1 (P0) Load.** Opens pinned `templateRef {id, version}` + current assignments; locked layers are non-selectable and excluded from the layer list in customer mode.

**FR-EDT-2 (P0) Photo operations (customer).** Swap via photo tray (existing uploads + "add more" reopens upload flow); pan within slot; zoom 100–300% (pinch/slider); rotate 90° steps; reset crop.

**FR-EDT-3 (P0) Text operations (customer).** Edit bound fields via panel and inline tap; `maxLen` enforced with counter; `autoFit` shrinks to 60% of `sizePx` then ellipsizes with warning chip; `required` empty fields block ordering with inline error.

**FR-EDT-4 (P0) Undo/redo.** ≥ 50 steps command stack; Ctrl/Cmd+Z / Shift+Z on desktop; buttons on mobile.

**FR-EDT-5 (P0) Autosave.** Debounced 3s `PATCH /v1/projects/:id` + flush on blur/hide; states: Saving… / Saved / Offline (queued, retries with backoff); local queue survives tab refresh via in-memory + resume from server truth.

**FR-EDT-6 (P0) Warnings.** Safe-area/bleed overlay toggle; per-slot effective-DPI badge — `<150 DPI` warning ("may print blurry"), `<100 DPI` strong warning; merchant setting can escalate <100 to block.

**FR-EDT-7 (P0) Mobile-first.** Usable at 360px width; pinch-zoom/pan canvas; tap targets ≥ 44px; interaction latency < 50ms.

**FR-EDT-8 (P0) Preview step.** Full-screen client render at device resolution with product frame chrome + "final file is produced at print quality" note; Order CTA.

**FR-EDT-9 (P1) Resume & share.** `?t={share_token}` restores session; share button copies link / opens WhatsApp intent.

**FR-EDT-10 (P1, builder only) Builder extras.** See FR-TPL-3.

## Module I — Render & Export (FR-RND)

**FR-RND-1 (P0) Request.** `POST /v1/projects/:id/render` validates: required slots filled, required fields non-empty, org billing state allows (J4), quota/overage (FR-BIL-4/5) → enqueue pg-boss `render.print`; returns `202 {jobId}`. Idempotent for identical `(project, docHash, settings)` within 10 min (returns existing job).

**FR-RND-2 (P0) Output.** Formats PNG / JPG(q92) / PDF (image-embedded, MediaBox/TrimBox/BleedBox set); DPI from product; bleed included by default; crop marks toggle (PDF only). sRGB v1; CMYK/ICC = v2 (Business tier).

**FR-RND-3 (P0) Watermark.** Trial exports get diagonal tiled watermark, 40% opacity — applied in worker, impossible to bypass client-side.

**FR-RND-4 (P0) Status.** Poll `GET /v1/renders/:id` + Supabase Realtime channel; states `queued → processing → done | failed`; UI shows ETA text by queue depth.

**FR-RND-5 (P0) Failure policy.** 3 attempts, exponential backoff; final fail → `render_jobs.status='failed'` + merchant email/dashboard alert + platform admin alert; if triggered from checkout, customer sees "Your design is saved — file is being prepared" (never an error).

**FR-RND-6 (P0) Delivery & re-render.** Output via signed URL (7-day); re-downloads free; re-render with unchanged docHash+settings within 30 days returns cached output (no quota); changed doc = new job (counts quota).

**FR-RND-7 (P1) Priority.** Queue priority: Business 1 > Growth 2 > Starter 3 > Trial 4.

**FR-RND-8 (P0, internal) Parity gate.** Golden-image pixel-diff (client harness vs worker) per published template in CI; publish blocked on drift (Technical Plan §6).

**FR-RND-9 (P0) Performance.** p95 ≤ 20s, p99 ≤ 45s at ≤ 12,000px longest side.

## Module J — Orders (FR-ORD)

**FR-ORD-1 (P0) Capture.** Customer name + phone required; email optional (per-store toggle); Indian phone validation with country code selector.

**FR-ORD-2 (P0) Create.** Order creation auto-triggers print render (FR-RND-1) and links `render_job_id`; project status → `ordered`; template `usage_count++`.

**FR-ORD-3 (P0/P2) Payment.** v1.0: no in-platform payment — merchant marks Paid manually (order flag). v1.1 (flag, Growth+): Razorpay Payment Link per order via merchant's connected account; webhook marks paid.

**FR-ORD-4 (P0) Merchant order management.** List (filters: status, date range, product; search by phone/order id) + detail (design preview, customer info, download print file, status transitions `placed → printing → shipped → delivered`, cancel with reason). Status changes optionally notify customer (FR-NTF-2).

**FR-ORD-5 (P0) Confirmation.** Customer sees order ID + resume link; optional email confirmation.

**FR-ORD-6 (P1) Reorder.** "Order again" duplicates project (new share token) for repeat purchases.

**FR-ORD-7 (P2) API orders.** `POST /v1/orders` with `source` + `external_ref` for integrations.

## Module K — Billing, Plans & Quotas (FR-BIL)

**FR-BIL-1 (P0) Subscriptions.** Razorpay Subscriptions (UPI Autopay, cards); plan matrix §9; GST invoice fields (legal name, GSTIN optional); invoices listed + PDF.

**FR-BIL-2 (P0) Changes.** Upgrade immediate with proration; downgrade effective at period end (blocked if current usage exceeds target limits — guided cleanup); cancel at period end; post-cancel data retained 60 days.

**FR-BIL-3 (P0) Metering.** `usage_counters` increment on render **completion** (not enqueue); monthly reset job; dashboard meters; notifications at 80% and 100%.

**FR-BIL-4 (P0) Overage.** Paid plans: default ON at ₹3/export with monthly cap (default ₹2,000, editable incl. off); charged on next invoice. Trial: hard stop at 10.

**FR-BIL-5 (P0) Enforcement outcomes.** Quota exceeded & overage unavailable: merchant-initiated render → `402 ERR_QUOTA_EXCEEDED` with upgrade CTA; **customer-initiated (checkout)** → order saves, render deferred, merchant alerted — the customer never sees a billing failure.

**FR-BIL-6 (P0) Dunning.** Payment failure → `past_due` grace 7 days (banner; everything works) → `paused` (storefront holding page, renders blocked) until resolved; Razorpay retry schedule honored.

**FR-BIL-7 (P0) Webhook hygiene.** Signature verification; idempotency by event id; out-of-order tolerated (state machine, not last-write).

**FR-BIL-8 (P1) Storage quota.** Nightly rollup; at 100%: new uploads blocked (`413 ERR_STORAGE_FULL`), existing flows unaffected; cleanup suggestions (expired uploads, unused assets).

## Module L — Public API, Webhooks & Embed (FR-API) — v1.1, Growth+

**FR-API-1** Key lifecycle: create (name), reveal once, prefix shown thereafter, scopes `read|write`, revoke; last-used timestamp.
**FR-API-2** Endpoints per §8; standard error envelope; request IDs in every response.
**FR-API-3** Rate limits 60 rpm/key (burst 120) → `429` with `Retry-After`.
**FR-API-4** Webhooks: `render.completed`, `render.failed`, `order.created`, `order.status_changed`; HMAC-SHA256 `X-Framely-Signature`; 5 retries exponential ≤ 6h; delivery log with payload viewer + manual redeliver.
**FR-API-5** Embed: `<iframe src="/embed/{storeId}?product=…">` with postMessage events (`order.completed`, `resize`); npm SDK later.

## Module M — Notifications (FR-NTF)

**FR-NTF-1 (P0) Merchant email.** New order, render failed, quota 80/100%, trial day-3/day-12, payment failed, invite. All with deep links.
**FR-NTF-2 (P1) Customer email.** Order confirmation + status updates (per-store toggle, store-branded). SMS/WhatsApp = v2.
**FR-NTF-3 (P1) In-app.** Toasts + notification center (30-day history).

## Module N — Platform Admin (FR-ADM) (internal)

**FR-ADM-1 (P0)** Org directory: search, plan override, suspend/restore, login-as (fully audited).
**FR-ADM-2 (P0)** Platform library management: create/publish platform templates, assets, fonts, product presets, categories.
**FR-ADM-3 (P0)** Render monitor: failed-job queue grouped by error, retry, requeue, worker health.
**FR-ADM-4 (P1)** Metrics: signups, active orgs, MRR (from subscriptions), renders/day, failure rate, preview p75.

---

# 6. Template Document Specification (JSON schema v1) ❄

Canonical, versioned contract validated with zod in `packages/template-schema`. All geometry in **pixels at print resolution in trim space** (origin top-left of trim area). Bleed extends outward; only layers with `"bleed": true` may draw past trim edges.

## 6.1 Root
| Field | Type | Rules |
|---|---|---|
| `schema` | int | Must equal `1`. Renderers reject unknown versions. |
| `meta.name` | string | 2–80 chars |
| `meta.occasion` | string[] | category slugs |
| `canvas` | object | §6.2 |
| `inputs` | object | §6.3 |
| `layers` | array | 1–60 entries, z-order = array order (first = bottom) |

## 6.2 `canvas`
| Field | Type | Rules |
|---|---|---|
| `widthMm`, `heightMm` | number | Copied from product at creation; mismatch with product at publish = error |
| `dpi` | int | 150–600 |
| `bleedMm` | number | ≥ 0, from product |
| `widthPx`, `heightPx` | int | **Derived**: `round(mm × dpi / 25.4)` (trim size, excludes bleed). Stored for speed; recomputed & verified at publish |
| `background` | hex color | Fallback fill under all layers, extends into bleed |

## 6.3 `inputs`
```jsonc
"inputs": {
  "photos": { "min": 3, "max": 3 },   // v1 RULE: min == max == count(photoSlot layers)
  "fields": [
    { "key": "names", "label": "Couple names", "type": "text",
      "maxLen": 40, "required": true, "default": "" }
  ]
}
```
Field rules: `key` matches `^[a-z][a-z0-9_]{0,23}$`, unique; `type` = `"text"` only in v1; `maxLen` 1–80; `required` default `false`. Range photo counts (`min < max`) are **reserved for schema v2** — the columns/index already support it (Technical Plan §7).

## 6.4 Layer common fields
| Field | Type | Rules |
|---|---|---|
| `id` | string | `^[a-z0-9-]{1,32}$`, unique in doc |
| `type` | enum | `image` \| `photoSlot` \| `text` \| `shape` |
| `x`, `y` | number | Trim-space px; may be negative only when `bleed:true` |
| `rotation` | number | −180…180 deg, around layer center |
| `opacity` | number | 0–1, default 1 |
| `locked` | bool | Locked layers are invisible to customer-mode selection |
| `visible` | bool | default true |
| `bleed` | bool | default false; true → may extend past trim into bleed area |

## 6.5 Per-type fields
**`image`** — `src` (`asset://{uuid}` or platform-CDN https; nothing else), `role` (`background|overlay|sticker`), `w`,`h` (px), `fit` (`cover` for backgrounds). Backgrounds should set `bleed:true`.

**`photoSlot`** — `w`,`h` ≥ 200px each; `shape` (`rect|rounded|circle|heart`); `cornerRadius` (rounded only, ≤ min(w,h)/2); `fit`: `cover` (only v1); `focal`: `faces|center` (default `faces`); optional `border {width px ≤ 120, color hex}`. Slot id is what `photoAssignments` reference — **renaming a slot after publish is a breaking change** (blocked; create new layer instead).

**`text`** — exactly one of `binds` (a field key) or `text` (static); `font` (family in library), `weight` (100–900, available in family), `sizePx` (24–600), `color` hex, `align` (`left|center|right`), `w` (wrap width px), `maxLines` (1–6), `lineHeight` (0.8–2, default 1.2), `letterSpacing` (−5…50), `autoFit` bool (shrink-to-fit down to 60% of `sizePx`, then ellipsis).

**`shape`** — `kind` (`rect|ellipse|line`), `w`,`h`, `fill` hex/`"none"`, `stroke {width, color, dash?}`.

## 6.6 Doc-level validation (publish gate, mirrors FR-TPL-5)
Errors → `422 ERR_DOC_INVALID` with JSON-pointer paths: unknown fields (strict mode), duplicate ids, `binds` to missing key, orphan field (no layer binds it → warning), asset/font unresolved, geometry out of bounds without `bleed`, slot-count ≠ `inputs.photos` values.

---

# 7. Project Document Specification ❄

A project = a customer's personalization session. Server-authoritative; client patches it.

```jsonc
{
  "schema": 1,
  "templateRef": { "id": "uuid", "version": 3 },       // pinned forever
  "productId": "uuid",
  "photoAssignments": [
    { "slotId": "p1", "uploadId": "uuid",
      "crop": { "scale": 1.35, "offsetX": 0.10, "offsetY": -0.05 },  // §7.1
      "rotate90": 0 }                                   // 0|90|180|270
  ],
  "fieldValues": { "names": "Rohit ♥ Priya", "date": "25.08.2026" },
  "meta": { "clientVersion": "web-1.4.0" }
}
```

## 7.1 Crop model (deterministic client↔server)
Baseline = **cover-fit** of the (rotated) photo in the slot. `scale` ≥ 1 multiplies the baseline; `offsetX/offsetY` ∈ [−1, 1] pan the visible window within the leftover range (0 = centered, ±1 = edge). This is resolution-independent — worker reproduces the exact crop from the working copy or original. Face-aware auto-crop (FR-MAT-5) simply emits initial `scale/offset` values.

## 7.2 Rules
- `photoAssignments.slotId` must exist in the pinned template version; every **required** slot (all slots in v1) must be assigned before render.
- `fieldValues` keys ⊆ template field keys; `maxLen` enforced server-side too.
- PATCH is shallow-merge by top-level key; server re-validates whole doc; invalid patch → `422` with pointers, client rolls back.
- `docHash` = SHA-256 of canonicalized doc — used for render idempotency & caching (FR-RND-1/6).

---

# 8. API Specification ❄

Base: `https://api.framely.in/v1` (alias of app route handlers). JSON everywhere. Every response carries `X-Request-Id`.

**Auth modes**
| Mode | Header | Used by |
|---|---|---|
| Merchant JWT | `Authorization: Bearer <supabase_jwt>` | Dashboard/builder |
| API key | `Authorization: Bearer pk_live_…` | Server-to-server (Growth+) |
| Share token | `X-Share-Token: <token>` | Customer editor/session (scoped to one project + its uploads) |

**Error envelope (all non-2xx):**
```json
{ "error": { "code": "ERR_QUOTA_EXCEEDED", "message": "Monthly export limit reached.",
             "details": {"limit": 300, "used": 300}, "requestId": "req_9f2…" } }
```

## 8.1 Core endpoints

**`GET /v1/templates?product={id}&photos=3&category=wedding&limit=40`** — auth: public-store key or share token.
`200`:
```json
{ "items": [ { "id": "uuid", "name": "Golden Wedding Bliss", "version": 3,
    "slotCount": 3, "orientation": "portrait", "premium": false,
    "previewUrl": "https://cdn…/thumb.webp", "doc": { …template json… } } ],
  "matched": 12, "photoCount": 3 }
```
Docs are returned inline (previews render client-side); responses CDN-cached 60s per (store, product, photos, category).

**`POST /v1/uploads/sign`** — auth: share token (or key). Body: `{"filename":"a.jpg","bytes":812345,"contentType":"image/jpeg","consent":true,"width":2048,"height":1536,"faces":[…]}`
`200`: `{"uploadId":"uuid","url":"https://…signed-put…","expiresIn":600}` · Errors: `413 ERR_STORAGE_FULL`, `422 ERR_VALIDATION` (consent false, bad type).

**`POST /v1/projects`** — Body: `{"templateId":"uuid","productId":"uuid","uploadIds":["u1","u2","u3"],"autoAssign":true}`
`201`: full project incl. `shareToken`, `doc` with heuristic assignments (FR-MAT-4/5).

**`PATCH /v1/projects/{id}`** — share token. Shallow-merge patch of `doc` keys → `200` updated project, or `422 ERR_DOC_INVALID` with pointers.

**`POST /v1/projects/{id}/render`** — Body: `{"kind":"print","format":"pdf","cropMarks":false}`
`202`: `{"jobId":"uuid","status":"queued","position":4}` · Errors: `402 ERR_QUOTA_EXCEEDED`, `402 ERR_SUBSCRIPTION_PAST_DUE` (merchant-initiated only — see FR-BIL-5), `409 ERR_PROJECT_INCOMPLETE` (details list missing slots/fields).

**`GET /v1/renders/{jobId}`** → `200 {"status":"done","format":"pdf","url":"https://…signed…","expiresAt":"…"}` or `{"status":"failed","error":"ASSET_FETCH_FAILED"}`.

**`POST /v1/orders`** — Body: `{"projectId":"uuid","customer":{"name":"Priya","phone":"+91…","email":null}}`
`201`: `{"orderId":"uuid","status":"placed","renderJobId":"uuid"}`.

**Merchant/JWT:** template CRUD (`POST/PATCH /v1/templates`, `POST /v1/templates/{id}/publish`, `GET /v1/templates/{id}/versions`), assets, fonts, products, orders list/status, billing portal link, API keys, webhooks — standard REST, same envelope.

## 8.2 Outbound webhooks
`POST` to merchant URL, headers `X-Framely-Event`, `X-Framely-Signature: sha256=…` (HMAC of raw body).
```json
{ "id": "evt_01H…", "event": "render.completed", "createdAt": "2026-07-13T10:20:30Z",
  "data": { "jobId": "uuid", "projectId": "uuid", "orderId": "uuid",
            "format": "pdf", "downloadUrl": "https://…7d…" } }
```
Retries: 5 attempts (1m, 5m, 30m, 2h, 6h). Non-2xx or >10s timeout = failure.

## 8.3 Error code table ❄
| HTTP | Code | Meaning / typical fix |
|---|---|---|
| 400 | `ERR_BAD_REQUEST` | Malformed JSON/params |
| 401 | `ERR_UNAUTHENTICATED` | Missing/expired JWT |
| 401 | `ERR_INVALID_API_KEY` | Unknown/revoked key |
| 401 | `ERR_INVALID_SHARE_TOKEN` | Token wrong/expired project |
| 402 | `ERR_QUOTA_EXCEEDED` | Export limit; upgrade/overage |
| 402 | `ERR_PLAN_LIMIT` | Templates/brands/seats cap |
| 402 | `ERR_SUBSCRIPTION_PAST_DUE` | Fix payment |
| 402 | `ERR_PLAN_FEATURE` | Feature not in plan (API, fonts, domain) |
| 403 | `ERR_FORBIDDEN_ROLE` | Role lacks capability (§3) |
| 403 | `ERR_ORG_PAUSED` | Trial expired / dunning paused |
| 404 | `ERR_NOT_FOUND` | Wrong id or other org's resource |
| 409 | `ERR_SLUG_TAKEN` | Choose another slug |
| 409 | `ERR_PROJECT_INCOMPLETE` | Missing slots/required fields (details) |
| 409 | `ERR_TEMPLATE_LOCKED` | Editing published version directly |
| 413 | `ERR_FILE_TOO_LARGE` | > limits (FR-UPL-1 / FR-AST-1) |
| 413 | `ERR_STORAGE_FULL` | Storage quota (FR-BIL-8) |
| 415 | `ERR_UNSUPPORTED_MEDIA` | Bad mime |
| 422 | `ERR_VALIDATION` | Field-level errors in details |
| 422 | `ERR_DOC_INVALID` | Template/project doc fails schema (JSON pointers) |
| 429 | `ERR_RATE_LIMITED` | Retry-After honored |
| 500 | `ERR_INTERNAL` | Logged with requestId |
| 502 | `ERR_RENDER_FAILED` | Job failed after retries (job detail has cause) |
| 503 | `ERR_QUEUE_UNAVAILABLE` | Worker outage; job held |

---

# 9. Plans, Limits & Feature Matrix ❄

| | **Trial** (14d) | **Starter** ₹1,499/mo | **Growth** ₹3,999/mo | **Business** ₹9,999/mo | **Enterprise** |
|---|---|---|---|---|---|
| Brands/stores | 1 | 1 | 3 | 10 | Custom |
| Team seats | 1 | 1 | 3 | 10 | Custom |
| Templates | 20 | 100 | Unlimited | Unlimited | Unlimited |
| Print exports/mo | 10 (watermarked) | 300 | 1,500 | 5,000 | Custom |
| Overage | — (hard stop) | ₹3/export | ₹3/export | ₹2.5/export | Contract |
| Storage | 2 GB | 25 GB | 100 GB | 500 GB | Custom |
| Watermark / badge | Both | Badge only | None | None | None |
| Custom fonts | ❌ | ❌ | ✅ | ✅ | ✅ |
| API keys + webhooks + embed | ❌ | ❌ | ✅ | ✅ | ✅ |
| Payment links (v1.1) | ❌ | ❌ | ✅ | ✅ | ✅ |
| Custom domain / white-label | ❌ | ❌ | ❌ | ✅ | ✅ |
| Render queue priority | 4 | 3 | 2 | 1 | 1 |
| Support | Community | Email | Email 24h | Priority | Dedicated |

Annual = 2 months free. All limits live in `plans.limits` JSON — changing a number is data, not a deploy.

---

# 10. Non-Functional Requirements

## 10.1 Performance ❄ (targets are release criteria)
| Metric | Target |
|---|---|
| Preview grid (30 templates, post-upload) | ≤ 2s p75 on Moto-G-class Android / 4G |
| Editor interaction latency | < 50ms; canvas gestures ≥ 50fps |
| 3-photo upload on 4G (post client-resize) | ≤ 15s |
| Print render | p95 ≤ 20s, p99 ≤ 45s |
| API reads / writes | p95 ≤ 300ms / ≤ 500ms |
| Storefront LCP (4G) | ≤ 2.5s |

## 10.2 Reliability & capacity
99.5% monthly availability target (v1). Worker outage degrades gracefully: jobs queue, statuses honest, no data loss. v1 capacity assumptions: 100 orgs · 5,000 templates · 50,000 projects/mo · 20,000 renders/mo · 200 concurrent editor sessions — all comfortably inside the Technical Plan's Growth-stage infra.

## 10.3 Security
Per Technical Plan §10: RLS on every table, service-role only server-side, hashed API keys, signed URLs, HMAC webhooks, SVG sanitization, rate limits, audit log, GPS-EXIF stripping, OWASP-top-10 review before launch.

## 10.4 Privacy & compliance (DPDP Act 2023)
Explicit upload consent (FR-UPL-4) · retention defaults + auto-deletion (FR-UPL-8) · customer data deletion on request ≤ 72h (admin tool) · customer photos never used for training/marketing · privacy policy + processor terms pages per store · payment data never touches our servers (Razorpay hosted).

## 10.5 Compatibility
Browsers: last 2 versions of Chrome/Edge/Safari/Firefox; Android 10+/iOS 15+; min viewport 360px. Editor requires Canvas2D + WebAssembly (MediaPipe); unsupported browsers get a friendly block screen with copy-link.

## 10.6 Localization & scripts
UI English (strings externalized, i18n-ready). **Design text must render Latin + Devanagari correctly and identically client/server** — parity spike is build-week-1 (Technical Plan §6). Numerals/dates entered free-text by customers (no locale formatting logic v1).

## 10.7 Accessibility
Dashboard/storefront: WCAG 2.1 AA (contrast, focus order, labels, keyboard). Canvas editor: best-effort — all non-canvas controls keyboard-accessible; text edits possible without touching canvas.

---

# 11. Analytics & Instrumentation Events 🌱

One event schema: `{event, ts, orgId?, storeId?, sessionId, projectId?, props}`. PII-free (no phone/email/photo data).

| Event | Fired when | Key props |
|---|---|---|
| `store_viewed` | Storefront load | productCount |
| `product_selected` | Product page CTA | productId |
| `upload_started` / `upload_completed` | Batch | count, totalBytes, durationMs, failures |
| `faces_detected` | Per batch | photosWithFaces |
| `previews_rendered` | Grid ready | matched, renderMs, device |
| `zero_match_shown` | FR-MAT-6 | photoCount |
| `template_selected` | Card tap | templateId, rank |
| `editor_opened` / `photo_swapped` / `crop_adjusted` / `text_edited` | Editor | layerId/fieldKey |
| `dpi_warning_shown` | FR-EDT-6 | slotId, effectiveDpi |
| `order_placed` | FR-ORD-2 | orderId, templateId |
| `render_requested/completed/failed` | FR-RND | jobId, ms, attempts, error? |
| `merchant_signup` / `store_published` / `template_published` | Lifecycle | msSinceSignup |
| `quota_80` / `quota_100` / `overage_charged` | Billing | metric, plan |
| `upgrade_clicked` / `plan_changed` | Billing | fromPlan, toPlan |

Funnels built from these: **Magic funnel** (upload_completed → previews_rendered → template_selected → order_placed) and **Activation funnel** (merchant_signup → store_published → first order).

---

# 12. Edge-Case & Failure Catalog 🌱

| # | Area | Case | Required behavior |
|---|---|---|---|
| E1 | Match | 0 templates match count | FR-MAT-6 nearest-count fallback; never empty screen |
| E2 | Match | More photos than any template supports | FR-MAT-7 selection sheet |
| E3 | Upload | HEIC on old browser | Convert client-side; if unsupported → clear per-file error, others proceed |
| E4 | Upload | No faces found | Center-crop fallback; no error surfaced |
| E5 | Upload | Photo < 800px | `low_res` flag → DPI badge in editor |
| E6 | Upload | Mid-batch network loss | Per-file retry; batch partial-success state |
| E7 | Editor | Offline while editing | Autosave queues; banner "Offline — changes will sync"; sync on reconnect |
| E8 | Editor | Required field left empty | Order blocked with inline error + scroll-to |
| E9 | Editor | Emoji / mixed-script text (e.g. "Rohit ♥ प्रिया") | Renders identically client/server (parity tests include these strings) |
| E10 | Template | Merchant edits template after customer started | Project pinned to version — customer unaffected; new sessions get new version |
| E11 | Template | Delete template with pending orders | Hard delete blocked; archive only |
| E12 | Template | Two designers edit same draft | Last-write-wins + "newer version exists" warning on save (optimistic lock via updated_at); real locking = v2 |
| E13 | Render | Asset missing at render time | Retry → fail path FR-RND-5; error names the asset |
| E14 | Render | Worker down | Jobs queue; status honest; admin alert at depth > 50 or oldest > 10 min |
| E15 | Render | Duplicate render taps | Idempotency window returns same job (FR-RND-1) |
| E16 | Billing | Quota hit during customer checkout | Order saves, render deferred, merchant alerted (FR-BIL-5) — customer sees success |
| E17 | Billing | Razorpay webhook replay/out-of-order | Idempotent by event id; state machine transitions only forward |
| E18 | Billing | Downgrade below current usage | Blocked with guided cleanup list |
| E19 | Store | Slug/custom-domain conflict | `409 ERR_SLUG_TAKEN`; domain re-verification flow |
| E20 | Store | Trial expiry with live traffic | Holding page + resume-on-subscribe; projects/orders preserved |
| E21 | Privacy | Customer requests deletion | Admin tool erases uploads/projects/customer row ≤ 72h; order row anonymized (audit kept) |
| E22 | Privacy | Upload expiry while project draft | Editor shows "photo expired — re-upload" placeholder per slot |
| E23 | Storage | Org at 100% storage | Uploads blocked with cleanup CTA; renders unaffected |
| E24 | Abuse | Illegal/abusive imagery reported | Report → platform admin review → org suspend tooling (FR-ADM-1); ToS covers removal |
| E25 | Data | Share link leaked | Token grants one project only; regenerate-token action invalidates old link |

---

# 13. Out of Scope for v1 (deliberate — triggers noted)
In-platform customer payments (→ v1.1 flag) · Shopify/WooCommerce apps (→ after 25 merchants) · template marketplace & revenue share (→ after 100 orgs) · AI beyond client face detection — bg removal, upscaling, smart suggestions (→ Phase 3 credits) · CMYK/ICC exports (→ first pro-printer demand) · multi-page products: albums, true calendars (→ schema v2) · video/AR/3D layers · native apps · UI localization (Hindi UI) · POS/WhatsApp ordering bots · SSO/SAML · self-hosted AI or GPU infra.

---

# 14. Open Questions & Decisions Log 🌱
| # | Question | Options | Decide by | Current lean |
|---|---|---|---|---|
| Q1 | Product name + domain | Framely / PicMold / other | Before storefront build (wk 4) | — |
| Q2 | v1.0 payments really out? | Manual-paid vs Razorpay links at launch | End of wk 2 (affects checkout UI) | Out; links in v1.1 |
| Q3 | Customer email optional or hidden by default? | Optional field vs merchant toggle | Wk 5 | Merchant toggle, default shown-optional |
| Q4 | Preview grid limit 40 enough? | 40 vs paginate | After dogfood data | 40 |
| Q5 | Trial length | 14d vs 7d + extend-on-activation | Pricing test M4 | 14d |
| Q6 | Own-brand store: same tenant or special org? | Normal org (dogfood) vs internal flags | Wk 1 | Normal org — pure dogfood |
| Q7 | Heart-shape slot in v1? | rect/rounded/circle only vs +heart | Wk 3 (render-core scope) | Include (samples use it) |

Decisions get moved to a dated log at the bottom of this section as they're made.

---

# 15. Release Criteria — v1.0 Launch Gate ❄
- [ ] All P0 FRs implemented; P1s triaged with dates.
- [ ] ❄ contracts (§3, §6–§9) frozen ≥ 2 weeks with no breaking change.
- [ ] Golden parity suite green for all launch templates, incl. Devanagari + emoji strings (E9).
- [ ] 40+ original templates published (zero Canva-derived assets; provenance log complete).
- [ ] Performance targets §10.1 measured on real mid-range Android, not simulator.
- [ ] Load smoke: 50 concurrent editor sessions + 200 queued renders without failure.
- [ ] DPDP checklist: consent, retention job verified deleting, deletion tool tested, privacy pages live.
- [ ] Billing E2E on Razorpay live mode: subscribe, upgrade, overage invoice, dunning, cancel.
- [ ] Failure drills: worker killed mid-job (E14), webhook replay (E17), quota-at-checkout (E16).
- [ ] Own-brand store live with ≥ 10 real end-to-end orders (dogfood).
- [ ] Runbook: render-failure triage, restore-from-backup, org-suspend.

---

# 16. Traceability Matrix (module → contracts)
| Module | Key DB tables (Tech Plan §7) | Key endpoints (§8) | Primary journeys |
|---|---|---|---|
| A Org/Team | orgs, org_members | /orgs, /members | J2 |
| B Store | orgs.branding | /store settings | J2 |
| C Catalog | product_types, products | /products | J2, J3 |
| D Templates | templates, template_versions, template_categories | /templates, /publish | J3 |
| E Assets/Fonts | assets, fonts | /assets, /fonts | J3 |
| F Uploads | uploads, customers | /uploads/sign | J1 |
| G Match/Preview | templates (generated cols) | GET /templates | J1 |
| H Editor | projects | PATCH /projects | J1, J3 |
| I Render | render_jobs | /render, /renders | J1, J5 |
| J Orders | orders | /orders | J1 |
| K Billing | plans, subscriptions, usage_counters | billing webhooks | J4 |
| L API | api_keys, webhooks, webhook_deliveries | all keyed routes | — |
| M Notify | (email service) | — | J1, J4, J5 |
| N Admin | audit_logs + all | internal | J5 |

---

# 17. Glossary
**Template** — versioned JSON design with photo slots + bound text fields. **Project** — a customer session: pinned template version + assignments + values. **Slot** — a photoSlot layer a customer photo fills. **Binding** — link between a text layer and an input field. **Trim / Bleed / Safe area** — final cut size / extra print margin outside trim / keep-important-content-inside margin. **Working copy** — 2048px processed upload used everywhere except final render. **docHash** — canonical SHA-256 of a project doc (idempotency + cache key). **Magic moment** — upload → all-templates preview grid. **Export** — a completed print render (the billable unit). **Parity** — pixel-equivalence of client preview and worker output via shared render-core.

---
# Appendix A — Screen Inventory 🌱

**Three-state rule:** every screen ships with explicit **loading** (skeleton, never spinners-only), **empty** (what to do next), and **error** (what happened + retry path) states. States listed below are the non-obvious ones.

## A.1 Customer storefront (mobile-first, no login)

| ID | Screen | Key elements | Notable states & behaviors |
|---|---|---|---|
| S-C1 | Store home `{slug}.framely.in` | Brand header (logo/colors), product grid (photo, name, size, from-price), occasion quick links, footer (privacy, "Made with Framely" on trial) | Store paused → branded holding page (FR-STR-4); no published products never occurs publicly (FR-PRD-3) |
| S-C2 | Product page | Size/spec, price, occasion chips, sample-design carousel, **"Personalize now"** CTA | Skeleton on load; deep-linkable `?category=wedding` |
| S-C3 | Upload | Photo picker + camera, thumbnail row with per-file progress/retry/remove, consent checkbox + privacy link, Continue (enabled: ≥1 uploaded ∧ consent) | Partial batch failure (E6); HEIC fallback (E3); `413 ERR_STORAGE_FULL` merchant-side message; offline banner |
| S-C4 | Auto-preview gallery | Header "X designs for your Y photos", occasion filter chips, virtualized grid of **live previews**, shuffle, "add/remove photos" | Shimmer while rendering (FR-MAT-3); zero-match fallback (E1); too-many-photos selection sheet (E2) |
| S-C5 | Editor (customer mode) | Canvas (pinch-zoom/pan), photo tray (swap/add more), text field panel, crop controls (zoom slider, rotate 90°, reset), undo/redo, warnings drawer, save indicator, **Preview** CTA | Offline queue banner (E7); expired-photo placeholder (E22); DPI badges (FR-EDT-6); required-field errors (E8) |
| S-C6 | Preview & confirm | Full-fidelity render, product summary + price, safe-area note, Back to edit, **Order** CTA | Render is client-side (instant); note that final file is print quality |
| S-C7 | Order details | Name*, phone* (+country code), email (per-store toggle), Place order | Inline validation; double-tap guarded (idempotent) |
| S-C8 | Confirmation | Order ID, resume/share link (copy + WhatsApp intent), "what happens next", v1.1: payment link if enabled | Render runs in background — never blocks this screen (FR-BIL-5, FR-RND-5) |
| S-C9 | Resume (`?t={token}`) | Restores gallery/editor exactly where left | Invalid/regenerated token → friendly start-over (E25) |
| S-C10 | Legal | Store privacy policy, terms, data-deletion contact | Linked from consent + footer (§10.4) |

## A.2 Merchant dashboard (responsive, desktop-optimized)

| ID | Screen | Key elements | Notable states & behaviors |
|---|---|---|---|
| S-M1 | Auth | Login, signup (email/Google), verify email, reset password | Resend cooldown 60s (FR-ORG-1) |
| S-M2 | Onboarding wizard | 5 steps: shop name → slug (live check) → logo → product presets → pick 10 platform templates → **Store live** | Resumable mid-wizard (FR-ORG-2); ends on S-M3 with checklist |
| S-M3 | Dashboard home | KPI cards (orders today/7d, exports meter, storage meter), activation checklist, recent orders, alert strip (render failures, quota, dunning) | Trial banner with days left; empty state = checklist front-and-center |
| S-M4 | Orders | List: filters (status/date/product), search (phone/order ID); Detail: design preview, customer info, **Download print file**, status stepper, mark-paid (v1.0), cancel w/ reason | "File pending" badge on deferred/failed renders with Retry (J5, E16); status change → optional customer email |
| S-M5 | Template library | Tabs: Platform / My templates; filters (product, occasion, photos, status); cards (thumb, name, slots, status); bulk bar (publish/archive/categorize) | Plan-limit lock state with upgrade CTA (FR-TPL-7) |
| S-M6 | Template builder | Canvas + rulers + safe/bleed overlays, layers panel (reorder/lock/hide), properties panel per layer type, slot-drawing tool, field-binding creator, asset & font pickers, align/distribute, zoom, version history drawer, **Publish** | Publish modal shows validation results table (errors block, warnings confirm) per FR-TPL-5; concurrent-edit warning (E12); preview-as-customer toggle |
| S-M7 | Assets | Grid w/ kind/tag filters, upload with provenance form (owned/licensed/CC0 + note), usage indicator | Delete blocked while referenced → lists templates (FR-AST-3); SVG rejected if unsanitizable |
| S-M8 | Fonts | Platform fonts w/ Latin+Devanagari previews; upload (Growth+) with license confirmation | Plan-gated state (`ERR_PLAN_FEATURE`) |
| S-M9 | Products | List w/ template counts; create from preset or custom form (mm, bleed, safe, DPI) | Pixel-guard validation message (FR-PRD-2); archive flow guides template archiving first (FR-PRD-4) |
| S-M10 | Store settings | Branding w/ live storefront preview, slug (read-only), visibility toggle, categories on/off, custom domain (Business) with CNAME instructions + status | Domain states pending/verified/failed(reason) (FR-STR-3); contrast auto-guard note (FR-STR-2) |
| S-M11 | Team (Growth+) | Members w/ roles, invite by email, pending invites (expiry countdown), transfer ownership | Seat-limit state; role changes take effect ≤ 60s (FR-ORG-4/5) |
| S-M12 | Billing | Current plan card, usage meters (exports/storage/seats), plan matrix w/ upgrade/downgrade, overage toggle + cap input, invoices (PDF), payment method (Razorpay), GST fields | Dunning banner in `past_due`; downgrade-blocked cleanup list (E18) |
| S-M13 | API & webhooks (Growth+) | Keys table (prefix, last used, revoke), create modal (reveal once), webhook endpoints config, event picker, delivery log w/ payload viewer + redeliver, signing-secret display | Failed-delivery badge counts; docs link |
| S-M14 | Account | Profile, password, notification preferences, org switcher, danger zone (delete org — Owner, type-to-confirm) | FR-ORG-6/7 |

## A.3 Platform admin (internal)

| ID | Screen | Key elements |
|---|---|---|
| S-A1 | Org directory | Search, plan/status, plan override, suspend/restore, login-as (audited banner while active) |
| S-A2 | Platform library | Manage platform templates/assets/fonts/product presets/categories; publish to library |
| S-A3 | Render monitor | Failed jobs grouped by error, retry/requeue, queue depth + oldest-job age, worker health |
| S-A4 | Metrics | Signups, active orgs, MRR, renders/day, failure rate, preview p75, magic-funnel conversion |
| S-A5 | Audit log | Filterable by org/user/action; powers login-as and deletion-request accountability (E21) |

---
*End of PRD v1.0 draft. Change control: edits to ❄ sections require a version bump + entry in §14's decision log.*
