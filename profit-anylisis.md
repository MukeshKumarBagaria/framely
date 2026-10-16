# Build Framely Business Analysis — Complete Business ERP & Profit Analytics Module

## 1. Project context

I am building a business management and financial analytics module inside my existing Framely software.

Framely is used to manage and sell customized photo frames, primarily through Meesho, with Meta Ads used for customer acquisition.

The new module must live at:

`/business-analysis`

This is not a separate application. Integrate it into the existing Framely project and reuse the existing architecture, design system, authentication conventions, utilities, and coding standards wherever appropriate.

Before writing code, inspect the existing project structure, package.json, routing system, Supabase setup, environment variables, UI components, and backend conventions.

Do not replace existing application architecture unnecessarily. Do not introduce another frontend application or a separate database.

## 2. Primary objective

Build a complete, secure, visual-first business ERP that answers the following questions accurately:

- How much revenue did my business generate?
- How much money did Meesho actually pay or settle?
- How much did I spend on manufacturing and raw materials?
- How much did packaging cost?
- How much did Meta advertising cost?
- How much did shipping, returns, RTO, and cancellations cost?
- What is my gross profit, operating profit, and net profit?
- How much money is still receivable from Meesho?
- How much cash entered or left my business?
- Which products and SKUs are profitable?
- How much am I earning daily, weekly, monthly, quarterly, and yearly?
- What are my total expenses, profit margin, ROAS, and cost per order?
- How much inventory do I have, and when should I reorder materials?
- How are my current results performing compared with the previous period?

The system must distinguish between sales, accounting profit, and actual cash flow. Never treat these as interchangeable.

All monetary values should use INR (₹), with appropriate Indian number formatting.

## 3. Mandatory implementation principles

1. Implement the complete working feature, not just a UI mockup.
2. Use Supabase PostgreSQL as the backend.
3. Generate a complete SQL migration file that I can run manually in the Supabase SQL Editor.
4. Use server-side operations for sensitive actions.
5. Keep configuration placeholders in environment variables.
6. Never hardcode passwords, Supabase service-role keys, API secrets, or access tokens.
7. Use Supabase Row Level Security (RLS) and secure authorization.
8. Make the financial calculations deterministic, documented, and testable.
9. All dashboard values must come from real database queries or explicitly identified preview/demo data.
10. Every major dashboard control, form, filter, chart interaction, import action, and export action must work.
11. Use transactions and idempotent imports where appropriate.
12. Do not fabricate missing settlement amounts, advertising revenue attribution, shipping charges, or other financial values.
13. Do not double-count expenses or platform deductions.
14. Preserve all existing Framely features and routes.

## 4. Design direction

Build a premium, modern financial command center for a small ecommerce business.

The experience should be visual-first, clean, dense with useful information, and easy to understand.

Use:
- Tailwind CSS and existing custom UI primitives.
- Recharts for all charts.
- TanStack Table for data-heavy tables.
- Lucide icons through the existing icon library.
- Responsive layouts for desktop, tablet, and mobile.
- Skeleton loading states.
- Useful empty states.
- Error and success notifications.
- Accessible keyboard interactions and readable contrast.

Avoid:
- Generic admin dashboard templates.
- Excessive gradients and decorative cards.
- Unnecessary animations.
- Fake data presented as actual financial information.
- Too many charts with no actionable insight.

Use semantic colors consistently:
- Green for positive profit and favorable changes.
- Red for losses, overspending, and adverse changes.
- Neutral colors for revenue, expenses, and informational metrics.

Use Indian date formatting, DD/MM/YYYY, and Indian financial year conventions. Financial years run from 1 April through 31 March.

## 5. Authentication and route protection

The `/business-analysis` route must be private.

First inspect the current Framely authentication implementation.

Preferred approach:
- If Supabase Auth is already integrated, reuse it.
- Add a private business-analysis authorization layer.
- Restrict access to explicitly authorized users.
- If the project does not have authentication suitable for this feature, implement secure Supabase Auth or a server-side password gate.

