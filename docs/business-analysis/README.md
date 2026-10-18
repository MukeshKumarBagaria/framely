# Framely Business Analysis (`/business-analysis`)

A private finance module inside Framely: Meesho order and settlement imports, product costing, inventory, expenses, Meta Ads, reconciliation, cash flow, and a profit dashboard with PDF/XLSX/CSV exports.

It is **not** a separate app. It uses Framely's Next.js project, Tailwind styling and Supabase, and does not touch the template studio (`/`, `/templates`).

## Setup checklist (manual Supabase steps)

1. **Run the migration.** Supabase Dashboard → SQL Editor → New query → paste `supabase/migrations/20261016000000_business_analysis.sql` → Run. It is one transaction (all or nothing) and refuses to run twice. It creates the `business_analysis` schema, 25 tables, RLS policies, transactional RPCs, and the private `business-analysis` storage bucket with its policies.
2. **Expose the schema.** Project Settings → Data API → *Exposed schemas* → add `business_analysis` → Save.
3. **Create your login.** Authentication → Users → *Add user* (email + password, tick *Auto confirm*). Turn off public sign-ups (Authentication → Providers → Email → disable "Allow new users to sign up") so nobody else can create accounts.
4. **Set environment variables** (copy from `.env.example` into `.env.local`, and into your host's settings):
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY` (or the existing `NEXT_PUBLIC_` equivalents).
   - `BUSINESS_ANALYSIS_ALLOWED_EMAILS` — the email(s) from step 3.
   - Optional: `BUSINESS_ANALYSIS_MAX_UPLOAD_MB`, `BUSINESS_ANALYSIS_TIMEZONE`, `BUSINESS_ANALYSIS_STORAGE_BUCKET`, `BUSINESS_ANALYSIS_STORE_DOCUMENTS`.
5. **Sign in** at `/business-analysis/login`. On first sign-in you are asked to name your business; you become its **owner**.
6. Add people later under Settings → *Who can sign in* (they also need a Supabase user and an entry in the allowlist).

The service-role key is **not** used and must not be added. Do not expose any of these as `NEXT_PUBLIC_` unless it already was.

Nothing else is required: Meta/Meesho API credentials are not used. Everything comes from uploaded reports or manual entry.

## Security model

Access needs all of: a valid Supabase session → email on the server allowlist → an active `business_members` row. The same membership check is repeated inside Postgres by every RLS policy and RPC, so a bug in the app cannot expose data.

- Pages and every API route authenticate on the server (`apiRoute()` in `server/http.ts`); `src/proxy.ts` only refreshes the session cookie and redirects early.
- State-changing requests need the `x-business-analysis: 1` header and a same-origin `Origin` (CSRF). Session cookies are `httpOnly`, `sameSite=lax`, `secure` in production.
- Login is rate-limited per IP and per account, gives one generic failure message, and has a minimum response time.
- Roles: **viewer** reads; **accountant** enters data and imports; **admin** also changes settings, rolls back imports and downloads original files; **owner** also manages members.
- Ledgers (orders, settlements, expenses, cash, inventory movements, audit log) cannot be written directly by clients; they change only through `SECURITY DEFINER` RPCs that pin `search_path`, check the role and scope every statement to the business.
- Uploaded reports and receipts live in a **private** bucket under `<business_id>/…`; access is by 60-second signed URLs only, restricted to accountants/admins.
- Responses carry `no-store`, `X-Frame-Options: DENY`, `noindex`. Errors never include stack traces or SQL.

## How the numbers are defined

All formulas live in `src/business-analysis/domain/financial-calculations.ts` (money uses `decimal.js` in the app and `NUMERIC` in Postgres). The dashboard, orders, reports and exports all call the same functions.

| Metric | Definition |
|---|---|
| Gross order value | Listed price × quantity (incl. GST) on non-cancelled lines |
| Recognised revenue | Net-sold lines (default: delivered), **excluding** GST when GST registration is set |
| Net sales | Recognised revenue − sales returns (excl. GST) |
| COGS | Recipe cost snapshot of units sold (materials, packaging, other); actual cost overrides the estimate |
| Gross profit | Net sales − COGS |
| Contribution | Net sales − COGS − platform fees, shipping, return costs, penalties (+ claims) |
| Operating profit | Contribution − advertising − operating expenses |
| Net profit | Operating profit + other income − finance costs − income tax. Labelled **estimated, before unrecorded adjustments** when no income tax is recorded |
| Cash flow | Recorded cash in − cash out, dated by payment/settlement date |
| Outstanding receivable | Expected settlement on delivered/expected lines − what settlements show, excluding cancelled and nothing-due lines |
| Profit margin | Profit ÷ net sales × 100 (basis stated in each tooltip) |
| ROAS / CPM / CPC / CTR / cost per purchase | As specified; `null` ("n/a") when the denominator is zero. ROAS is **Meta-attributed**, never Meesho revenue |

Rules that prevent double counting:

- A cost the marketplace already deducted from a settlement is flagged `reflected_in_settlement` and never also becomes cash or a second expense. The expense form requires you to answer this.
- Advertising cost comes from **one** source (campaign data by default; configurable). Per-order ad allocation is an estimate for analysis and is never added to total expenses again.
- Inventory purchases are cash out, not expenses; cost enters profit when goods are sold (COGS). Capital expenditure, owner draws and loans are excluded from profit.
- TCS/TDS withheld is tracked separately, not treated as a cost.
- Sales, profit and cash are three separate figures; a delivered order is never assumed to be paid.

**Inventory consumption** happens once: when production is recorded (`record_production`), which consumes each recipe material plus wastage. Dispatching or selling an order does not consume stock again. Optionally (default) the dashboard shows an *estimated* stock that also deducts recipe usage for shipped orders, always labelled as an estimate. Weighted-average costing.

**Historical costing:** each order line stores the cost in force on its order date. Changing a material price or recipe never rewrites past profit; use *Re-cost orders* to re-snapshot deliberately (recorded actual costs are never touched).

**Settings** are versioned by effective date; each report uses the version in force at the end of its period and lists the assumptions used.

## Importing reports

Upload on **Reports & imports**: CSV, XLSX, PDF (text PDFs only; scanned/image PDFs are detected and refused, no OCR). Flow: upload → detect type → parse → validate → **preview** → adjust mapping → confirm → batched commit (each batch one transaction; resumable) → summary. Nothing reaches the ledgers before you confirm.

- Parsers: Meesho orders, settlements, returns/RTO, platform fee reports, Meta Ads — each with its own column aliases (extend them in the mapping screen; admins can save them as defaults).
- Meesho order CSV: `Sub Order No` is the order-line key; raw status, source row number and file are preserved; `Supplier Listed/Discounted Price` are stored as sale prices **not** as bank payouts. Settlement amounts come only from settlement reports.
- Duplicates: keyed by platform + report type + external id + row fingerprint + file checksum. Importing the same file twice changes nothing; a changed row updates the record (status history kept); a status never regresses silently.
- Rollback (admin): reverses only what that import added or changed; later edits are left in place and reported.
- Error report: CSV/XLSX/PDF from the import page.

## Tests

`npm test` (Vitest) — 184 tests: money/date/period rules (FY boundaries, ranges), financial calculations (returns, RTO, cancelled, partial/duplicate settlements, double-counting), ad-metric zero denominators, importers (headers, invalid amounts/dates, duplicates, XLSX, PDF failure cases), and the **real migration run in PGlite** covering RLS/tenant isolation, import idempotency and rollback, historical costing, reconciliation, expenses/cash, inventory and purchasing.

```bash
npm run typecheck && npm run lint && npm test && npm run build
```

## Known limitations

- **Not accounting software.** Figures are management estimates, not audited statements or tax filings. GST, TDS/TCS and income tax are recorded for visibility only.
- PDF import reads text-based PDFs; layouts vary, so every PDF requires explicit review. No OCR.
- Meta data is manual entry or CSV; there is no Marketing API connection yet (the adapter shape allows adding one).
- Meesho report column names change; if a file is not recognised, pick the report type and map columns by hand.
- The first sign-in creates one business per user (the schema supports several, the UI uses the first).
- Large exports (very many thousands of rows) run inside a 60 s request; narrow the date range if one times out.
- Charts and the layout were verified by type-check, lint, build and tests; they have not been exercised against a live Supabase project in this repository — do a first-run check with a small real report.
