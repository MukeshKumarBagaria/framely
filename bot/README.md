# Gift Mahal — WhatsApp Order Bot

Implementation of `docs/WhatsApp-Automation-Guide.md`: the webhook, the state
machine, the media pipeline, the order-id ladder and the print-dashboard API for
the Gift Mahal WhatsApp flow.

Node 26 · TypeScript (no build step — Node runs `.ts` directly) · Fastify 5 ·
Postgres 16 · raw SQL.

---

## Quick start

```bash
cp ../.env.example ../.env          # fill in the Meta credentials (§3.4)
npm install
npm run migrate                     # applies migrations/*.sql
npm run seed                        # designs catalog from ../src/data/templates
npm run dev                         # http://localhost:3000
```

Or the whole stack:

```bash
docker compose up -d db
docker compose run --rm bot npm run migrate
docker compose run --rm bot npm run seed
docker compose up -d
```

Point Meta's webhook at `https://api.giftmahal.in/whatsapp/webhook` with your
`WA_VERIFY_TOKEN`, and subscribe to the **messages** field.

## Scripts

| Command | What it does |
|---|---|
| `npm start` | Migrate, then run webhook + worker + cron + dashboard API |
| `npm run dev` | Same, with `--watch` and pretty logs |
| `npm run migrate` | Apply pending migrations (also runs automatically at boot) |
| `npm run seed` | Upsert `designs` from the renderer's template folders |
| `npm run typecheck` | `tsc --noEmit` — the only thing tsc is used for |
| `npm test` | Unit tests; DB-backed suite runs only with `TEST_DATABASE_URL` |

```bash
# the full suite, including idempotency against a real Postgres
createdb giftmahal_test
TEST_DATABASE_URL=postgres://localhost:5432/giftmahal_test npm test
```

## Layout

```
migrations/       001 = the frozen §6 schema, verbatim · 002 = runtime columns
src/
  config.ts       env contract (§3.4), validated at boot
  whatsapp/       the entire Cloud API surface — client, limits, signature
  webhook/        routes (ACK-first), durable queue, dispatcher (dedupe)
  flow/           the state machine
    machine.ts      §10.5 routing + global interrupts
    steps/          menus · photos · fields · render · approval · order
  media/          download → raw/ → dedupe · storage layout + meta.json
  render/         §12 renderer contract
  ocr/            §14 Meesho order-id extraction
  chatwoot/       §17 human handoff
  admin/          §18 print dashboard API
  jobs/           §22.5 cron: ack sweep, nudges, abandon, retention, reconcile
  i18n/           7 language files + t()
```

## The three rules that keep it correct

1. **ACK first.** `POST /whatsapp/webhook` verifies the signature, writes one
   row, returns 200. Nothing else. A slow handler makes Meta re-send, and
   re-sends are how you get duplicate photos and duplicate replies.
2. **Dedupe on `wa_message_id` before any side effect.** The unique partial
   index on `messages` and the unique constraint on `media` do the work; an
   insert that returns no row means "already handled, stop".
3. **State lives in Postgres.** Restarting mid-flow loses nothing (§19 E20).

## Dashboard API

All routes need `Authorization: Bearer $ADMIN_API_TOKEN`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/admin/orders?status=placed` | Print queue, oldest first (default view) |
| GET | `/admin/orders/:id` | Order + session + media |
| PATCH | `/admin/orders/:id` | Change status; `dispatched` fires `dispatch_notice` |
| GET | `/admin/orders/:id/print` | Download the print PDF |
| POST | `/admin/print-bundle` | ZIP of many print PDFs, `{orderid}_{name}.pdf` |
| GET | `/admin/sessions/:id/preview` | Preview PNG |
| POST | `/admin/sessions/:id/rerender` | Re-render |
| POST | `/admin/sessions/:id/message` | Message the customer |
| POST | `/admin/sessions/:id/resume` | §17.3 `bot-resume` — hand back from HUMAN |
| DELETE | `/admin/sessions/:id/photos` | DPDP deletion request (§19 E22) |
| GET/PUT | `/admin/designs[/:id]` | Add template #5 without a deploy |
| GET | `/admin/stats` | §22.1 daily checks in one call |

`GET /health` and `GET /ready` are unauthenticated, for Caddy and Docker.

## Before you go live

- [ ] `WA_TOKEN` is a **System User** token, not the 24-hour temp one (§19 E16)
- [ ] `ADMIN_API_TOKEN` and `WA_VERIFY_TOKEN` are 32+ random characters
- [ ] Sample images uploaded to `DESIGN_ASSET_BASE_URL/designs/<slug>.jpg` —
      public HTTPS, ≤5 MB, JPEG/PNG (§9.4). The design menu needs them
- [ ] The five templates in §15 submitted for approval (they gate every nudge
      and the dispatch notice)
- [ ] `MEESHO_STORE_LINK` points at your real listing
- [ ] The renderer implements `POST /render` per §12 and shares `/data/customers`

## Notes on deliberate deviations from the guide

- **Debounced ack is durable.** The guide's `ackTimers` Map dies on restart; we
  store `ack_due_at` on the session and sweep it every second, which is the
  upgrade the guide itself suggests in §11.1.
- **Signature check handles a wrong-length header.** The snippet in §10.2 passes
  the raw header to `timingSafeEqual`, which throws when lengths differ — the
  exact attacker-controlled case. See `whatsapp/signature.ts`.
- **`designs.renderer_template_id`** (migration 002) exists because one template
  can serve two occasions (PF-000002 is birthday *and* friendship) and §6 makes
  `designs.id` a primary key.
- **Languages.** All seven string files ship, but `ENABLED_LANGS` defaults to
  `hi,en` per §16.1. **mr/gu/te/ta/kn were drafted by machine translation — have
  a native speaker read them before you set `ENABLED_LANGS=all`.** The row-limit
  test in `test/limits.test.ts` already checks they fit WhatsApp's 24/20-char
  caps in every script.