A password gate, if needed, must not rely on a client-side hardcoded password or localStorage as the security mechanism.

Use environment placeholders:

`SUPABASE_URL=YOUR_SUPABASE_URL`
`SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY`
`SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVER_ONLY_SERVICE_ROLE_KEY`
`BUSINESS_ANALYSIS_ALLOWED_EMAILS=YOUR_AUTHORIZED_EMAILS`

Only use the service-role key on the server. Never expose it through a `NEXT_PUBLIC_` variable.

If a dedicated business password is implemented, use a server-side secret or a secure password-verification mechanism, hashed credentials where appropriate, secure session cookies, rate limiting, and CSRF protection where relevant.

Implement:
- Protected route access.
- Server-side authorization for all business-data endpoints.
- Logout or session termination.
- Unauthorized and expired-session states.
- Restricted access to uploaded financial documents.
- Authorization checks on exports and imports.

Hiding the page in the frontend is not sufficient. Protect the underlying database operations as well.

## 6. Application structure and navigation

Create a business-analysis layout with a dedicated sidebar or navigation menu.

Pages:

1. Overview
2. Orders
3. Product costing
4. Inventory
5. Expenses
6. Advertising
7. Meesho reconciliation
8. Cash flow
9. Reports and imports
10. Settings

Use nested routes under `/business-analysis` if compatible with the existing routing architecture.

Suggested routes:

`/business-analysis`
`/business-analysis/orders`
`/business-analysis/products`
`/business-analysis/inventory`
`/business-analysis/expenses`
`/business-analysis/advertising`
`/business-analysis/reconciliation`
`/business-analysis/cash-flow`
`/business-analysis/imports`
`/business-analysis/settings`

## 7. Overview dashboard

Create a comprehensive dashboard containing:

### A. Global filters

- Today
- Yesterday
- Last 7 days
- Last 30 days
- This week
- Previous week
- This month
- Previous month
- Current financial year
- Previous financial year
- Custom date range

Additional filters:
- Sales channel
- Product/SKU
- Order status
- Payment/settlement status

Every applicable metric, chart, table, and report must respect the selected date range and filters.

Use the business timezone, configurable to Asia/Kolkata by default. Store timestamps consistently in UTC and retain business dates where necessary.

### B. KPI cards

Display:

1. Gross order value
2. Recognized sales revenue
3. Delivered orders
4. Total settled amount
5. Gross profit
6. Operating profit
7. Net profit
8. Total expenses
9. Advertising spend
10. Profit margin
11. Average order value
12. Return/RTO rate
13. Outstanding receivables
14. Available inventory value

Each card should include:
- Current value.
- Comparison against the previous equivalent period.
- Absolute change.
- Percentage change where meaningful.
- Tooltip explaining its calculation.
- Click-through to the relevant detail page.

Do not show an undefined comparison as 0%. Show an appropriate unavailable state instead.

### C. Charts using Recharts

Implement:

1. Revenue versus expenses versus profit — multi-series line chart.
2. Daily revenue and order volume — combined chart where appropriate.
3. Expense breakdown — donut chart.
4. Product/SKU profitability — horizontal bar chart.
5. Advertising spend versus attributed revenue — line or bar chart.
6. Profit margin over time — line chart.
7. Order status distribution — donut chart.
8. Cash inflows versus outflows — stacked or grouped bar chart.
9. Weekly and monthly financial comparison — grouped bar chart.
10. Cumulative revenue and profit — area chart.

All charts must have:
- Responsive sizing.
- Useful tooltips.
- Correct INR formatting.
- Empty-data states.
- Consistent legends and colors.
- Accessible labels.
- Real data from backend queries.

Clicking a chart segment or bar should navigate to the related filtered records wherever practical.

### D. Business insights

Create a rule-based insights section that can identify:
- Expenses that increased significantly.
- Declining profit margins.
- Products with negative contribution margins.
- Excessive RTO or return rates.
- Advertising costs exceeding configurable thresholds.
- Low inventory.
- Orders not reconciled with settlements.
- Missing material costs.
- Unusually large expenses.
- Missing financial imports.

Every insight must be explainable from actual data. Do not make up business trends or claim causation from correlation.

## 8. Meesho import and reconciliation engine

This is one of the most important parts of the system.

I download reports from the Meesho supplier dashboard. The application must support importing CSV, XLSX, and PDF files where supported.

Create an import center with:
- Drag-and-drop upload.
- File picker.
- Supported file type validation.
- Maximum file size configuration.
- File type and size display.
- Upload progress.
- Parsing progress.
- Preview of extracted rows.
- Column mapping when necessary.
- Import validation.
- Duplicate detection.
- Import summary.
- Downloadable error report.
- Import history.
- Rollback or reversal of an import without deleting unrelated records.

### Supported document categories

Design an extensible adapter architecture for:

- Order reports.
- Payment or settlement reports.
- Return and RTO reports.
- Fee and deduction reports.
- Other supported platform reports.

Do not assume all reports have the same columns or financial meaning. Each report type must have its own parser and mapping configuration.

### Parsing libraries

Use:

- `pdfjs-dist` for PDF text extraction.
- `xlsx` for Excel and workbook parsing.
- `papaparse` for CSV parsing.
- `zod` for validating normalized records.

For PDF tables, implement a parser adapter that groups text items by page, position, and approximate row/column boundaries where appropriate.

PDF.js is not a universal table extractor. If a PDF contains scanned pages or image-only tables, detect that condition and show a clear message. An optional OCR adapter may be added later.

Do not silently import incomplete PDF data.

### Import workflow

1. Upload a document.
2. Detect its format and report category.
3. Parse the document.
4. Normalize extracted rows into a common internal format.
5. Validate dates, identifiers, amounts, quantities, and statuses.
6. Display a preview.
7. Let the user confirm or adjust field mappings.
8. Detect existing records.
9. Commit validated records in a database transaction where possible.
10. Recalculate affected financial aggregates.
11. Record the import history and summary.
12. Show inserted, updated, skipped, duplicate, and rejected counts.

If the import fails, do not leave a partially imported report without a recoverable import status.

Store the original document privately in Supabase Storage when configured. Use private buckets and short-lived signed URLs. Never expose financial documents through public storage URLs.

### Meesho CSV compatibility

I have an existing Meesho order CSV containing these columns:

- `Reason for Credit Entry`
- `Sub Order No`
- `Catalog ID`
- `Order Date`
- `Order source`
- `Customer State`
- `Product Name`
- `SKU`
- `Size`
- `Quantity`
- `Supplier Listed Price (Incl. GST + Commission)`
- `Supplier Discounted Price (Incl GST and Commision)`
- `Packet Id`

The file includes statuses such as `DELIVERED`, `CANCELLED`, and `RTO_LOCKED`.

Build a parser specifically for this schema, but make it configurable for future changes to column names and formats.

Use `Sub Order No` as an external order-line identifier where appropriate. Preserve the original status and raw values.

Important: the columns named Supplier Listed Price and Supplier Discounted Price must not automatically be interpreted as the amount paid into my bank. Validate the semantics of each report and allow mapping or configuration where the exact accounting meaning is uncertain.

The parser should:
- Parse dates safely.
- Preserve order and packet identifiers.
- Handle missing packet IDs.
- Support multiple SKUs and quantities.
- Preserve cancellation and RTO records.
- Detect duplicate rows.
- Generate a useful error report.
- Store source row numbers and source file references for auditability.

A Meesho order export is not necessarily a settlement report. Use settlement reports to establish actual settlement amounts when available.

### Duplicate detection

Use a combination of:
- Platform.
- Report type.
- External order/suborder identifier.
- Source row fingerprint.
- Source file checksum.
- External transaction or settlement identifier when present.

Do not use the product name or date alone as a unique key.

Importing the same file twice must not duplicate revenue, expenses, orders, or settlement transactions.

## 9. Order management

Create an order table with:
- External order/suborder ID.
- Order date.
- Product.
- SKU.
- Quantity.
- Channel.
- Order status.
- Listed price.
- Discounted price.
- Recognized revenue.
- Estimated material cost.
- Packaging cost.
- Shipping/logistics cost.
- Platform fees.
- Allocated advertising cost, if supported.
- Contribution profit.
- Settlement status.
- Last updated date.

Filters:
- Date.
- SKU.
- Channel.
- Order status.
- Settlement status.
- Profitability.
- Search by order ID.

Order details should show the financial calculation breakdown, source report references, status history, and related transactions.

Keep raw imported values separate from normalized accounting values.

Do not treat cancelled orders as completed sales. Account for returns, refunds, and RTO using explicit accounting rules and the available evidence.

## 10. Product costing and recipes

Create a product costing module for customized photo frames.

Support:
- Product name.
- SKU.
- Variant.
- Product dimensions.
- Sales channel.
- Selling price.
- Material recipe.
- Packaging recipe.
- Other per-unit variable costs.
- GST treatment.
- Effective date.
- Active/inactive status.

Example material components:
- Wooden/plastic frame.
- Printed photo.
- Packaging box.
- Protective foam.
- Tape.
- Shipping label.
- Ink or other printing material.
- Wastage.
- Other consumables.

Each recipe component should include:
- Material.
- Quantity consumed per finished product.
- Unit of measurement.
- Cost per unit.
- Effective date.

Support different recipes for a single frame, set of two frames, and set of three frames.

Store historical cost versions. Changing a material price must not retroactively overwrite the historical cost of products sold in previous periods.

Allow both:
1. Standard estimated cost from a recipe.
2. Actual production cost where explicitly recorded.

Clearly label estimated and actual costs.

## 11. Inventory management

Track raw materials and finished products.

Features:
- Inventory item master.
- SKU.
- Category.
- Unit of measurement.
- Opening stock.
- Purchases.
- Consumption.
- Wastage.
- Returns to inventory.
- Adjustments.
- Closing stock.
- Reorder threshold.
- Supplier.
- Purchase cost.
- Stock valuation.
- Low-stock alerts.

Record inventory movements in an auditable ledger instead of only changing a stock number.

For example, purchasing 100 frames increases raw material inventory. Producing a finished product consumes its recipe components. Dispatching an order must not automatically consume the same inventory a second time.

Define and document when inventory consumption occurs.

If actual consumption is not tracked, display a clearly labeled estimated inventory figure rather than claiming exact stock.

Use weighted-average costing initially unless a different method is required by the existing application.

## 12. Expenses management

Create a dedicated expense ledger.

Expense categories:
- Raw materials.
- Packaging.
- Printing.
- Advertising.
- Shipping.
- Platform fees.
- Return/RTO costs.
- Salaries.
- Software subscriptions.
- Rent.
- Utilities.
- Equipment.
- Miscellaneous.

Each expense must contain:
- Date.
- Category.
- Amount.
- Vendor.
- Payment method.
- Payment status.
- Reference number.
- Notes.
- Optional receipt/document attachment.
- Tax amount and tax treatment where relevant.
- Whether it is recurring.
- Whether it is already reflected as a platform deduction.
- Source and related import.
- Created by.

Support adding, editing, filtering, searching, and exporting expenses.

Support recurring expenses through explicit records or generated scheduled entries with duplicate protection.

Prevent double counting. For example, if shipping was already deducted from a Meesho settlement and recorded as a platform fee, it must not also be added as a second expense unless the records represent genuinely separate costs.

Allow expense adjustments and reversals with audit history rather than destructive deletion of financial records.

## 13. Meta advertising analytics

Create an advertising module.

Initially support manual daily entry and CSV imports, with a future-ready adapter for the Meta Marketing API.

Fields:
- Date.
- Ad account.
- Campaign.
- Ad set.
- Ad.
- Amount spent.
- Impressions.
- Reach.
- Clicks.
- Link clicks.
- Purchases.
- Attributed purchase value.
- Attribution window.
- Source.
- Notes.

Calculate:
- Total ad spend.
- CPM.
- CPC.
- CTR.
- Cost per attributed purchase.
- ROAS.
- Advertising spend as a percentage of sales.
- Contribution profit after advertising.

Formula definitions:
- CPM = spend / impressions × 1,000.
- CPC = spend / clicks.
- CTR = clicks / impressions × 100.
- ROAS = attributed purchase value / ad spend.
- Cost per attributed purchase = spend / attributed purchases.

Handle zero denominators correctly.

Do not assume Meta-attributed purchase revenue is the same as total Meesho revenue. These datasets can overlap, and attribution can be incomplete or inaccurate.

Allow advertising spend to be included in business-level profit calculations without requiring attribution to individual orders.

If order-level attribution is not available, allocate advertising spend using an explicitly configured method, such as:
- No allocation.
- Revenue-weighted allocation.
- Delivered-order-weighted allocation.

Always label allocated advertising costs as estimates. Do not add allocated advertising spend to total expenses a second time.

## 14. Meesho reconciliation and settlements

Create a reconciliation workspace that compares:
- Orders.
- Expected settlement amounts.
- Actual settlements.
- Platform deductions.
- Refunds.
- Shipping charges.
- Penalties or adjustments.
- Settlement dates.
- Bank receipts, if manually entered or imported.

Show:
- Matched transactions.
- Unmatched orders.
- Missing settlements.
- Partial settlements.
- Duplicate transactions.
- Unexpected deductions.
- Outstanding receivables.
- Reconciliation differences.

Use a configurable reconciliation tolerance.

Never infer a bank receipt simply because an order is delivered.

Record each financial event separately and link it to the order or settlement where possible.

Support multiple settlements against one order and one settlement containing multiple orders.

Use a reconciliation ledger and prevent the same settlement from being counted twice.

## 15. Profit and accounting calculations

Implement a centralized financial calculation service.

Do not duplicate business formulas independently in each chart or component.

Use decimal-safe arithmetic, preferably PostgreSQL `NUMERIC` and a decimal arithmetic library in application code. Avoid binary floating-point arithmetic for monetary calculations.

Define these metrics:

### Gross order value
The total value of orders before applicable discounts, using a clearly documented price basis.

### Recognized sales revenue
Revenue from eligible completed sales, using the configured accounting policy and source data. Handle GST consistently and distinguish taxes collected on behalf of the government from business revenue.

### Net sales
Recognized sales minus applicable discounts, refunds, and sales returns, according to the accounting policy.

### Cost of goods sold
Actual or estimated production cost of the units sold, with historical costing.

### Gross profit
Net sales excluding applicable indirect taxes, minus cost of goods sold.

### Contribution profit
Net sales minus product costs and other variable selling costs, including platform fees, shipping, return costs, and advertising costs where the selected calculation includes them.

### Operating profit
Gross profit minus operating expenses, with the treatment of advertising and other operating costs explicitly documented.

### Net profit
Operating profit adjusted for other income, finance costs, taxes, and other applicable items according to the configured reporting policy.

If income-tax and other adjustments are not recorded, label the result as estimated net profit before unrecorded adjustments.

### Cash flow
Actual recorded cash inflows minus actual recorded cash outflows.

Cash flow must use payment and settlement dates where available, not simply order dates.

### Outstanding receivables
Amounts expected to be received but not yet settled, based on reconciled records. Exclude cancelled orders and other amounts that are no longer receivable.

### Profit margin
Profit / applicable revenue × 100.

Display the profit basis in tooltips and reports.

Support date-based reporting by order date, delivery/recognition date, settlement date, and expense date as applicable.

Never present an estimate as an audited accounting figure.

## 16. Database schema and Supabase migration

Create a complete SQL migration in the repository, for example:

`supabase/migrations/20261016000000_business_analysis.sql`

I will run this migration manually in the Supabase SQL Editor.

Inspect the existing database first and avoid recreating tables or policies that already exist. Use the existing authenticated user model where possible.

Create or adapt the following entities:

1. `business_profiles`
   - Business name.
   - Currency.
   - Timezone.
   - Financial year start.
   - Authorized user settings.
   - Accounting configuration.

2. `business_members`
   - Business ID.
   - User ID.
   - Role.
   - Active status.

3. `products`
   - Product identity, name, SKU, variant, dimensions, status.

4. `materials`
   - Raw material identity, SKU, unit, reorder threshold, active status.

5. `product_recipes`
   - Product ID, version, effective date, status.

6. `product_recipe_items`
   - Recipe ID, material ID, quantity per unit, unit cost reference.

7. `inventory_movements`
   - Material or product ID, movement type, quantity, unit cost, reference, timestamp.

8. `suppliers`
   - Name, contact information, notes.

9. `purchase_orders`
   - Supplier, order date, status, total, payment details.

10. `purchase_order_items`
    - Material, quantity, unit price, tax, total.

11. `sales_orders`
    - Business ID, external order ID, channel, order date, status, currency, source report.

12. `sales_order_items`
    - Order ID, external suborder ID, product, SKU, quantity, source prices, normalized sales values, cost snapshots.

13. `sales_order_status_history`
    - Order/item reference, previous status, new status, timestamp, source.

14. `settlements`
    - Platform, external settlement ID, settlement date, gross amount, deductions, net amount, status.

15. `settlement_items`
    - Settlement ID, order reference, transaction type, amount, fee/tax classification.

16. `expense_categories`
    - Category name, parent category, default accounting treatment.

17. `expenses`
    - Date, category, amount, vendor, payment status, payment date, tax fields, source, notes.

18. `ad_accounts`
    - Platform, account name, external account ID.

19. `ad_campaign_metrics`
    - Account, campaign, ad set, ad, date, spend, impressions, clicks, purchases, attributed revenue, attribution metadata.

20. `cash_transactions`
    - Date, direction, transaction type, amount, payment account, external reference, linked record.

21. `document_imports`
    - Filename, file checksum, report type, platform, import status, source storage path, counts, error summary, user, timestamp.

22. `document_import_rows`
    - Import ID, source row number, raw JSON, normalized record reference, fingerprint, processing status, error message.

23. `audit_logs`
    - Business, user, action, entity, record ID, before/after snapshots where appropriate, timestamp.

24. `business_settings`
    - Accounting policies, default costs, import mappings, thresholds, and dashboard preferences.

Add:
- UUID primary keys.
- Foreign keys.
- Unique constraints.
- Useful indexes.
- `NUMERIC` monetary fields.
- Appropriate date and timestamp columns.
- `JSONB` for raw import data and configurable mappings.
- `created_at` and `updated_at`.
- Safe updated-at triggers.
- RLS policies.
- Appropriate delete restrictions.
- Transactional import functions or RPCs where needed.

Use a business/tenant ownership model even if only one business is initially used. Users must not be able to read or modify another business's records.

Do not add broad `USING (true)` policies for sensitive tables.

Never trust a business ID or user ID supplied by the client without checking authorization.

Use `SECURITY DEFINER` functions only when required, with a fixed search path, minimum privileges, and explicit authorization checks.

Do not automatically expose raw import documents or audit logs to every authenticated user.

### Important schema design decisions

- Use unique platform-scoped external identifiers where reliable.
- Preserve raw imported values independently from normalized financial values.
- Keep source report and source row references for auditability.
- Support order updates without duplicating records.
- Keep historical cost snapshots for completed orders.
- Support multiple settlement items per order.
- Support reversals and adjustments.
- Keep expense recognition separate from cash payment.
- Add import idempotency.
- Use explicit enums or validated constraints for statuses.
- Avoid database triggers that silently double-count financial events.

Use database views or server-side aggregation queries for frequently used dashboard metrics.

Do not create one row per chart data point if the values can be aggregated safely from the underlying ledger.

Generate a README explaining the schema, migration order, security model, and how I should execute the SQL manually.

## 17. Backend API and service layer

Implement production-ready server-side functionality using the existing project's backend conventions.

Suggested service modules:

- `businessDashboardService`
- `orderService`
- `productCostingService`
- `inventoryService`
- `expenseService`
- `advertisingService`
- `meeshoImportService`
- `settlementReconciliationService`
- `cashFlowService`
- `financialCalculationService`
- `reportExportService`

Suggested endpoints, adapted to the existing framework:

- `GET /api/business-analysis/dashboard`
- `GET /api/business-analysis/orders`
- `GET /api/business-analysis/orders/:id`
- `POST /api/business-analysis/orders`
- `PATCH /api/business-analysis/orders/:id`
- `GET /api/business-analysis/products`
- `POST /api/business-analysis/products`
- `GET /api/business-analysis/inventory`
- `POST /api/business-analysis/inventory/movements`
- `GET /api/business-analysis/expenses`
- `POST /api/business-analysis/expenses`
- `PATCH /api/business-analysis/expenses/:id`
- `GET /api/business-analysis/advertising`
- `POST /api/business-analysis/advertising`
- `POST /api/business-analysis/imports`
- `GET /api/business-analysis/imports`
- `GET /api/business-analysis/imports/:id`
- `POST /api/business-analysis/imports/:id/confirm`
- `POST /api/business-analysis/imports/:id/rollback`
- `GET /api/business-analysis/reconciliation`
- `POST /api/business-analysis/reconciliation/match`
- `GET /api/business-analysis/cash-flow`
- `GET /api/business-analysis/reports/profit-loss`
- `GET /api/business-analysis/reports/export`

Implement correct pagination, sorting, filtering, validation, and error handling.

Use typed request and response schemas. Never return stack traces, service-role credentials, or internal secrets.

Use parameterized queries or Supabase's safe query APIs. Validate all incoming input using Zod.

Use database transactions for operations that must succeed or fail together.

Do not assume Supabase client calls automatically create a multi-statement transaction.

For larger imports, use a server-side import job with status tracking instead of processing unlimited data in a single HTTP request.

## 18. PDF, CSV, and XLSX export

Allow the user to download:
- Profit and loss statement.
- Weekly business summary.
- Monthly financial report.
- Product profitability report.
- Expense breakdown.
- Meesho reconciliation report.
- Inventory report.
- Cash flow statement.
- Import error report.

Support CSV and XLSX exports for tabular data.

Use a professional PDF report with:
- Framely branding.
- Reporting period.
- Generation date.
- KPI summary.
- Revenue and expense breakdown.
- Profit and loss summary.
- Charts where appropriate.
- Detailed transaction appendix.
- Accounting assumptions and limitations.

For PDF generation, use a suitable library such as `@react-pdf/renderer` or `jsPDF`.

Ensure exported financial totals are generated from the same backend calculation service used by the dashboard.

## 19. Settings and configuration

Create settings for:
- Business name.
- Currency.
- Timezone.
- Financial year.
- Default date range.
- Accounting method and recognition policy.
- GST inclusion/exclusion rules.
- Default product costs.
- RTO and return assumptions.
- Advertising allocation method.
- Reconciliation tolerance.
- Import mappings.
- Low-stock thresholds.
- Authorized users.

Do not silently change past reports when settings change. Record applicable effective dates and display the assumptions used for historical calculations.

## 20. Performance and data integrity

Implement:
- Server-side filtering and pagination.
- Indexed database queries.
- Aggregation queries for dashboards.
- Caching only where safe and correctly invalidated.
- Query cancellation where supported.
- Optimistic UI updates only for operations that can be rolled back safely.
- Database constraints and idempotency.
- Import error handling.
- Audit logs.
- Structured logging without sensitive data.

Avoid loading all historical orders into the browser to calculate profit.

Use incremental processing where appropriate, but always provide a way to rebuild or verify aggregates against source records.

## 21. Testing requirements

Add tests for:
- Meesho CSV parsing.
- Header mapping.
- Duplicate detection.
- Invalid amounts and dates.
- PDF parsing failure cases.
- Financial calculations.
- Refunds and returns.
- Cancelled orders.
- RTO orders.
- Partial settlements.
- Duplicate settlements.
- Expense double-counting prevention.
- Inventory consumption.
- Historical product costs.
- Date range boundaries.
- Financial year boundaries.
- Zero denominators in advertising metrics.
- Authorization and RLS.
- Import rollback.
- Export totals matching dashboard totals.

Test cases must include examples with missing data and conflicting records.

## 22. Environment placeholders

Create or update `.env.example` with placeholders appropriate to the existing project:

`NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL`
`NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY`
`SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVER_ONLY_SERVICE_ROLE_KEY`
`BUSINESS_ANALYSIS_ALLOWED_EMAILS=YOUR_AUTHORIZED_EMAILS`
`BUSINESS_ANALYSIS_MAX_UPLOAD_MB=20`
`BUSINESS_ANALYSIS_TIMEZONE=Asia/Kolkata`

These are examples, not permission to duplicate variables that already exist. Reuse existing environment variables where possible.

Only include the service-role key if the backend genuinely requires it. Prefer authenticated server-side access with RLS whenever practical.

Never put secrets in the frontend bundle.

Do not require Meta API credentials for the initial version because manual advertising entry and CSV import must work independently.

## 23. Delivery requirements

Implement the feature in the existing repository.

Deliver:

1. Complete responsive UI.
2. Protected `/business-analysis` routes.
3. Working backend APIs/services.
4. Complete Supabase migration SQL.
5. RLS policies and authorization checks.
6. Meesho CSV parser for the specified schema.
7. Extensible PDF, CSV, and XLSX import adapters.
8. Product costing and inventory modules.
9. Expense management.
10. Meta Ads analytics.
11. Settlement reconciliation.
12. Financial calculation service.
13. Charts and reports.
14. CSV/XLSX/PDF exports.
15. Tests.
16. `.env.example`.
17. Setup and deployment documentation.
18. A clear checklist of what requires my manual Supabase configuration.

### Implementation workflow

First inspect the repository and summarize the current architecture and any existing components or tables that can be reused.

Then implement the feature in coherent stages:

Stage 1: Database design, migration, security, and authentication.

Stage 2: Core business services, calculations, and order import.

Stage 3: Dashboard, charts, filters, and financial summaries.

Stage 4: Expenses, product costing, and inventory.

Stage 5: Advertising and settlement reconciliation.

Stage 6: PDF/XLSX/CSV imports, reports, and exports.

Stage 7: Tests, security review, and documentation.

Do not stop after producing a plan. Continue implementing the working feature.

Run the project's available linting, type checking, and tests. Fix issues caused by the implementation.

At completion, report:
- Files created or modified.
- Database tables and policies created.
- Environment variables I must configure.
- SQL migration path.
- Manual Supabase setup steps.
- Features implemented and tested.
- Known limitations.
- Any credentials or external integrations that remain unconfigured.

The final result should be a maintainable, secure, real business ERP integrated into Framely, with trustworthy financial calculations and a visual dashboard that makes my actual business performance easy to understand.