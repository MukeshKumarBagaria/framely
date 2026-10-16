-- =============================================================================
-- Framely Business Analysis — schema, security model and transactional RPCs
-- =============================================================================
--
-- Run this whole file ONCE in the Supabase SQL Editor (Dashboard → SQL Editor →
-- New query → paste → Run). It runs inside a single transaction: either every
-- object is created or none is.
--
-- Design notes (details in docs/business-analysis/README.md):
--
--   * Everything lives in its own schema, `business_analysis`, so it can never
--     collide with Framely's template/studio data and can be dropped as a unit.
--     You must add this schema to Dashboard → Project Settings → Data API →
--     "Exposed schemas" after running the migration.
--
--   * Tenancy: every row carries business_id. Child rows reference their parent
--     with a composite (business_id, id) foreign key, so a row can never point
--     at another business's record even if a UUID leaks.
--
--   * Row Level Security is enabled on every table. Policies only ever grant
--     access through business_members (no `using (true)` anywhere). The `anon`
--     role is granted nothing at all.
--
--   * Ledger tables (orders, settlements, expenses, cash, inventory movements,
--     audit log) are read-only to clients. They change only through the
--     SECURITY DEFINER functions below, each of which: pins search_path to '',
--     checks the caller's role with assert_role(), scopes every statement to
--     that business explicitly, and runs as one transaction (a PostgREST RPC
--     call is a single transaction). Reference/master tables (products,
--     materials, suppliers, categories, ad metrics, settings, staged imports)
--     are written directly by the server under RLS.
--
--   * Money is NUMERIC(14,2); unit costs NUMERIC(14,4). No floating point.
--
--   * No trigger in this file creates or changes a financial amount. The only
--     triggers are updated_at, audit logging and edit guards.
-- =============================================================================

begin;

do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'business_analysis') then
    raise exception 'Schema business_analysis already exists — this migration has already been applied.';
  end if;
end
$$;

create schema business_analysis;
comment on schema business_analysis is
  'Framely Business Analysis (ERP & profit analytics). Isolated from the template studio.';

revoke all on schema business_analysis from public;
grant usage on schema business_analysis to authenticated, service_role;

-- Functions created below are not executable by PUBLIC/anon unless granted.
alter default privileges in schema business_analysis revoke execute on functions from public;

-- -----------------------------------------------------------------------------
-- Generic helpers
-- -----------------------------------------------------------------------------

create function business_analysis.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- =============================================================================
-- 1. Tenancy: business profiles and members
-- =============================================================================

create table business_analysis.business_profiles (
  id                          uuid primary key default gen_random_uuid(),
  name                        text not null check (char_length(btrim(name)) between 1 and 200),
  legal_name                  text check (legal_name is null or char_length(legal_name) <= 200),
  gstin                       text check (gstin is null or gstin ~ '^[0-9]{2}[A-Z0-9]{13}$'),
  currency                    text not null default 'INR' check (currency = 'INR'),
  timezone                    text not null default 'Asia/Kolkata' check (char_length(timezone) between 1 and 64),
  financial_year_start_month  smallint not null default 4 check (financial_year_start_month between 1 and 12),
  created_by                  uuid references auth.users (id) on delete set null,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create table business_analysis.business_members (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references business_analysis.business_profiles (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  email        text,
  role         text not null check (role in ('owner', 'admin', 'accountant', 'viewer')),
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (business_id, user_id)
);
create index business_members_user_idx on business_analysis.business_members (user_id) where is_active;

-- Role ladder: viewer < writer(accountant) < admin < owner.
--   viewer     read dashboards and ledgers
--   accountant + record expenses, imports, inventory, reconciliation (writer)
--   admin      + settings, rollbacks, audit log, raw documents
--   owner      + manage members

-- Membership lookups are SECURITY DEFINER so RLS policies can call them
-- without recursing into business_members' own policies. They only ever
-- answer questions about auth.uid().
create function business_analysis.member_business_ids(p_min_role text default 'viewer')
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.business_id
    from business_analysis.business_members m
   where m.user_id = auth.uid()
     and m.is_active
     and case p_min_role
           when 'viewer' then true
           when 'writer' then m.role in ('owner', 'admin', 'accountant')
           when 'admin'  then m.role in ('owner', 'admin')
           when 'owner'  then m.role = 'owner'
           else false
         end
$$;

create function business_analysis.assert_role(p_business_id uuid, p_min_role text)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_role text;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  select m.role into v_role
    from business_analysis.business_members m
   where m.business_id = p_business_id
     and m.user_id = auth.uid()
     and m.is_active;

  if v_role is null then
    raise exception 'not authorized for this business' using errcode = '42501';
  end if;

  if (p_min_role = 'writer' and v_role not in ('owner', 'admin', 'accountant'))
     or (p_min_role = 'admin' and v_role not in ('owner', 'admin'))
     or (p_min_role = 'owner' and v_role <> 'owner') then
    raise exception 'your role (%) cannot perform this action', v_role using errcode = '42501';
  end if;

  return v_role;
end;
$$;

-- =============================================================================
-- 2. Settings (versioned by effective date) and import history
-- =============================================================================

-- Each save of the settings page writes a version. Reports use the version in
-- force on the report's end date and display which one they used, so changing
-- a policy never silently rewrites how a past report was calculated.
create table business_analysis.business_settings (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references business_analysis.business_profiles (id) on delete cascade,
  effective_from  date not null,
  settings        jsonb not null check (jsonb_typeof(settings) = 'object'),
  note            text check (note is null or char_length(note) <= 500),
  created_by      uuid default auth.uid() references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (business_id, effective_from)
);

create function business_analysis.settings_at(p_business_id uuid, p_on date)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (select s.settings
       from business_analysis.business_settings s
      where s.business_id = p_business_id and s.effective_from <= p_on
      order by s.effective_from desc
      limit 1),
    '{}'::jsonb)
$$;

create table business_analysis.document_imports (
  id                     uuid primary key default gen_random_uuid(),
  business_id            uuid not null references business_analysis.business_profiles (id) on delete cascade,
  platform               text not null check (platform in ('meesho', 'meta', 'other')),
  report_type            text not null check (report_type in
                           ('meesho_orders', 'meesho_settlements', 'meesho_returns', 'platform_fees', 'meta_ads')),
  file_name              text not null check (char_length(file_name) between 1 and 255),
  file_format            text not null check (file_format in ('csv', 'xlsx', 'pdf')),
  mime_type              text,
  file_size_bytes        bigint not null check (file_size_bytes >= 0),
  checksum_sha256        text not null check (checksum_sha256 ~ '^[0-9a-f]{64}$'),
  storage_path           text,
  sheet_name             text,
  status                 text not null default 'staging' check (status in
                           ('staging', 'parsed', 'needs_review', 'committing', 'committed',
                            'failed', 'rolling_back', 'rolled_back', 'discarded')),
  mapping                jsonb not null default '{}'::jsonb check (jsonb_typeof(mapping) = 'object'),
  parse_summary          jsonb not null default '{}'::jsonb check (jsonb_typeof(parse_summary) = 'object'),
  total_rows             integer not null default 0 check (total_rows >= 0),
  valid_rows             integer not null default 0 check (valid_rows >= 0),
  invalid_rows           integer not null default 0 check (invalid_rows >= 0),
  duplicate_rows         integer not null default 0 check (duplicate_rows >= 0),
  inserted_count         integer not null default 0,
  updated_count          integer not null default 0,
  unchanged_count        integer not null default 0,
  rejected_count         integer not null default 0,
  reverted_count         integer not null default 0,
  error_summary          text,
  duplicate_of_import_id uuid,
  created_by             uuid default auth.uid() references auth.users (id) on delete set null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  committed_at           timestamptz,
  rolled_back_at         timestamptz,
  rolled_back_by         uuid references auth.users (id) on delete set null,
  rollback_reason        text,
  unique (business_id, id)
);
create index document_imports_business_created_idx on business_analysis.document_imports (business_id, created_at desc);
create index document_imports_checksum_idx on business_analysis.document_imports (business_id, checksum_sha256);
alter table business_analysis.document_imports
  add constraint document_imports_duplicate_of_fk
  foreign key (business_id, duplicate_of_import_id)
  references business_analysis.document_imports (business_id, id) on delete set null (duplicate_of_import_id);

-- =============================================================================
-- 3. Suppliers, materials, products, recipes
-- =============================================================================

create table business_analysis.suppliers (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references business_analysis.business_profiles (id) on delete cascade,
  name          text not null check (char_length(btrim(name)) between 1 and 200),
  contact_name  text,
  phone         text check (phone is null or char_length(phone) <= 30),
  email         text check (email is null or char_length(email) <= 254),
  gstin         text check (gstin is null or gstin ~ '^[0-9]{2}[A-Z0-9]{13}$'),
  address       text,
  notes         text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (business_id, id)
);
create unique index suppliers_name_uidx on business_analysis.suppliers (business_id, lower(btrim(name)));

create table business_analysis.materials (
  id                   uuid primary key default gen_random_uuid(),
  business_id          uuid not null references business_analysis.business_profiles (id) on delete cascade,
  name                 text not null check (char_length(btrim(name)) between 1 and 200),
  sku                  text check (sku is null or char_length(sku) <= 100),
  sku_normalized       text generated always as (upper(btrim(sku))) stored,
  category             text not null default 'raw_material'
                         check (category in ('raw_material', 'packaging', 'printing', 'consumable', 'other')),
  unit                 text not null check (char_length(btrim(unit)) between 1 and 20),
  reorder_threshold    numeric(14,3) not null default 0 check (reorder_threshold >= 0),
  default_supplier_id  uuid,
  is_active            boolean not null default true,
  notes                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (business_id, id),
  foreign key (business_id, default_supplier_id)
    references business_analysis.suppliers (business_id, id) on delete set null (default_supplier_id)
);
create unique index materials_sku_uidx on business_analysis.materials (business_id, sku_normalized) where sku is not null;

-- Price history. A new price is a new row with its own effective date, so the
-- cost of goods sold in earlier periods is never rewritten.
create table business_analysis.material_cost_versions (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references business_analysis.business_profiles (id) on delete cascade,
  material_id     uuid not null,
  effective_from  date not null,
  unit_cost       numeric(14,4) not null check (unit_cost >= 0),
  source          text not null default 'manual' check (source in ('manual', 'purchase_order', 'import')),
  note            text,
  created_by      uuid default auth.uid() references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (material_id, effective_from),
  foreign key (business_id, material_id) references business_analysis.materials (business_id, id) on delete restrict
);

create table business_analysis.products (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid not null references business_analysis.business_profiles (id) on delete cascade,
  name           text not null check (char_length(btrim(name)) between 1 and 300),
  sku            text not null check (char_length(btrim(sku)) between 1 and 100),
  sku_normalized text generated always as (upper(btrim(sku))) stored,
  variant        text check (variant is null or char_length(variant) <= 100),
  pack_size      smallint not null default 1 check (pack_size between 1 and 100),
  dimensions     text check (dimensions is null or char_length(dimensions) <= 100),
  channel        text not null default 'meesho' check (channel in ('meesho', 'direct', 'whatsapp', 'other', 'all')),
  selling_price  numeric(14,2) check (selling_price is null or selling_price >= 0),
  gst_rate       numeric(5,2) check (gst_rate is null or gst_rate between 0 and 28),
  hsn_code       text check (hsn_code is null or hsn_code ~ '^[0-9]{4,8}$'),
  status         text not null default 'active' check (status in ('active', 'inactive')),
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (business_id, id),
  unique (business_id, sku_normalized)
);

create table business_analysis.product_recipes (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references business_analysis.business_profiles (id) on delete cascade,
  product_id      uuid not null,
  version         integer not null check (version > 0),
  effective_from  date not null,
  status          text not null default 'draft' check (status in ('draft', 'active')),
  notes           text,
  created_by      uuid default auth.uid() references auth.users (id) on delete set null,
  activated_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (business_id, id),
  unique (product_id, version),
  foreign key (business_id, product_id) references business_analysis.products (business_id, id) on delete restrict
);
create index product_recipes_effective_idx
  on business_analysis.product_recipes (product_id, effective_from desc, version desc) where status = 'active';

create table business_analysis.product_recipe_items (
  id                  uuid primary key default gen_random_uuid(),
  business_id         uuid not null references business_analysis.business_profiles (id) on delete cascade,
  recipe_id           uuid not null,
  material_id         uuid,
  description         text check (description is null or char_length(description) <= 200),
  component_type      text not null check (component_type in ('material', 'packaging', 'other')),
  quantity            numeric(14,4) not null check (quantity > 0),
  unit                text not null check (char_length(btrim(unit)) between 1 and 20),
  wastage_percent     numeric(5,2) not null default 0 check (wastage_percent between 0 and 100),
  unit_cost_override  numeric(14,4) check (unit_cost_override is null or unit_cost_override >= 0),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  -- A component is either a stocked material, or a described cost with an
  -- explicit price (e.g. labour per frame).
  check (material_id is not null or (description is not null and unit_cost_override is not null)),
  foreign key (business_id, recipe_id) references business_analysis.product_recipes (business_id, id) on delete cascade,
  foreign key (business_id, material_id) references business_analysis.materials (business_id, id) on delete restrict
);
create index product_recipe_items_recipe_idx on business_analysis.product_recipe_items (recipe_id);

-- An activated recipe is history: its components are frozen. Corrections are a
-- new version (which may share the same effective date and then supersedes).
create function business_analysis.guard_recipe_items()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_recipe uuid;
  v_status text;
begin
  v_recipe := case when tg_op = 'DELETE' then old.recipe_id else new.recipe_id end;
  select r.status into v_status from business_analysis.product_recipes r where r.id = v_recipe;
  if v_status is distinct from 'draft' then
    raise exception 'recipe version is active and cannot be modified; create a new version' using errcode = '55000';
  end if;
  if tg_op = 'UPDATE' and old.recipe_id <> new.recipe_id then
    raise exception 'recipe items cannot move between recipes' using errcode = '55000';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create function business_analysis.guard_recipe_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'active' and (
       new.status <> old.status
    or new.effective_from <> old.effective_from
    or new.product_id <> old.product_id
    or new.version <> old.version) then
    raise exception 'an active recipe version is immutable; create a new version' using errcode = '55000';
  end if;
  if old.status = 'draft' and new.status = 'active' then
    new.activated_at := now();
  end if;
  return new;
end;
$$;

-- Cost of one finished unit from the recipe in force on p_on, split by
-- component type. Material prices also resolve as of p_on. missing_components
-- counts components without any price on that date; callers treat a recipe
-- with missing prices as "cost unknown" rather than under-costing it.
create function business_analysis.recipe_unit_cost(p_business_id uuid, p_product_id uuid, p_on date)
returns table (
  recipe_id           uuid,
  material_cost       numeric,
  packaging_cost      numeric,
  other_cost          numeric,
  missing_components  integer,
  component_count     integer
)
language sql
stable
set search_path = ''
as $$
  with recipe as (
    select r.id
      from business_analysis.product_recipes r
     where r.business_id = p_business_id
       and r.product_id = p_product_id
       and r.status = 'active'
       and r.effective_from <= p_on
     order by r.effective_from desc, r.version desc
     limit 1
  ),
  items as (
    select i.component_type,
           i.quantity * (1 + i.wastage_percent / 100.0) as qty,
           coalesce(
             i.unit_cost_override,
             (select c.unit_cost
                from business_analysis.material_cost_versions c
               where c.business_id = p_business_id
                 and c.material_id = i.material_id
                 and c.effective_from <= p_on
               order by c.effective_from desc
               limit 1)
           ) as unit_cost
      from business_analysis.product_recipe_items i
      join recipe on recipe.id = i.recipe_id
     where i.business_id = p_business_id
  )
  select (select id from recipe),
         round(coalesce(sum(qty * unit_cost) filter (where component_type = 'material'), 0), 4),
         round(coalesce(sum(qty * unit_cost) filter (where component_type = 'packaging'), 0), 4),
         round(coalesce(sum(qty * unit_cost) filter (where component_type = 'other'), 0), 4),
         (count(*) filter (where unit_cost is null))::integer,
         count(*)::integer
    from items
$$;

-- =============================================================================
-- 4. Purchasing and the inventory ledger
-- =============================================================================

create table business_analysis.purchase_orders (
  id                 uuid primary key default gen_random_uuid(),
  business_id        uuid not null references business_analysis.business_profiles (id) on delete cascade,
  supplier_id        uuid not null,
  po_number          text not null check (char_length(btrim(po_number)) between 1 and 50),
  order_date         date not null,
  expected_date      date,
  status             text not null default 'draft' check (status in ('draft', 'ordered', 'received', 'cancelled')),
  subtotal           numeric(14,2) not null default 0,
  tax_total          numeric(14,2) not null default 0,
  total              numeric(14,2) not null default 0,
  payment_status     text not null default 'unpaid' check (payment_status in ('unpaid', 'paid')),
  payment_date       date,
  payment_method     text check (payment_method is null or payment_method in
                       ('cash', 'upi', 'bank_transfer', 'card', 'cheque', 'other')),
  payment_reference  text,
  received_on        date,
  notes              text,
  created_by         uuid references auth.users (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (business_id, id),
  unique (business_id, po_number),
  foreign key (business_id, supplier_id) references business_analysis.suppliers (business_id, id) on delete restrict
);

create table business_analysis.purchase_order_items (
  id                 uuid primary key default gen_random_uuid(),
  business_id        uuid not null references business_analysis.business_profiles (id) on delete cascade,
  purchase_order_id  uuid not null,
  material_id        uuid not null,
  quantity           numeric(14,3) not null check (quantity > 0),
  unit_price         numeric(14,4) not null check (unit_price >= 0),
  tax_rate           numeric(5,2) not null default 0 check (tax_rate between 0 and 28),
  line_subtotal      numeric(14,2) generated always as (round(quantity * unit_price, 2)) stored,
  tax_amount         numeric(14,2) generated always as (round(quantity * unit_price * tax_rate / 100.0, 2)) stored,
  created_at         timestamptz not null default now(),
  foreign key (business_id, purchase_order_id) references business_analysis.purchase_orders (business_id, id) on delete cascade,
  foreign key (business_id, material_id) references business_analysis.materials (business_id, id) on delete restrict
);
create index purchase_order_items_po_idx on business_analysis.purchase_order_items (purchase_order_id);

-- Inventory is an append-only ledger. Quantities are signed (in > 0, out < 0);
-- stock on hand and weighted-average value are derived from it, never stored.
-- Consumption is posted only by record_production(); dispatching a sales order
-- never moves stock, so the same materials cannot be consumed twice.
create table business_analysis.inventory_movements (
  id               uuid primary key default gen_random_uuid(),
  business_id      uuid not null references business_analysis.business_profiles (id) on delete cascade,
  material_id      uuid,
  product_id       uuid,
  movement_type    text not null check (movement_type in
                     ('opening', 'purchase', 'consumption', 'wastage', 'return_to_stock',
                      'adjustment', 'production_output', 'dispatch')),
  quantity         numeric(14,3) not null check (quantity <> 0),
  unit_cost        numeric(14,4) check (unit_cost is null or unit_cost >= 0),
  movement_date    date not null,
  reference_type   text check (reference_type is null or reference_type in
                     ('purchase_order', 'production', 'manual', 'stock_count')),
  reference_id     uuid,
  notes            text,
  created_by       uuid references auth.users (id) on delete set null,
  created_at       timestamptz not null default now(),
  voided_at        timestamptz,
  void_reason      text,
  unique (business_id, id),
  check (num_nonnulls(material_id, product_id) = 1),
  check (
    (movement_type in ('opening', 'purchase', 'return_to_stock', 'production_output') and quantity > 0)
    or (movement_type in ('consumption', 'wastage', 'dispatch') and quantity < 0)
    or movement_type = 'adjustment'
  ),
  check (movement_type not in ('opening', 'purchase', 'production_output') or unit_cost is not null),
  foreign key (business_id, material_id) references business_analysis.materials (business_id, id) on delete restrict,
  foreign key (business_id, product_id) references business_analysis.products (business_id, id) on delete restrict
);
create index inventory_movements_material_idx
  on business_analysis.inventory_movements (business_id, material_id, movement_date) where voided_at is null;
create index inventory_movements_product_idx
  on business_analysis.inventory_movements (business_id, product_id, movement_date) where voided_at is null;

-- =============================================================================
-- 5. Sales orders
-- =============================================================================

create table business_analysis.sales_orders (
  id                 uuid primary key default gen_random_uuid(),
  business_id        uuid not null references business_analysis.business_profiles (id) on delete cascade,
  channel            text not null check (channel in ('meesho', 'direct', 'whatsapp', 'other')),
  external_order_id  text not null check (char_length(btrim(external_order_id)) between 1 and 100),
  order_date         date not null,
  customer_state     text,
  order_source       text,
  currency           text not null default 'INR' check (currency = 'INR'),
  notes              text,
  source_import_id   uuid,
  last_import_id     uuid,
  created_by         uuid references auth.users (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  voided_at          timestamptz,
  void_reason        text,
  unique (business_id, id),
  unique (business_id, channel, external_order_id)
);

-- Normalized order statuses. The platform's own wording is kept in raw_status.
--   pending          placed, not yet shipped
--   shipped          in transit to the customer
--   delivered        delivered (revenue is recognised on delivery by default)
--   return_requested delivered, customer has asked to return
--   returned         customer return completed (sale reversed)
--   rto              return to origin: never delivered, came back
--   cancelled        cancelled before fulfilment
--   exchanged        delivered and exchanged
--   lost             lost in transit (claims arrive via settlements)
--   unknown          status text not recognised — review the mapping
create table business_analysis.sales_order_items (
  id                       uuid primary key default gen_random_uuid(),
  business_id              uuid not null references business_analysis.business_profiles (id) on delete cascade,
  order_id                 uuid not null,
  channel                  text not null check (channel in ('meesho', 'direct', 'whatsapp', 'other')),
  external_line_id         text not null check (char_length(btrim(external_line_id)) between 1 and 100),
  product_id               uuid,
  sku                      text,
  sku_normalized           text generated always as (upper(btrim(sku))) stored,
  product_name             text,
  size                     text,
  catalog_id               text,
  packet_id                text,
  quantity                 integer not null check (quantity > 0),
  status                   text not null check (status in
                             ('pending', 'shipped', 'delivered', 'return_requested', 'returned',
                              'rto', 'cancelled', 'exchanged', 'lost', 'unknown')),
  raw_status               text,
  order_date               date not null,
  delivered_on             date,
  status_changed_at        timestamptz not null default now(),

  -- Values exactly as the source reported them (meaning depends on the report).
  source_listed_price      numeric(14,2),
  source_discounted_price  numeric(14,2),
  price_basis              text not null default 'per_unit' check (price_basis in ('per_unit', 'line_total')),

  -- Normalized line totals (GST-inclusive, as charged on the platform).
  listed_amount            numeric(14,2) not null default 0 check (listed_amount >= 0),
  sale_amount              numeric(14,2) not null check (sale_amount >= 0),
  gst_rate                 numeric(5,2) not null default 0 check (gst_rate between 0 and 28),
  gst_rate_source          text not null default 'unconfigured'
                             check (gst_rate_source in ('product', 'default', 'unregistered', 'unconfigured', 'manual')),
  sale_amount_excl_gst     numeric(14,2) generated always as (round(sale_amount / (1 + gst_rate / 100.0), 2)) stored,

  -- Cost snapshot per unit, frozen when the line was costed.
  material_unit_cost       numeric(14,4),
  packaging_unit_cost      numeric(14,4),
  other_unit_cost          numeric(14,4),
  actual_unit_cost         numeric(14,4) check (actual_unit_cost is null or actual_unit_cost >= 0),
  cost_basis               text not null default 'missing' check (cost_basis in ('missing', 'estimated', 'actual')),
  recipe_id                uuid,
  cost_snapshot_at         timestamptz,
  material_cost_total      numeric(14,2) generated always as (round(case
                             when actual_unit_cost is not null then actual_unit_cost * quantity
                             else coalesce(material_unit_cost, 0) * quantity end, 2)) stored,
  packaging_cost_total     numeric(14,2) generated always as (round(case
                             when actual_unit_cost is not null then 0
                             else coalesce(packaging_unit_cost, 0) * quantity end, 2)) stored,
  other_cost_total         numeric(14,2) generated always as (round(case
                             when actual_unit_cost is not null then 0
                             else coalesce(other_unit_cost, 0) * quantity end, 2)) stored,
  line_cost                numeric(14,2) generated always as (round(case
                             when actual_unit_cost is not null then actual_unit_cost * quantity
                             else (coalesce(material_unit_cost, 0) + coalesce(packaging_unit_cost, 0)
                                   + coalesce(other_unit_cost, 0)) * quantity end, 2)) stored,

  row_fingerprint          text,
  raw                      jsonb,
  source_import_id         uuid,
  last_import_id           uuid,
  source_row_number        integer,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  voided_at                timestamptz,
  void_reason              text,
  unique (business_id, id),
  unique (business_id, channel, external_line_id),
  foreign key (business_id, order_id) references business_analysis.sales_orders (business_id, id) on delete cascade,
  foreign key (business_id, product_id) references business_analysis.products (business_id, id) on delete set null (product_id),
  foreign key (business_id, recipe_id) references business_analysis.product_recipes (business_id, id) on delete set null (recipe_id)
);
create index sales_order_items_date_idx on business_analysis.sales_order_items (business_id, order_date) where voided_at is null;
create index sales_order_items_sku_idx on business_analysis.sales_order_items (business_id, sku_normalized, order_date);
create index sales_order_items_status_idx on business_analysis.sales_order_items (business_id, status, order_date);
create index sales_order_items_order_idx on business_analysis.sales_order_items (order_id);

create table business_analysis.sales_order_status_history (
  id                uuid primary key default gen_random_uuid(),
  business_id       uuid not null references business_analysis.business_profiles (id) on delete cascade,
  order_item_id     uuid not null,
  previous_status   text,
  new_status        text not null,
  raw_status        text,
  changed_at        timestamptz not null default now(),
  source            text not null check (source in ('import', 'manual', 'rollback', 'system')),
  source_import_id  uuid,
  changed_by        uuid references auth.users (id) on delete set null,
  note              text,
  foreign key (business_id, order_item_id) references business_analysis.sales_order_items (business_id, id) on delete cascade
);
create index sales_order_status_history_item_idx on business_analysis.sales_order_status_history (order_item_id, changed_at);

-- Lifecycle rank used to stop an older report from regressing a status
-- (e.g. a stale export saying "shipped" for an order already "delivered").
create function business_analysis.status_rank(p_status text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case p_status
           when 'pending' then 0
           when 'unknown' then 0
           when 'shipped' then 1
           when 'return_requested' then 3
           when 'returned' then 4
           else 2  -- delivered, exchanged, cancelled, rto, lost
         end
$$;

-- =============================================================================
-- 6. Settlements (what the platform actually paid or deducted)
-- =============================================================================

create table business_analysis.settlements (
  id                      uuid primary key default gen_random_uuid(),
  business_id             uuid not null references business_analysis.business_profiles (id) on delete cascade,
  platform                text not null check (platform in ('meesho', 'other')),
  external_settlement_id  text not null check (char_length(btrim(external_settlement_id)) between 1 and 150),
  -- 'payout' rows move money; 'fee_statement' rows describe deductions that
  -- were taken out of payouts and therefore never create a cash movement.
  settlement_kind         text not null default 'payout' check (settlement_kind in ('payout', 'fee_statement')),
  settlement_date         date,
  gross_amount            numeric(14,2) not null default 0,
  deductions_amount       numeric(14,2) not null default 0,
  net_amount              numeric(14,2) not null default 0,
  status                  text not null default 'pending' check (status in ('pending', 'paid', 'reconciled', 'disputed')),
  bank_received_amount    numeric(14,2),
  bank_received_on        date,
  bank_reference          text,
  notes                   text,
  source_import_id        uuid,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  voided_at               timestamptz,
  void_reason             text,
  unique (business_id, id),
  unique (business_id, platform, external_settlement_id)
);
create index settlements_date_idx on business_analysis.settlements (business_id, settlement_date);

-- One row per financial component of a settlement line. Amounts are signed
-- from the seller's side: credits > 0, deductions < 0. Uniqueness on the
-- source-row fingerprint + component makes re-importing a file a no-op.
create table business_analysis.settlement_items (
  id                  uuid primary key default gen_random_uuid(),
  business_id         uuid not null references business_analysis.business_profiles (id) on delete cascade,
  settlement_id       uuid not null,
  order_item_id       uuid,
  external_line_id    text,
  transaction_type    text not null check (transaction_type in
                        ('sale', 'sale_return', 'commission', 'platform_fee', 'shipping_fee',
                         'return_shipping_fee', 'penalty', 'recovery', 'ads_fee', 'tcs', 'tds',
                         'claim', 'compensation', 'adjustment', 'unclassified')),
  amount              numeric(14,2) not null,
  transaction_date    date,
  external_reference  text,
  description         text,
  row_fingerprint     text not null,
  source_import_id    uuid,
  source_row_number   integer,
  match_type          text check (match_type is null or match_type in ('auto', 'manual')),
  matched_by          uuid references auth.users (id) on delete set null,
  matched_at          timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  voided_at           timestamptz,
  void_reason         text,
  unique (business_id, id),
  unique (business_id, row_fingerprint, transaction_type),
  foreign key (business_id, settlement_id) references business_analysis.settlements (business_id, id) on delete cascade,
  foreign key (business_id, order_item_id)
    references business_analysis.sales_order_items (business_id, id) on delete set null (order_item_id)
);
create index settlement_items_order_item_idx on business_analysis.settlement_items (order_item_id) where voided_at is null;
create index settlement_items_settlement_idx on business_analysis.settlement_items (settlement_id);
create index settlement_items_line_idx on business_analysis.settlement_items (business_id, external_line_id);

-- =============================================================================
-- 7. Expenses
-- =============================================================================

-- treatment decides where a category lands in the P&L:
--   inventory_purchase  stock bought (cash only; COGS comes from recipes)
--   cogs_direct         direct production cost not modelled in recipes
--   variable_selling    per-order selling cost (contribution)
--   advertising         ad spend (see settings.advertising.costSource)
--   operating           overhead (operating profit)
--   capital             equipment/asset (cash only; depreciation not modelled)
--   finance_cost        interest and bank charges (net profit)
--   income_tax          income tax (net profit)
create table business_analysis.expense_categories (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references business_analysis.business_profiles (id) on delete cascade,
  name         text not null check (char_length(btrim(name)) between 1 and 100),
  slug         text not null check (slug ~ '^[a-z0-9_]{1,60}$'),
  parent_id    uuid,
  treatment    text not null check (treatment in
                 ('inventory_purchase', 'cogs_direct', 'variable_selling', 'advertising',
                  'operating', 'capital', 'finance_cost', 'income_tax')),
  is_system    boolean not null default false,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (business_id, id),
  unique (business_id, slug),
  foreign key (business_id, parent_id) references business_analysis.expense_categories (business_id, id) on delete set null (parent_id)
);

create table business_analysis.expenses (
  id                       uuid primary key default gen_random_uuid(),
  business_id              uuid not null references business_analysis.business_profiles (id) on delete cascade,
  expense_date             date not null,
  category_id              uuid not null,
  -- amount is the total charged, including any GST shown in tax_amount.
  amount                   numeric(14,2) not null check (amount <> 0),
  tax_amount               numeric(14,2) not null default 0,
  tax_treatment            text not null default 'none'
                             check (tax_treatment in ('none', 'gst_itc_eligible', 'gst_no_itc')),
  vendor                   text check (vendor is null or char_length(vendor) <= 200),
  payment_method           text check (payment_method is null or payment_method in
                             ('cash', 'upi', 'bank_transfer', 'card', 'cheque', 'platform_deduction', 'other')),
  payment_status           text not null default 'paid' check (payment_status in ('unpaid', 'paid')),
  payment_date             date,
  reference_number         text check (reference_number is null or char_length(reference_number) <= 100),
  notes                    text check (notes is null or char_length(notes) <= 2000),
  attachment_path          text,
  -- true when the platform already deducted this from a settlement. Such
  -- expenses are excluded from P&L and cash, because the settlement
  -- deduction already counts them.
  reflected_in_settlement  boolean not null default false,
  is_recurring_template    boolean not null default false,
  recurrence               jsonb,
  recurring_template_id    uuid,
  occurrence_date          date,
  source                   text not null default 'manual' check (source in ('manual', 'recurring', 'import', 'system')),
  source_import_id         uuid,
  status                   text not null default 'active' check (status in ('active', 'reversed')),
  reversal_of_id           uuid,
  reversal_reason          text,
  created_by               uuid references auth.users (id) on delete set null,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  unique (business_id, id),
  unique (recurring_template_id, occurrence_date),
  unique (reversal_of_id),
  check ((reversal_of_id is null and amount > 0) or (reversal_of_id is not null and amount < 0)),
  check (abs(tax_amount) <= abs(amount)),
  check (not is_recurring_template or recurrence is not null),
  check (payment_status = 'unpaid' or payment_date is not null),
  foreign key (business_id, category_id) references business_analysis.expense_categories (business_id, id) on delete restrict,
  foreign key (business_id, recurring_template_id) references business_analysis.expenses (business_id, id) on delete restrict,
  foreign key (business_id, reversal_of_id) references business_analysis.expenses (business_id, id) on delete restrict
);
create index expenses_date_idx on business_analysis.expenses (business_id, expense_date) where not is_recurring_template;
create index expenses_category_idx on business_analysis.expenses (business_id, category_id, expense_date);

-- =============================================================================
-- 8. Advertising
-- =============================================================================

create table business_analysis.ad_accounts (
  id                   uuid primary key default gen_random_uuid(),
  business_id          uuid not null references business_analysis.business_profiles (id) on delete cascade,
  platform             text not null default 'meta' check (platform in ('meta', 'google', 'meesho_ads', 'other')),
  name                 text not null check (char_length(btrim(name)) between 1 and 200),
  external_account_id  text not null check (char_length(btrim(external_account_id)) between 1 and 100),
  currency             text not null default 'INR' check (currency = 'INR'),
  is_active            boolean not null default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (business_id, id),
  unique (business_id, platform, external_account_id)
);

create table business_analysis.ad_campaign_metrics (
  id                  uuid primary key default gen_random_uuid(),
  business_id         uuid not null references business_analysis.business_profiles (id) on delete cascade,
  ad_account_id       uuid not null,
  metric_date         date not null,
  campaign_name       text not null default '' check (char_length(campaign_name) <= 300),
  adset_name          text not null default '' check (char_length(adset_name) <= 300),
  ad_name             text not null default '' check (char_length(ad_name) <= 300),
  campaign_id         text,
  adset_id            text,
  ad_id               text,
  spend               numeric(14,2) not null default 0 check (spend >= 0),
  impressions         bigint not null default 0 check (impressions >= 0),
  reach               bigint check (reach is null or reach >= 0),
  clicks              bigint not null default 0 check (clicks >= 0),
  link_clicks         bigint check (link_clicks is null or link_clicks >= 0),
  purchases           numeric(12,2) not null default 0 check (purchases >= 0),
  attributed_revenue  numeric(14,2) not null default 0 check (attributed_revenue >= 0),
  attribution_window  text check (attribution_window is null or char_length(attribution_window) <= 100),
  source              text not null default 'manual' check (source in ('manual', 'import', 'api')),
  notes               text,
  row_fingerprint     text,
  source_import_id    uuid,
  last_import_id      uuid,
  created_by          uuid default auth.uid() references auth.users (id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  voided_at           timestamptz,
  unique (business_id, id),
  unique (business_id, ad_account_id, metric_date, campaign_name, adset_name, ad_name),
  foreign key (business_id, ad_account_id) references business_analysis.ad_accounts (business_id, id) on delete restrict
);
create index ad_campaign_metrics_date_idx on business_analysis.ad_campaign_metrics (business_id, metric_date) where voided_at is null;

-- =============================================================================
-- 9. Cash ledger
-- =============================================================================

-- Actual money in and out, dated by payment. System rows are created only by
-- the RPCs that own them (settlement payouts, expense and PO payments) and each
-- source record can own at most one cash row (unique link columns), so a
-- payout or payment can never be counted twice.
create table business_analysis.cash_transactions (
  id                        uuid primary key default gen_random_uuid(),
  business_id               uuid not null references business_analysis.business_profiles (id) on delete cascade,
  txn_date                  date not null,
  direction                 text not null check (direction in ('in', 'out')),
  txn_type                  text not null check (txn_type in
                              ('settlement_payout', 'expense_payment', 'expense_refund', 'purchase_payment',
                               'other_income', 'capital_injection', 'owner_withdrawal', 'loan_received',
                               'loan_repayment', 'other_inflow', 'other_outflow')),
  amount                    numeric(14,2) not null check (amount > 0),
  payment_account           text check (payment_account is null or char_length(payment_account) <= 100),
  external_reference        text,
  description               text,
  linked_settlement_id      uuid,
  linked_expense_id         uuid,
  linked_purchase_order_id  uuid,
  source                    text not null check (source in ('system', 'manual')),
  source_import_id          uuid,
  created_by                uuid references auth.users (id) on delete set null,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  voided_at                 timestamptz,
  void_reason               text,
  unique (business_id, id),
  foreign key (business_id, linked_settlement_id) references business_analysis.settlements (business_id, id) on delete restrict,
  foreign key (business_id, linked_expense_id) references business_analysis.expenses (business_id, id) on delete restrict,
  foreign key (business_id, linked_purchase_order_id) references business_analysis.purchase_orders (business_id, id) on delete restrict
);
create unique index cash_transactions_settlement_uidx on business_analysis.cash_transactions (linked_settlement_id)
  where linked_settlement_id is not null;
create unique index cash_transactions_expense_uidx on business_analysis.cash_transactions (linked_expense_id, txn_type)
  where linked_expense_id is not null;
create unique index cash_transactions_po_uidx on business_analysis.cash_transactions (linked_purchase_order_id)
  where linked_purchase_order_id is not null;
create index cash_transactions_date_idx on business_analysis.cash_transactions (business_id, txn_date) where voided_at is null;

-- =============================================================================
-- 10. Staged import rows and the audit log
-- =============================================================================

create table business_analysis.document_import_rows (
  id                 uuid primary key default gen_random_uuid(),
  business_id        uuid not null references business_analysis.business_profiles (id) on delete cascade,
  import_id          uuid not null,
  source_row_number  integer not null check (source_row_number > 0),
  raw                jsonb not null,
  normalized         jsonb,
  fingerprint        text,
  status             text not null check (status in
                       ('valid', 'invalid', 'duplicate_in_file', 'duplicate_existing', 'inserted', 'updated',
                        'unchanged', 'rejected', 'reverted', 'revert_skipped')),
  errors             jsonb not null default '[]'::jsonb,
  warnings           jsonb not null default '[]'::jsonb,
  target_table       text,
  target_id          uuid,
  previous_values    jsonb,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (import_id, source_row_number),
  foreign key (business_id, import_id) references business_analysis.document_imports (business_id, id) on delete cascade
);
create index document_import_rows_status_idx on business_analysis.document_import_rows (import_id, status, source_row_number);
create index document_import_rows_fingerprint_idx on business_analysis.document_import_rows (business_id, fingerprint);

create table business_analysis.audit_logs (
  id           bigint generated always as identity primary key,
  business_id  uuid references business_analysis.business_profiles (id) on delete cascade,
  user_id      uuid,
  action       text not null,
  entity       text not null,
  record_id    uuid,
  before       jsonb,
  after        jsonb,
  created_at   timestamptz not null default now()
);
create index audit_logs_business_idx on business_analysis.audit_logs (business_id, created_at desc);
create index audit_logs_record_idx on business_analysis.audit_logs (entity, record_id);

create function business_analysis.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_business uuid;
begin
  v_business := coalesce(
    (v_row ->> 'business_id')::uuid,
    case when tg_table_name = 'business_profiles' then (v_row ->> 'id')::uuid end);
  insert into business_analysis.audit_logs (business_id, user_id, action, entity, record_id, before, after)
  values (
    v_business,
    auth.uid(),
    lower(tg_op),
    tg_table_name,
    (v_row ->> 'id')::uuid,
    case when tg_op <> 'INSERT' then to_jsonb(old) end,
    case when tg_op <> 'DELETE' then to_jsonb(new) end);
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create function business_analysis.write_audit(
  p_business_id uuid, p_action text, p_entity text, p_record_id uuid, p_before jsonb, p_after jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into business_analysis.audit_logs (business_id, user_id, action, entity, record_id, before, after)
  values (p_business_id, auth.uid(), p_action, p_entity, p_record_id, p_before, p_after)
$$;

-- -----------------------------------------------------------------------------
-- Triggers: updated_at, audit, guards
-- -----------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'business_profiles', 'business_members', 'business_settings', 'document_imports', 'suppliers',
    'materials', 'material_cost_versions', 'products', 'product_recipes', 'product_recipe_items',
    'purchase_orders', 'sales_orders', 'sales_order_items', 'settlements', 'settlement_items',
    'expense_categories', 'expenses', 'ad_accounts', 'ad_campaign_metrics', 'cash_transactions',
    'document_import_rows']
  loop
    execute format(
      'create trigger %I before update on business_analysis.%I for each row execute function business_analysis.set_updated_at()',
      t || '_set_updated_at', t);
  end loop;

  -- Bulk import tables (order lines, settlement items, ad metrics, staged rows)
  -- are audited through document_imports/document_import_rows instead.
  foreach t in array array[
    'business_profiles', 'business_members', 'business_settings', 'document_imports', 'suppliers',
    'materials', 'material_cost_versions', 'products', 'product_recipes', 'product_recipe_items',
    'purchase_orders', 'settlements', 'expense_categories', 'expenses', 'ad_accounts',
    'cash_transactions', 'inventory_movements']
  loop
    execute format(
      'create trigger %I after insert or update or delete on business_analysis.%I for each row execute function business_analysis.audit_row_change()',
      t || '_audit', t);
  end loop;
end
$$;

create trigger product_recipe_items_guard
  before insert or update or delete on business_analysis.product_recipe_items
  for each row execute function business_analysis.guard_recipe_items();

create trigger product_recipes_guard
  before update on business_analysis.product_recipes
  for each row execute function business_analysis.guard_recipe_update();

-- =============================================================================
-- 11. Row Level Security
-- =============================================================================

-- Every table: RLS on. Read = member of the row's business at the given level.
-- Write policies exist only for tables the server writes directly.
create function business_analysis._apply_policies(
  p_table text, p_read text, p_insert text, p_update text, p_delete text)
returns void
language plpgsql
set search_path = ''
as $$
begin
  execute format('alter table business_analysis.%I enable row level security', p_table);
  execute format(
    'create policy %I on business_analysis.%I for select to authenticated using (business_id in (select business_analysis.member_business_ids(%L)))',
    p_table || '_select', p_table, p_read);
  execute format('grant select on business_analysis.%I to authenticated', p_table);
  if p_insert is not null then
    execute format(
      'create policy %I on business_analysis.%I for insert to authenticated with check (business_id in (select business_analysis.member_business_ids(%L)))',
      p_table || '_insert', p_table, p_insert);
    execute format('grant insert on business_analysis.%I to authenticated', p_table);
  end if;
  if p_update is not null then
    execute format(
      'create policy %I on business_analysis.%I for update to authenticated using (business_id in (select business_analysis.member_business_ids(%L))) with check (business_id in (select business_analysis.member_business_ids(%L)))',
      p_table || '_update', p_table, p_update, p_update);
    execute format('grant update on business_analysis.%I to authenticated', p_table);
  end if;
  if p_delete is not null then
    execute format(
      'create policy %I on business_analysis.%I for delete to authenticated using (business_id in (select business_analysis.member_business_ids(%L)))',
      p_table || '_delete', p_table, p_delete);
    execute format('grant delete on business_analysis.%I to authenticated', p_table);
  end if;
end;
$$;

--                                             table                          read      insert    update    delete
select business_analysis._apply_policies('business_members',            'viewer', null,     null,     null);
select business_analysis._apply_policies('business_settings',           'viewer', 'admin',  'admin',  null);
select business_analysis._apply_policies('document_imports',            'writer', 'writer', 'writer', null);
select business_analysis._apply_policies('document_import_rows',        'writer', 'writer', 'writer', null);
select business_analysis._apply_policies('suppliers',                   'viewer', 'writer', 'writer', null);
select business_analysis._apply_policies('materials',                   'viewer', 'writer', 'writer', null);
select business_analysis._apply_policies('material_cost_versions',      'viewer', 'writer', 'writer', null);
select business_analysis._apply_policies('products',                    'viewer', 'writer', 'writer', null);
select business_analysis._apply_policies('product_recipes',             'viewer', 'writer', 'writer', null);
select business_analysis._apply_policies('product_recipe_items',        'viewer', 'writer', 'writer', 'writer');
select business_analysis._apply_policies('purchase_orders',             'viewer', null,     null,     null);
select business_analysis._apply_policies('purchase_order_items',        'viewer', null,     null,     null);
select business_analysis._apply_policies('inventory_movements',         'viewer', null,     null,     null);
select business_analysis._apply_policies('sales_orders',                'viewer', null,     null,     null);
select business_analysis._apply_policies('sales_order_items',           'viewer', null,     null,     null);
select business_analysis._apply_policies('sales_order_status_history',  'viewer', null,     null,     null);
select business_analysis._apply_policies('settlements',                 'viewer', null,     null,     null);
select business_analysis._apply_policies('settlement_items',            'viewer', null,     null,     null);
select business_analysis._apply_policies('expense_categories',          'viewer', 'writer', 'writer', null);
select business_analysis._apply_policies('expenses',                    'viewer', null,     null,     null);
select business_analysis._apply_policies('ad_accounts',                 'viewer', 'writer', 'writer', null);
select business_analysis._apply_policies('ad_campaign_metrics',         'viewer', 'writer', 'writer', null);
select business_analysis._apply_policies('cash_transactions',           'viewer', null,     null,     null);
select business_analysis._apply_policies('audit_logs',                  'admin',  null,     null,     null);

drop function business_analysis._apply_policies(text, text, text, text, text);

-- business_profiles has no business_id column: its id *is* the business.
alter table business_analysis.business_profiles enable row level security;
create policy business_profiles_select on business_analysis.business_profiles
  for select to authenticated using (id in (select business_analysis.member_business_ids('viewer')));
create policy business_profiles_update on business_analysis.business_profiles
  for update to authenticated
  using (id in (select business_analysis.member_business_ids('admin')))
  with check (id in (select business_analysis.member_business_ids('admin')));
grant select on business_analysis.business_profiles to authenticated;
grant update (name, legal_name, gstin, timezone, financial_year_start_month) on business_analysis.business_profiles to authenticated;

-- Staged rows may be deleted only while their import has not been committed.
create policy document_import_rows_delete on business_analysis.document_import_rows
  for delete to authenticated
  using (
    business_id in (select business_analysis.member_business_ids('writer'))
    and exists (
      select 1 from business_analysis.document_imports i
       where i.id = import_id
         and i.status in ('staging', 'parsed', 'needs_review', 'failed', 'discarded')));
grant delete on business_analysis.document_import_rows to authenticated;

-- Ad metrics: clients may void a row but not rewrite an imported one's source.
-- (Column-level grants keep the insert/update surface explicit.)
revoke update on business_analysis.ad_campaign_metrics from authenticated;
grant update (metric_date, campaign_name, adset_name, ad_name, campaign_id, adset_id, ad_id, spend, impressions,
              reach, clicks, link_clicks, purchases, attributed_revenue, attribution_window, notes, voided_at)
  on business_analysis.ad_campaign_metrics to authenticated;

-- The service role (server-side admin tooling only) keeps full access.
grant all on all tables in schema business_analysis to service_role;

-- =============================================================================
-- 12. Read model: views and aggregation functions (SECURITY INVOKER → RLS)
-- =============================================================================

-- Settlement components rolled up per order line.
create view business_analysis.v_line_settlements
with (security_invoker = true) as
select si.business_id,
       si.order_item_id,
       count(*)                                                                           as item_count,
       count(*) filter (where si.transaction_type in ('sale', 'sale_return'))             as sale_components,
       count(*) filter (where si.transaction_type = 'unclassified')                       as unclassified_components,
       coalesce(sum(si.amount), 0)                                                        as settled_net,
       coalesce(sum(si.amount) filter (where si.transaction_type in ('sale', 'sale_return')), 0) as settled_sale,
       coalesce(sum(si.amount) filter (where si.transaction_type in ('commission', 'platform_fee')), 0) as platform_fees,
       coalesce(sum(si.amount) filter (where si.transaction_type = 'shipping_fee'), 0)    as shipping_fees,
       coalesce(sum(si.amount) filter (where si.transaction_type = 'return_shipping_fee'), 0) as return_fees,
       coalesce(sum(si.amount) filter (where si.transaction_type in ('penalty', 'recovery')), 0) as penalties,
       coalesce(sum(si.amount) filter (where si.transaction_type in ('claim', 'compensation')), 0) as claims,
       coalesce(sum(si.amount) filter (where si.transaction_type = 'adjustment'), 0)      as adjustments,
       coalesce(sum(si.amount) filter (where si.transaction_type = 'ads_fee'), 0)         as ads_fees,
       coalesce(sum(si.amount) filter (where si.transaction_type in ('tcs', 'tds')), 0)   as taxes_withheld,
       coalesce(sum(si.amount) filter (where si.transaction_type = 'unclassified'), 0)    as unclassified,
       max(coalesce(si.transaction_date, s.settlement_date))                              as last_settlement_date,
       count(distinct si.settlement_id)                                                   as settlement_count,
       (count(distinct (si.transaction_type, si.amount, si.settlement_id))
          > count(distinct (si.transaction_type, si.amount)))                            as duplicate_suspected
  from business_analysis.settlement_items si
  join business_analysis.settlements s on s.id = si.settlement_id
 where si.voided_at is null
   and s.voided_at is null
   and si.order_item_id is not null
 group by si.business_id, si.order_item_id;

-- Per-line contribution before advertising. Which statuses count as "sold"
-- and which as "produced but lost" comes from the accounting policy in the
-- application (domain/accounting-policy.ts) so the rule lives in one place.
create function business_analysis.line_contribution(
  p_status text, p_revenue_excl_gst numeric, p_line_cost numeric, p_deductions numeric,
  p_net_sold text[], p_loss text[], p_recovery_percent numeric)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select round(
    case
      when p_status = any (p_net_sold) then p_revenue_excl_gst - p_line_cost
      when p_status = any (p_loss) then - p_line_cost * (1 - coalesce(p_recovery_percent, 0) / 100.0)
      else 0
    end + coalesce(p_deductions, 0), 2)
$$;

-- Settlement-vs-expectation status of an order line.
create function business_analysis.recon_status(
  p_expected numeric, p_item_count bigint, p_sale_components bigint, p_settled_sale numeric,
  p_settled_net numeric, p_tolerance numeric, p_duplicate boolean)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when coalesce(p_duplicate, false) then 'duplicate_suspected'
    when coalesce(p_item_count, 0) = 0 and p_expected > 0 then 'unsettled'
    when coalesce(p_item_count, 0) = 0 then 'not_due'
    when coalesce(p_sale_components, 0) = 0 and p_expected > 0 then 'net_only'
    when p_expected = 0 and p_settled_net < 0 then 'charges_only'
    when abs(coalesce(p_settled_sale, 0) - p_expected) <= p_tolerance then 'matched'
    when coalesce(p_settled_sale, 0) < p_expected then 'partial'
    else 'over_settled'
  end
$$;

create function business_analysis.order_daily_metrics(
  p_business_id      uuid,
  p_from             date,
  p_to               date,
  p_date_basis       text default 'order_date',
  p_channel          text default null,
  p_sku              text default null,
  p_statuses         text[] default null,
  p_settlement_state text default null)
returns table (
  day                   date,
  status                text,
  lines                 bigint,
  orders                bigint,
  units                 bigint,
  listed_amount         numeric,
  sale_amount           numeric,
  sale_amount_excl_gst  numeric,
  material_cost         numeric,
  packaging_cost        numeric,
  other_cost            numeric,
  line_cost             numeric,
  missing_cost_lines    bigint,
  actual_cost_lines     bigint)
language sql
stable
set search_path = ''
as $$
  select x.day, x.status, count(*), count(distinct x.order_id), sum(x.quantity)::bigint,
         sum(x.listed_amount), sum(x.sale_amount), sum(x.sale_amount_excl_gst),
         sum(x.material_cost_total), sum(x.packaging_cost_total), sum(x.other_cost_total), sum(x.line_cost),
         count(*) filter (where x.cost_basis = 'missing'),
         count(*) filter (where x.cost_basis = 'actual')
    from (
      select i.*,
             case when p_date_basis = 'recognition_date' then coalesce(i.delivered_on, i.order_date)
                  else i.order_date end as day
        from business_analysis.sales_order_items i
       where i.business_id = p_business_id
         and i.voided_at is null
         and (p_channel is null or i.channel = p_channel)
         and (p_sku is null or i.sku_normalized = upper(btrim(p_sku)))
         and (p_statuses is null or i.status = any (p_statuses))
         and (p_settlement_state is null
              or (p_settlement_state = 'settled' and exists (
                    select 1 from business_analysis.settlement_items si
                     where si.order_item_id = i.id and si.voided_at is null))
              or (p_settlement_state = 'unsettled' and not exists (
                    select 1 from business_analysis.settlement_items si
                     where si.order_item_id = i.id and si.voided_at is null)))
    ) x
   where x.day between p_from and p_to
   group by x.day, x.status
$$;

-- Settlement components by day. With p_date_basis = 'order_date', components
-- linked to an order line are dated by that order (matching costs to the
-- revenue they belong to); unlinked ones fall back to their own date.
create function business_analysis.settlement_daily_metrics(
  p_business_id  uuid,
  p_from         date,
  p_to           date,
  p_date_basis   text default 'order_date',
  p_channel      text default null,
  p_sku          text default null,
  p_statuses     text[] default null)
returns table (
  day               date,
  transaction_type  text,
  amount            numeric,
  items             bigint,
  linked_items      bigint)
language sql
stable
set search_path = ''
as $$
  select x.day, x.transaction_type, sum(x.amount), count(*), count(x.order_item_id)
    from (
      select si.transaction_type, si.amount, si.order_item_id,
             case when p_date_basis = 'order_date' and oi.id is not null then oi.order_date
                  else coalesce(si.transaction_date, s.settlement_date) end as day
        from business_analysis.settlement_items si
        join business_analysis.settlements s on s.id = si.settlement_id
        left join business_analysis.sales_order_items oi
               on oi.id = si.order_item_id and oi.voided_at is null
       where si.business_id = p_business_id
         and si.voided_at is null
         and s.voided_at is null
         and ((p_channel is null and p_sku is null and p_statuses is null) or oi.id is not null)
         and (p_channel is null or oi.channel = p_channel)
         and (p_sku is null or oi.sku_normalized = upper(btrim(p_sku)))
         and (p_statuses is null or oi.status = any (p_statuses))
    ) x
   where x.day between p_from and p_to
   group by x.day, x.transaction_type
$$;

create function business_analysis.expense_daily_metrics(p_business_id uuid, p_from date, p_to date)
returns table (
  day                      date,
  category_id              uuid,
  category_slug            text,
  category_name            text,
  treatment                text,
  reflected_in_settlement  boolean,
  amount                   numeric,
  recoverable_tax          numeric,
  entries                  bigint)
language sql
stable
set search_path = ''
as $$
  select e.expense_date, c.id, c.slug, c.name, c.treatment, e.reflected_in_settlement,
         sum(e.amount),
         sum(case when e.tax_treatment = 'gst_itc_eligible' then e.tax_amount else 0 end),
         count(*)
    from business_analysis.expenses e
    join business_analysis.expense_categories c on c.id = e.category_id
   where e.business_id = p_business_id
     and not e.is_recurring_template
     and e.expense_date between p_from and p_to
   group by e.expense_date, c.id, c.slug, c.name, c.treatment, e.reflected_in_settlement
$$;

create function business_analysis.ad_daily_metrics(p_business_id uuid, p_from date, p_to date)
returns table (
  day                 date,
  ad_account_id       uuid,
  platform            text,
  spend               numeric,
  impressions         bigint,
  reach               bigint,
  clicks              bigint,
  link_clicks         bigint,
  purchases           numeric,
  attributed_revenue  numeric)
language sql
stable
set search_path = ''
as $$
  select m.metric_date, m.ad_account_id, a.platform, sum(m.spend), sum(m.impressions)::bigint,
         sum(m.reach)::bigint, sum(m.clicks)::bigint, sum(m.link_clicks)::bigint,
         sum(m.purchases), sum(m.attributed_revenue)
    from business_analysis.ad_campaign_metrics m
    join business_analysis.ad_accounts a on a.id = m.ad_account_id
   where m.business_id = p_business_id
     and m.voided_at is null
     and m.metric_date between p_from and p_to
   group by m.metric_date, m.ad_account_id, a.platform
$$;

create function business_analysis.cash_daily_metrics(p_business_id uuid, p_from date, p_to date)
returns table (day date, direction text, txn_type text, amount numeric, entries bigint)
language sql
stable
set search_path = ''
as $$
  select c.txn_date, c.direction, c.txn_type, sum(c.amount), count(*)
    from business_analysis.cash_transactions c
   where c.business_id = p_business_id
     and c.voided_at is null
     and c.txn_date between p_from and p_to
   group by c.txn_date, c.direction, c.txn_type
$$;

-- Line deductions that belong in contribution: platform fees, shipping,
-- returns, penalties, claims and adjustments. Excluded: the sale itself
-- (revenue comes from orders), TCS/TDS (tax credits, not costs), ads
-- (advertising is below contribution) and unclassified net-only amounts.
create function business_analysis.sku_profitability(
  p_business_id       uuid,
  p_from              date,
  p_to                date,
  p_net_sold          text[],
  p_loss              text[],
  p_recovery_percent  numeric default 0,
  p_date_basis        text default 'order_date',
  p_channel           text default null)
returns table (
  sku                text,
  product_id         uuid,
  product_name       text,
  lines              bigint,
  units              bigint,
  net_sold_lines     bigint,
  loss_lines         bigint,
  net_sales          numeric,
  cogs               numeric,
  loss_cost          numeric,
  deductions         numeric,
  contribution       numeric,
  missing_cost_lines bigint)
language sql
stable
set search_path = ''
as $$
  select coalesce(i.sku_normalized, '(no sku)'),
         (array_agg(i.product_id) filter (where i.product_id is not null))[1],
         coalesce(max(p.name), max(i.product_name)),
         count(*),
         sum(i.quantity)::bigint,
         count(*) filter (where i.status = any (p_net_sold)),
         count(*) filter (where i.status = any (p_loss)),
         coalesce(sum(i.sale_amount_excl_gst) filter (where i.status = any (p_net_sold)), 0),
         coalesce(sum(i.line_cost) filter (where i.status = any (p_net_sold)), 0),
         round(coalesce(sum(i.line_cost) filter (where i.status = any (p_loss)), 0)
               * (1 - coalesce(p_recovery_percent, 0) / 100.0), 2),
         coalesce(sum(ls.platform_fees + ls.shipping_fees + ls.return_fees + ls.penalties + ls.claims + ls.adjustments), 0),
         coalesce(sum(business_analysis.line_contribution(
                    i.status, i.sale_amount_excl_gst, i.line_cost,
                    coalesce(ls.platform_fees + ls.shipping_fees + ls.return_fees + ls.penalties + ls.claims + ls.adjustments, 0),
                    p_net_sold, p_loss, p_recovery_percent)), 0),
         count(*) filter (where i.cost_basis = 'missing' and (i.status = any (p_net_sold) or i.status = any (p_loss)))
    from business_analysis.sales_order_items i
    left join business_analysis.products p on p.id = i.product_id
    left join business_analysis.v_line_settlements ls on ls.order_item_id = i.id
   where i.business_id = p_business_id
     and i.voided_at is null
     and (case when p_date_basis = 'recognition_date' then coalesce(i.delivered_on, i.order_date) else i.order_date end)
         between p_from and p_to
     and (p_channel is null or i.channel = p_channel)
   group by coalesce(i.sku_normalized, '(no sku)')
$$;

-- Paginated, filterable order-line ledger with economics and settlement state.
create function business_analysis.order_lines_page(
  p_business_id       uuid,
  p_from              date,
  p_to                date,
  p_net_sold          text[],
  p_loss              text[],
  p_expected          text[],
  p_recovery_percent  numeric default 0,
  p_tolerance         numeric default 1,
  p_channel           text default null,
  p_sku               text default null,
  p_statuses          text[] default null,
  p_settlement_status text default null,
  p_profitability     text default null,
  p_search            text default null,
  p_sort              text default 'order_date',
  p_desc              boolean default true,
  p_limit             integer default 50,
  p_offset            integer default 0)
returns table (
  id                    uuid,
  order_id              uuid,
  external_order_id     text,
  external_line_id      text,
  order_date            date,
  channel               text,
  product_id            uuid,
  product_name          text,
  sku                   text,
  quantity              integer,
  status                text,
  raw_status            text,
  listed_amount         numeric,
  sale_amount           numeric,
  sale_amount_excl_gst  numeric,
  gst_rate              numeric,
  material_cost         numeric,
  packaging_cost        numeric,
  other_cost            numeric,
  line_cost             numeric,
  cost_basis            text,
  platform_fees         numeric,
  shipping_fees         numeric,
  return_fees           numeric,
  other_deductions      numeric,
  settled_sale          numeric,
  settled_net           numeric,
  expected_settlement   numeric,
  settlement_status     text,
  contribution          numeric,
  updated_at            timestamptz,
  total_count           bigint)
language sql
stable
set search_path = ''
as $$
  with lines as (
    select i.id, i.order_id, o.external_order_id, i.external_line_id, i.order_date, i.channel, i.product_id,
           coalesce(p.name, i.product_name) as product_name, i.sku, i.quantity, i.status, i.raw_status,
           i.listed_amount, i.sale_amount, i.sale_amount_excl_gst, i.gst_rate,
           i.material_cost_total, i.packaging_cost_total, i.other_cost_total, i.line_cost, i.cost_basis,
           coalesce(ls.platform_fees, 0) as platform_fees,
           coalesce(ls.shipping_fees, 0) as shipping_fees,
           coalesce(ls.return_fees, 0) as return_fees,
           coalesce(ls.penalties + ls.claims + ls.adjustments, 0) as other_deductions,
           coalesce(ls.settled_sale, 0) as settled_sale,
           coalesce(ls.settled_net, 0) as settled_net,
           case when i.status = any (p_expected) then i.sale_amount else 0 end as expected_settlement,
           business_analysis.recon_status(
             case when i.status = any (p_expected) then i.sale_amount else 0 end,
             ls.item_count, ls.sale_components, ls.settled_sale, ls.settled_net, p_tolerance,
             ls.duplicate_suspected) as settlement_status,
           business_analysis.line_contribution(
             i.status, i.sale_amount_excl_gst, i.line_cost,
             coalesce(ls.platform_fees + ls.shipping_fees + ls.return_fees + ls.penalties + ls.claims + ls.adjustments, 0),
             p_net_sold, p_loss, p_recovery_percent) as contribution,
           i.updated_at
      from business_analysis.sales_order_items i
      join business_analysis.sales_orders o on o.id = i.order_id
      left join business_analysis.products p on p.id = i.product_id
      left join business_analysis.v_line_settlements ls on ls.order_item_id = i.id
     where i.business_id = p_business_id
       and i.voided_at is null
       and i.order_date between p_from and p_to
       and (p_channel is null or i.channel = p_channel)
       and (p_sku is null or i.sku_normalized = upper(btrim(p_sku)))
       and (p_statuses is null or i.status = any (p_statuses))
       and (p_search is null
            or i.external_line_id ilike '%' || p_search || '%'
            or o.external_order_id ilike '%' || p_search || '%'
            or i.packet_id ilike '%' || p_search || '%')
  )
  select l.*, count(*) over () as total_count
    from lines l
   where (p_settlement_status is null or l.settlement_status = p_settlement_status)
     and (p_profitability is null
          or (p_profitability = 'profitable' and l.contribution > 0)
          or (p_profitability = 'loss' and l.contribution < 0)
          or (p_profitability = 'breakeven' and l.contribution = 0))
   order by
     case when p_sort = 'order_date' and not p_desc then l.order_date end asc,
     case when p_sort = 'order_date' and p_desc then l.order_date end desc,
     case when p_sort = 'sale_amount' and not p_desc then l.sale_amount end asc,
     case when p_sort = 'sale_amount' and p_desc then l.sale_amount end desc,
     case when p_sort = 'contribution' and not p_desc then l.contribution end asc,
     case when p_sort = 'contribution' and p_desc then l.contribution end desc,
     case when p_sort = 'sku' and not p_desc then l.sku end asc,
     case when p_sort = 'sku' and p_desc then l.sku end desc,
     case when p_sort = 'status' and not p_desc then l.status end asc,
     case when p_sort = 'status' and p_desc then l.status end desc,
     case when p_sort = 'updated_at' and not p_desc then l.updated_at end asc,
     case when p_sort = 'updated_at' and p_desc then l.updated_at end desc,
     l.external_line_id
   limit greatest(1, least(coalesce(p_limit, 50), 500))
  offset greatest(0, coalesce(p_offset, 0))
$$;

-- Reconciliation totals for order lines dated in the range, plus settlement
-- items that could not be linked to any order line.
create function business_analysis.reconciliation_summary(
  p_business_id uuid, p_from date, p_to date, p_expected text[], p_tolerance numeric default 1)
returns table (
  settlement_status  text,
  lines              bigint,
  expected_amount    numeric,
  settled_sale       numeric,
  settled_net        numeric,
  deductions         numeric,
  taxes_withheld     numeric,
  outstanding        numeric)
language sql
stable
set search_path = ''
as $$
  with l as (
    select business_analysis.recon_status(
             case when i.status = any (p_expected) then i.sale_amount else 0 end,
             ls.item_count, ls.sale_components, ls.settled_sale, ls.settled_net, p_tolerance,
             ls.duplicate_suspected) as settlement_status,
           case when i.status = any (p_expected) then i.sale_amount else 0 end as expected_amount,
           coalesce(ls.settled_sale, 0) as settled_sale,
           coalesce(ls.settled_net, 0) as settled_net,
           coalesce(ls.platform_fees + ls.shipping_fees + ls.return_fees + ls.penalties + ls.claims
                    + ls.adjustments + ls.ads_fees, 0) as deductions,
           coalesce(ls.taxes_withheld, 0) as taxes_withheld
      from business_analysis.sales_order_items i
      left join business_analysis.v_line_settlements ls on ls.order_item_id = i.id
     where i.business_id = p_business_id
       and i.voided_at is null
       and i.order_date between p_from and p_to
  )
  select settlement_status, count(*), sum(expected_amount), sum(settled_sale), sum(settled_net),
         sum(deductions), sum(taxes_withheld),
         sum(case when settlement_status in ('unsettled', 'partial') then greatest(expected_amount - settled_sale, 0)
                  else 0 end)
    from l
   group by settlement_status
  union all
  select 'unlinked_settlement_items', count(*), 0, coalesce(sum(si.amount) filter (where si.transaction_type in ('sale', 'sale_return')), 0),
         coalesce(sum(si.amount), 0), 0, 0, 0
    from business_analysis.settlement_items si
    join business_analysis.settlements s on s.id = si.settlement_id
   where si.business_id = p_business_id
     and si.voided_at is null
     and s.voided_at is null
     and si.order_item_id is null
     and coalesce(si.transaction_date, s.settlement_date) between p_from and p_to
$$;

create function business_analysis.reconciliation_lines(
  p_business_id uuid, p_from date, p_to date, p_expected text[], p_tolerance numeric default 1,
  p_status text default null, p_search text default null, p_limit integer default 50, p_offset integer default 0)
returns table (
  order_item_id         uuid,
  external_line_id      text,
  external_order_id     text,
  order_date            date,
  sku                   text,
  status                text,
  expected_amount       numeric,
  settled_sale          numeric,
  settled_net           numeric,
  deductions            numeric,
  taxes_withheld        numeric,
  difference            numeric,
  settlement_count      bigint,
  last_settlement_date  date,
  settlement_status     text,
  total_count           bigint)
language sql
stable
set search_path = ''
as $$
  with l as (
    select i.id as order_item_id, i.external_line_id, o.external_order_id, i.order_date, i.sku, i.status,
           case when i.status = any (p_expected) then i.sale_amount else 0 end as expected_amount,
           coalesce(ls.settled_sale, 0) as settled_sale,
           coalesce(ls.settled_net, 0) as settled_net,
           coalesce(ls.platform_fees + ls.shipping_fees + ls.return_fees + ls.penalties + ls.claims
                    + ls.adjustments + ls.ads_fees, 0) as deductions,
           coalesce(ls.taxes_withheld, 0) as taxes_withheld,
           coalesce(ls.settlement_count, 0) as settlement_count,
           ls.last_settlement_date,
           business_analysis.recon_status(
             case when i.status = any (p_expected) then i.sale_amount else 0 end,
             ls.item_count, ls.sale_components, ls.settled_sale, ls.settled_net, p_tolerance,
             ls.duplicate_suspected) as settlement_status
      from business_analysis.sales_order_items i
      join business_analysis.sales_orders o on o.id = i.order_id
      left join business_analysis.v_line_settlements ls on ls.order_item_id = i.id
     where i.business_id = p_business_id
       and i.voided_at is null
       and i.order_date between p_from and p_to
       and (p_search is null or i.external_line_id ilike '%' || p_search || '%'
            or o.external_order_id ilike '%' || p_search || '%')
  )
  select l.order_item_id, l.external_line_id, l.external_order_id, l.order_date, l.sku, l.status,
         l.expected_amount, l.settled_sale, l.settled_net, l.deductions, l.taxes_withheld,
         l.settled_sale - l.expected_amount, l.settlement_count, l.last_settlement_date, l.settlement_status,
         count(*) over ()
    from l
   where (p_status is null or l.settlement_status = p_status)
   order by l.order_date desc, l.external_line_id
   limit greatest(1, least(coalesce(p_limit, 50), 500))
  offset greatest(0, coalesce(p_offset, 0))
$$;

-- Units of each product that left the building (for the estimated-stock view
-- when production runs are not recorded).
create function business_analysis.shipped_units_by_product(
  p_business_id uuid, p_from date, p_to date, p_statuses text[])
returns table (product_id uuid, units bigint)
language sql
stable
set search_path = ''
as $$
  select i.product_id, sum(i.quantity)::bigint
    from business_analysis.sales_order_items i
   where i.business_id = p_business_id
     and i.voided_at is null
     and i.product_id is not null
     and i.order_date between p_from and p_to
     and i.status = any (p_statuses)
   group by i.product_id
$$;

create function business_analysis.ad_campaign_summary(p_business_id uuid, p_from date, p_to date)
returns table (
  ad_account_id       uuid,
  campaign_name       text,
  days                bigint,
  spend               numeric,
  impressions         bigint,
  reach               bigint,
  clicks              bigint,
  link_clicks         bigint,
  purchases           numeric,
  attributed_revenue  numeric)
language sql
stable
set search_path = ''
as $$
  select m.ad_account_id, m.campaign_name, count(distinct m.metric_date), sum(m.spend), sum(m.impressions)::bigint,
         sum(m.reach)::bigint, sum(m.clicks)::bigint, sum(m.link_clicks)::bigint, sum(m.purchases), sum(m.attributed_revenue)
    from business_analysis.ad_campaign_metrics m
   where m.business_id = p_business_id
     and m.voided_at is null
     and m.metric_date between p_from and p_to
   group by m.ad_account_id, m.campaign_name
$$;

-- =============================================================================
-- 13. Write RPCs (SECURITY DEFINER, explicit authorization, one transaction)
-- =============================================================================

-- ---- Business bootstrap and members ------------------------------------------

create function business_analysis.bootstrap_business(
  p_name text, p_timezone text default 'Asia/Kolkata', p_settings jsonb default '{}'::jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_business uuid;
  v_email text;
begin
  if v_uid is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  if exists (select 1 from business_analysis.business_members m where m.user_id = v_uid and m.is_active) then
    raise exception 'this account already belongs to a business' using errcode = '23505';
  end if;
  if p_settings is null or jsonb_typeof(p_settings) <> 'object' then
    raise exception 'settings must be a JSON object' using errcode = '22023';
  end if;

  select u.email into v_email from auth.users u where u.id = v_uid;

  insert into business_analysis.business_profiles (name, timezone, created_by)
  values (btrim(p_name), coalesce(nullif(btrim(p_timezone), ''), 'Asia/Kolkata'), v_uid)
  returning id into v_business;

  insert into business_analysis.business_members (business_id, user_id, email, role)
  values (v_business, v_uid, v_email, 'owner');

  -- The first settings version applies to all history.
  insert into business_analysis.business_settings (business_id, effective_from, settings, note, created_by)
  values (v_business, date '2000-01-01', p_settings, 'Initial settings', v_uid);

  insert into business_analysis.expense_categories (business_id, slug, name, treatment, is_system) values
    (v_business, 'raw_materials', 'Raw materials',                 'inventory_purchase', true),
    (v_business, 'packaging',     'Packaging',                     'inventory_purchase', true),
    (v_business, 'printing',      'Printing',                      'inventory_purchase', true),
    (v_business, 'advertising',   'Advertising',                   'advertising',        true),
    (v_business, 'shipping',      'Shipping',                      'variable_selling',   true),
    (v_business, 'platform_fees', 'Platform fees',                 'variable_selling',   true),
    (v_business, 'returns_rto',   'Return/RTO costs',              'variable_selling',   true),
    (v_business, 'salaries',      'Salaries',                      'operating',          true),
    (v_business, 'software',      'Software subscriptions',        'operating',          true),
    (v_business, 'rent',          'Rent',                          'operating',          true),
    (v_business, 'utilities',     'Utilities',                     'operating',          true),
    (v_business, 'equipment',     'Equipment',                     'capital',            true),
    (v_business, 'miscellaneous', 'Miscellaneous',                 'operating',          true),
    (v_business, 'finance_costs', 'Interest and bank charges',     'finance_cost',       true),
    (v_business, 'income_tax',    'Income tax',                    'income_tax',         true);

  insert into business_analysis.ad_accounts (business_id, platform, name, external_account_id)
  values (v_business, 'meta', 'Meta Ads', 'default');

  return v_business;
end;
$$;

create function business_analysis.add_member_by_email(p_business_id uuid, p_email text, p_role text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
  v_member uuid;
begin
  perform business_analysis.assert_role(p_business_id, 'owner');
  if p_role not in ('admin', 'accountant', 'viewer') then
    raise exception 'role must be admin, accountant or viewer' using errcode = '22023';
  end if;

  select u.id into v_user from auth.users u where lower(u.email) = lower(btrim(p_email));
  if v_user is null then
    raise exception 'no Supabase Auth user with that email; create the user first' using errcode = 'P0002';
  end if;

  insert into business_analysis.business_members (business_id, user_id, email, role, is_active)
  values (p_business_id, v_user, lower(btrim(p_email)), p_role, true)
  on conflict (business_id, user_id) do update
    set role = excluded.role, is_active = true, email = excluded.email
  returning id into v_member;
  return v_member;
end;
$$;

create function business_analysis.update_member(p_member_id uuid, p_role text, p_is_active boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member business_analysis.business_members;
begin
  select * into v_member from business_analysis.business_members where id = p_member_id;
  if not found then
    raise exception 'member not found' using errcode = 'P0002';
  end if;
  perform business_analysis.assert_role(v_member.business_id, 'owner');
  if v_member.user_id = auth.uid() then
    raise exception 'owners cannot change their own membership' using errcode = '42501';
  end if;
  if p_role not in ('admin', 'accountant', 'viewer') then
    raise exception 'role must be admin, accountant or viewer' using errcode = '22023';
  end if;
  update business_analysis.business_members
     set role = p_role, is_active = p_is_active
   where id = p_member_id;
end;
$$;

-- ---- Order costing -----------------------------------------------------------

-- GST rate snapshot for a line: product rate → business default → 0 for
-- unregistered sellers → 0 flagged 'unconfigured'.
create function business_analysis._resolve_gst(p_business_id uuid, p_product_gst numeric, p_on date)
returns table (rate numeric, source text)
language plpgsql
stable
set search_path = ''
as $$
declare
  v_settings jsonb := business_analysis.settings_at(p_business_id, p_on);
  v_registered boolean := (v_settings -> 'gst' ->> 'registered')::boolean;
  v_default numeric := (v_settings -> 'gst' ->> 'defaultRatePercent')::numeric;
begin
  if v_registered is false then
    return query select 0::numeric, 'unregistered'::text;
  elsif p_product_gst is not null then
    return query select p_product_gst, 'product'::text;
  elsif v_registered is true and v_default is not null then
    return query select v_default, 'default'::text;
  else
    return query select 0::numeric, 'unconfigured'::text;
  end if;
end;
$$;

-- Snapshot the recipe cost (as of the order date) onto a line. Never touches
-- a line whose cost was recorded as actual.
create function business_analysis._apply_cost_snapshot(p_business_id uuid, p_item_id uuid)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_item business_analysis.sales_order_items;
  v_product_id uuid;
  v_product_gst numeric;
  v_gst_rate numeric;
  v_gst_source text;
  v_recipe uuid;
  v_material numeric;
  v_packaging numeric;
  v_other numeric;
  v_missing integer;
  v_components integer := 0;
begin
  select * into v_item from business_analysis.sales_order_items
   where id = p_item_id and business_id = p_business_id
   for update;
  if not found then
    return 'missing';
  end if;
  if v_item.cost_basis = 'actual' then
    return 'actual';
  end if;

  v_product_id := v_item.product_id;
  if v_product_id is null and v_item.sku_normalized is not null then
    select p.id into v_product_id from business_analysis.products p
     where p.business_id = p_business_id and p.sku_normalized = v_item.sku_normalized;
  end if;
  select p.gst_rate into v_product_gst from business_analysis.products p where p.id = v_product_id;

  -- A manually set GST rate is never overwritten.
  if v_item.gst_rate_source = 'manual' then
    v_gst_rate := v_item.gst_rate;
    v_gst_source := 'manual';
  else
    select g.rate, g.source into v_gst_rate, v_gst_source
      from business_analysis._resolve_gst(p_business_id, v_product_gst, v_item.order_date) g;
  end if;

  if v_product_id is not null then
    select c.recipe_id, c.material_cost, c.packaging_cost, c.other_cost, c.missing_components, c.component_count
      into v_recipe, v_material, v_packaging, v_other, v_missing, v_components
      from business_analysis.recipe_unit_cost(p_business_id, v_product_id, v_item.order_date) c;
  end if;

  if v_recipe is null or coalesce(v_missing, 0) > 0 or coalesce(v_components, 0) = 0 then
    update business_analysis.sales_order_items
       set product_id = v_product_id,
           cost_basis = 'missing',
           recipe_id = null,
           material_unit_cost = null, packaging_unit_cost = null, other_unit_cost = null,
           cost_snapshot_at = clock_timestamp(),
           gst_rate = v_gst_rate,
           gst_rate_source = v_gst_source
     where id = p_item_id;
    return 'missing';
  end if;

  update business_analysis.sales_order_items
     set product_id = v_product_id,
         cost_basis = 'estimated',
         recipe_id = v_recipe,
         material_unit_cost = v_material,
         packaging_unit_cost = v_packaging,
         other_unit_cost = v_other,
         cost_snapshot_at = clock_timestamp(),
         gst_rate = v_gst_rate,
         gst_rate_source = v_gst_source
   where id = p_item_id;
  return 'estimated';
end;
$$;

-- Explicit, user-triggered re-costing. 'missing_only' fills lines that had no
-- recipe when imported; 'all_estimates' re-snapshots every estimated line in
-- the range (use after correcting a recipe). Actual costs are never touched.
-- Call repeatedly with the same p_run_started_at until remaining = 0: a line
-- visited in this run is stamped after the run start and not visited again,
-- so the loop always terminates even when some lines stay "missing".
create function business_analysis.refresh_order_costs(
  p_business_id uuid, p_from date, p_to date, p_mode text, p_run_started_at timestamptz,
  p_limit integer default 2000)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_result text;
  v_done integer := 0;
  v_estimated integer := 0;
  v_remaining integer;
begin
  perform business_analysis.assert_role(p_business_id, 'writer');
  if p_mode not in ('missing_only', 'all_estimates') then
    raise exception 'mode must be missing_only or all_estimates' using errcode = '22023';
  end if;
  if p_run_started_at is null or p_run_started_at > clock_timestamp() then
    raise exception 'run start must be a past timestamp' using errcode = '22023';
  end if;

  for v_id in
    select i.id from business_analysis.sales_order_items i
     where i.business_id = p_business_id
       and i.voided_at is null
       and i.order_date between p_from and p_to
       and i.cost_basis <> 'actual'
       and (p_mode = 'all_estimates' or i.cost_basis = 'missing')
       and (i.cost_snapshot_at is null or i.cost_snapshot_at < p_run_started_at)
     order by i.order_date, i.id
     limit greatest(1, least(coalesce(p_limit, 2000), 5000))
  loop
    v_result := business_analysis._apply_cost_snapshot(p_business_id, v_id);
    v_done := v_done + 1;
    if v_result = 'estimated' then
      v_estimated := v_estimated + 1;
    end if;
  end loop;

  select count(*) into v_remaining from business_analysis.sales_order_items i
   where i.business_id = p_business_id
     and i.voided_at is null
     and i.order_date between p_from and p_to
     and i.cost_basis <> 'actual'
     and (p_mode = 'all_estimates' or i.cost_basis = 'missing')
     and (i.cost_snapshot_at is null or i.cost_snapshot_at < p_run_started_at);

  if v_done > 0 then
    perform business_analysis.write_audit(p_business_id, 'refresh_costs', 'sales_order_items', null, null,
      jsonb_build_object('from', p_from, 'to', p_to, 'mode', p_mode, 'processed', v_done, 'estimated', v_estimated));
  end if;

  return jsonb_build_object('processed', v_done, 'estimated', v_estimated, 'remaining', v_remaining);
end;
$$;

-- ---- Orders: manual entry and edits ------------------------------------------

create function business_analysis.create_manual_order(p_business_id uuid, p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order uuid;
  v_item uuid;
  v_channel text := p_payload ->> 'channel';
  v_order_no text := coalesce(nullif(btrim(p_payload ->> 'external_order_id'), ''),
                              'MAN-' || to_char(now(), 'YYYYMMDDHH24MISS') || '-' || substr(gen_random_uuid()::text, 1, 6));
  v_qty integer := (p_payload ->> 'quantity')::integer;
  v_unit numeric := (p_payload ->> 'unit_price')::numeric;
  v_listed numeric := coalesce((p_payload ->> 'listed_unit_price')::numeric, (p_payload ->> 'unit_price')::numeric);
  v_status text := coalesce(p_payload ->> 'status', 'pending');
  v_date date := (p_payload ->> 'order_date')::date;
begin
  perform business_analysis.assert_role(p_business_id, 'writer');
  if v_channel not in ('direct', 'whatsapp', 'other', 'meesho') then
    raise exception 'invalid channel' using errcode = '22023';
  end if;
  if v_qty is null or v_qty <= 0 or v_unit is null or v_unit < 0 or v_date is null then
    raise exception 'quantity, unit_price and order_date are required' using errcode = '22023';
  end if;

  insert into business_analysis.sales_orders (business_id, channel, external_order_id, order_date, customer_state, notes, created_by)
  values (p_business_id, v_channel, v_order_no, v_date, p_payload ->> 'customer_state', p_payload ->> 'notes', auth.uid())
  returning id into v_order;

  insert into business_analysis.sales_order_items (
    business_id, order_id, channel, external_line_id, sku, product_name, quantity, status, raw_status,
    order_date, delivered_on, source_listed_price, source_discounted_price, price_basis, listed_amount, sale_amount)
  values (
    p_business_id, v_order, v_channel, v_order_no || '_1', nullif(btrim(p_payload ->> 'sku'), ''),
    p_payload ->> 'product_name', v_qty, v_status, 'MANUAL', v_date, (p_payload ->> 'delivered_on')::date,
    v_listed, v_unit, 'per_unit', round(v_listed * v_qty, 2), round(v_unit * v_qty, 2))
  returning id into v_item;

  insert into business_analysis.sales_order_status_history (business_id, order_item_id, previous_status, new_status, source, changed_by, note)
  values (p_business_id, v_item, null, v_status, 'manual', auth.uid(), 'Created manually');

  perform business_analysis._apply_cost_snapshot(p_business_id, v_item);
  perform business_analysis.write_audit(p_business_id, 'insert', 'sales_order_items', v_item, null,
    (select to_jsonb(i) from business_analysis.sales_order_items i where i.id = v_item));
  return v_item;
end;
$$;

create function business_analysis.update_order_item(p_item_id uuid, p_payload jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item business_analysis.sales_order_items;
  v_new_status text := p_payload ->> 'status';
begin
  select * into v_item from business_analysis.sales_order_items where id = p_item_id for update;
  if not found then
    raise exception 'order line not found' using errcode = 'P0002';
  end if;
  perform business_analysis.assert_role(v_item.business_id, 'writer');

  if v_new_status is not null and v_new_status is distinct from v_item.status then
    update business_analysis.sales_order_items
       set status = v_new_status, status_changed_at = now(),
           delivered_on = case when v_new_status = 'delivered' then coalesce((p_payload ->> 'delivered_on')::date, delivered_on, current_date)
                               else delivered_on end
     where id = p_item_id;
    insert into business_analysis.sales_order_status_history
      (business_id, order_item_id, previous_status, new_status, source, changed_by, note)
    values (v_item.business_id, p_item_id, v_item.status, v_new_status, 'manual', auth.uid(), p_payload ->> 'note');
  end if;

  if p_payload ? 'actual_unit_cost' then
    if p_payload -> 'actual_unit_cost' = 'null'::jsonb then
      update business_analysis.sales_order_items
         set actual_unit_cost = null, cost_basis = 'missing'
       where id = p_item_id;
      perform business_analysis._apply_cost_snapshot(v_item.business_id, p_item_id);
    else
      update business_analysis.sales_order_items
         set actual_unit_cost = (p_payload ->> 'actual_unit_cost')::numeric, cost_basis = 'actual', cost_snapshot_at = now()
       where id = p_item_id;
    end if;
  end if;

  perform business_analysis.write_audit(v_item.business_id, 'update', 'sales_order_items', p_item_id, to_jsonb(v_item),
    (select to_jsonb(i) from business_analysis.sales_order_items i where i.id = p_item_id));
end;
$$;

-- ---- Import commit -----------------------------------------------------------

create function business_analysis._commit_order_line(p_imp business_analysis.document_imports, p_row business_analysis.document_import_rows)
returns text
language plpgsql
set search_path = ''
as $$
declare
  n jsonb := p_row.normalized;
  v_business uuid := p_imp.business_id;
  v_channel text := n ->> 'channel';
  v_line text := n ->> 'external_line_id';
  v_status text := n ->> 'status';
  v_order uuid;
  v_existing business_analysis.sales_order_items;
  v_item uuid;
  v_keep_status boolean;
begin
  insert into business_analysis.sales_orders as so
    (business_id, channel, external_order_id, order_date, customer_state, order_source, source_import_id, last_import_id)
  values (v_business, v_channel, n ->> 'external_order_id', (n ->> 'order_date')::date,
          n ->> 'customer_state', n ->> 'order_source', p_imp.id, p_imp.id)
  on conflict (business_id, channel, external_order_id) do update
    set last_import_id = excluded.last_import_id,
        customer_state = coalesce(excluded.customer_state, so.customer_state),
        order_source = coalesce(excluded.order_source, so.order_source),
        voided_at = null,
        void_reason = null
  returning id into v_order;

  select * into v_existing from business_analysis.sales_order_items
   where business_id = v_business and channel = v_channel and external_line_id = v_line
   for update;

  if not found then
    insert into business_analysis.sales_order_items (
      business_id, order_id, channel, external_line_id, sku, product_name, size, catalog_id, packet_id,
      quantity, status, raw_status, order_date, delivered_on, source_listed_price, source_discounted_price,
      price_basis, listed_amount, sale_amount, row_fingerprint, raw, source_import_id, last_import_id, source_row_number)
    values (
      v_business, v_order, v_channel, v_line, n ->> 'sku', n ->> 'product_name', n ->> 'size', n ->> 'catalog_id',
      n ->> 'packet_id', (n ->> 'quantity')::integer, v_status, n ->> 'raw_status', (n ->> 'order_date')::date,
      (n ->> 'delivered_on')::date, (n ->> 'listed_unit_price')::numeric, (n ->> 'discounted_unit_price')::numeric,
      coalesce(n ->> 'price_basis', 'per_unit'), coalesce((n ->> 'listed_amount')::numeric, 0),
      (n ->> 'sale_amount')::numeric, p_row.fingerprint, p_row.raw, p_imp.id, p_imp.id, p_row.source_row_number)
    returning id into v_item;

    insert into business_analysis.sales_order_status_history
      (business_id, order_item_id, previous_status, new_status, raw_status, source, source_import_id)
    values (v_business, v_item, null, v_status, n ->> 'raw_status', 'import', p_imp.id);

    perform business_analysis._apply_cost_snapshot(v_business, v_item);

    update business_analysis.document_import_rows
       set status = 'inserted', target_table = 'sales_order_items', target_id = v_item
     where id = p_row.id;
    return 'inserted';
  end if;

  if v_existing.row_fingerprint = p_row.fingerprint and v_existing.voided_at is null then
    update business_analysis.document_import_rows
       set status = 'unchanged', target_table = 'sales_order_items', target_id = v_existing.id
     where id = p_row.id;
    return 'unchanged';
  end if;

  v_keep_status := v_existing.voided_at is null
                   and business_analysis.status_rank(v_status) < business_analysis.status_rank(v_existing.status);

  update business_analysis.document_import_rows
     set previous_values = to_jsonb(v_existing),
         target_table = 'sales_order_items',
         target_id = v_existing.id,
         warnings = case when v_keep_status then warnings || jsonb_build_array(jsonb_build_object(
                      'code', 'status_regression_ignored',
                      'message', format('Kept status %s; the file says %s, which would move the order backwards.',
                                        v_existing.status, v_status)))
                    else warnings end
   where id = p_row.id;

  update business_analysis.sales_order_items
     set order_id = v_order,
         sku = n ->> 'sku',
         product_name = n ->> 'product_name',
         size = n ->> 'size',
         catalog_id = n ->> 'catalog_id',
         packet_id = coalesce(n ->> 'packet_id', packet_id),
         quantity = (n ->> 'quantity')::integer,
         status = case when v_keep_status then status else v_status end,
         raw_status = case when v_keep_status then raw_status else n ->> 'raw_status' end,
         status_changed_at = case when v_keep_status or status = v_status then status_changed_at else now() end,
         order_date = (n ->> 'order_date')::date,
         delivered_on = coalesce((n ->> 'delivered_on')::date, delivered_on),
         source_listed_price = (n ->> 'listed_unit_price')::numeric,
         source_discounted_price = (n ->> 'discounted_unit_price')::numeric,
         price_basis = coalesce(n ->> 'price_basis', 'per_unit'),
         listed_amount = coalesce((n ->> 'listed_amount')::numeric, 0),
         sale_amount = (n ->> 'sale_amount')::numeric,
         row_fingerprint = p_row.fingerprint,
         raw = p_row.raw,
         last_import_id = p_imp.id,
         source_row_number = p_row.source_row_number,
         voided_at = null,
         void_reason = null
   where id = v_existing.id;

  if not v_keep_status and v_existing.status is distinct from v_status then
    insert into business_analysis.sales_order_status_history
      (business_id, order_item_id, previous_status, new_status, raw_status, source, source_import_id)
    values (v_business, v_existing.id, v_existing.status, v_status, n ->> 'raw_status', 'import', p_imp.id);
  end if;

  -- A line revived after a rollback (or first costed now) gets a snapshot.
  if v_existing.voided_at is not null or v_existing.cost_basis = 'missing' then
    perform business_analysis._apply_cost_snapshot(v_business, v_existing.id);
  end if;

  update business_analysis.document_import_rows set status = 'updated' where id = p_row.id;
  return 'updated';
end;
$$;

create function business_analysis._commit_settlement_line(p_imp business_analysis.document_imports, p_row business_analysis.document_import_rows)
returns text
language plpgsql
set search_path = ''
as $$
declare
  n jsonb := p_row.normalized;
  v_business uuid := p_imp.business_id;
  v_settlement uuid;
  v_item uuid;
  v_component jsonb;
  v_inserted integer := 0;
  v_revived integer := 0;
  v_id uuid;
  v_first uuid;
begin
  insert into business_analysis.settlements as st
    (business_id, platform, external_settlement_id, settlement_kind, settlement_date, status, source_import_id)
  values (v_business, coalesce(n ->> 'platform', 'meesho'), n ->> 'external_settlement_id',
          coalesce(n ->> 'settlement_kind', 'payout'), (n ->> 'settlement_date')::date,
          case when (n ->> 'settlement_date') is not null then 'paid' else 'pending' end, p_imp.id)
  on conflict (business_id, platform, external_settlement_id) do update
    set settlement_date = coalesce(st.settlement_date, excluded.settlement_date),
        status = case when st.status = 'pending' and excluded.settlement_date is not null
                      then 'paid' else st.status end,
        voided_at = null,
        void_reason = null
  returning id into v_settlement;

  if (n ->> 'external_line_id') is not null then
    select i.id into v_item from business_analysis.sales_order_items i
     where i.business_id = v_business
       and i.external_line_id = n ->> 'external_line_id'
       and i.channel = case when coalesce(n ->> 'platform', 'meesho') = 'meesho' then 'meesho' else 'other' end
       and i.voided_at is null;
  end if;

  for v_component in select * from jsonb_array_elements(n -> 'components')
  loop
    v_id := null;
    insert into business_analysis.settlement_items (
      business_id, settlement_id, order_item_id, external_line_id, transaction_type, amount, transaction_date,
      external_reference, description, row_fingerprint, source_import_id, source_row_number, match_type, matched_at)
    values (
      v_business, v_settlement, v_item, n ->> 'external_line_id', v_component ->> 'type',
      (v_component ->> 'amount')::numeric, (n ->> 'transaction_date')::date, n ->> 'external_reference',
      n ->> 'description', p_row.fingerprint, p_imp.id, p_row.source_row_number,
      case when v_item is not null then 'auto' end, case when v_item is not null then now() end)
    on conflict (business_id, row_fingerprint, transaction_type) do nothing
    returning id into v_id;

    if v_id is not null then
      v_inserted := v_inserted + 1;
      v_first := coalesce(v_first, v_id);
    else
      -- Revive an item voided by an earlier rollback of the same data.
      update business_analysis.settlement_items
         set voided_at = null, void_reason = null, source_import_id = p_imp.id, settlement_id = v_settlement,
             order_item_id = coalesce(order_item_id, v_item)
       where business_id = v_business
         and row_fingerprint = p_row.fingerprint
         and transaction_type = v_component ->> 'type'
         and voided_at is not null
      returning id into v_id;
      if v_id is not null then
        v_revived := v_revived + 1;
        v_first := coalesce(v_first, v_id);
      end if;
    end if;
  end loop;

  if v_inserted + v_revived = 0 then
    update business_analysis.document_import_rows
       set status = 'duplicate_existing', target_table = 'settlement_items',
           warnings = warnings || jsonb_build_array(jsonb_build_object(
             'code', 'already_imported', 'message', 'These settlement amounts were already imported.'))
     where id = p_row.id;
    return 'unchanged';
  end if;

  update business_analysis.document_import_rows
     set status = 'inserted', target_table = 'settlement_items', target_id = v_first,
         warnings = case when v_item is null and (n ->> 'external_line_id') is not null
                         then warnings || jsonb_build_array(jsonb_build_object(
                                'code', 'order_not_found',
                                'message', 'No imported order line has this sub-order number yet; it will appear as an unlinked settlement until matched.'))
                         else warnings end
   where id = p_row.id;
  return 'inserted';
end;
$$;

create function business_analysis._commit_return_event(p_imp business_analysis.document_imports, p_row business_analysis.document_import_rows)
returns text
language plpgsql
set search_path = ''
as $$
declare
  n jsonb := p_row.normalized;
  v_item business_analysis.sales_order_items;
  v_status text := n ->> 'status';
begin
  select * into v_item from business_analysis.sales_order_items
   where business_id = p_imp.business_id
     and channel = coalesce(n ->> 'channel', 'meesho')
     and external_line_id = n ->> 'external_line_id'
     and voided_at is null
   for update;

  if not found then
    update business_analysis.document_import_rows
       set status = 'rejected', errors = errors || jsonb_build_array(jsonb_build_object(
             'code', 'order_not_found',
             'message', 'No imported order line has this sub-order number. Import the order report first, then re-run this file.'))
     where id = p_row.id;
    return 'rejected';
  end if;

  if v_item.status = v_status then
    update business_analysis.document_import_rows
       set status = 'unchanged', target_table = 'sales_order_items', target_id = v_item.id
     where id = p_row.id;
    return 'unchanged';
  end if;

  if business_analysis.status_rank(v_status) < business_analysis.status_rank(v_item.status) then
    update business_analysis.document_import_rows
       set status = 'unchanged', target_table = 'sales_order_items', target_id = v_item.id,
           warnings = warnings || jsonb_build_array(jsonb_build_object(
             'code', 'status_regression_ignored',
             'message', format('Kept status %s; the return report says %s.', v_item.status, v_status)))
     where id = p_row.id;
    return 'unchanged';
  end if;

  update business_analysis.document_import_rows
     set previous_values = to_jsonb(v_item), target_table = 'sales_order_items', target_id = v_item.id
   where id = p_row.id;

  update business_analysis.sales_order_items
     set status = v_status, raw_status = n ->> 'raw_status', status_changed_at = now(), last_import_id = p_imp.id
   where id = v_item.id;

  insert into business_analysis.sales_order_status_history
    (business_id, order_item_id, previous_status, new_status, raw_status, source, source_import_id, note)
  values (p_imp.business_id, v_item.id, v_item.status, v_status, n ->> 'raw_status', 'import', p_imp.id, n ->> 'reason');

  update business_analysis.document_import_rows set status = 'updated' where id = p_row.id;
  return 'updated';
end;
$$;

create function business_analysis._commit_ad_metric(p_imp business_analysis.document_imports, p_row business_analysis.document_import_rows)
returns text
language plpgsql
set search_path = ''
as $$
declare
  n jsonb := p_row.normalized;
  v_business uuid := p_imp.business_id;
  v_account uuid;
  v_existing business_analysis.ad_campaign_metrics;
  v_id uuid;
begin
  if (n ->> 'ad_account_external_id') is not null then
    insert into business_analysis.ad_accounts as aa (business_id, platform, name, external_account_id)
    values (v_business, 'meta', coalesce(n ->> 'ad_account_name', n ->> 'ad_account_external_id'), n ->> 'ad_account_external_id')
    on conflict (business_id, platform, external_account_id) do update set name = aa.name
    returning id into v_account;
  else
    select a.id into v_account from business_analysis.ad_accounts a
     where a.business_id = v_business
       and a.id = nullif(p_imp.mapping ->> 'adAccountId', '')::uuid;
    if v_account is null then
      select a.id into v_account from business_analysis.ad_accounts a
       where a.business_id = v_business and a.platform = 'meta' and a.is_active
       order by a.created_at limit 1;
    end if;
  end if;
  if v_account is null then
    raise exception 'no ad account available for this import';
  end if;

  select * into v_existing from business_analysis.ad_campaign_metrics m
   where m.business_id = v_business and m.ad_account_id = v_account
     and m.metric_date = (n ->> 'metric_date')::date
     and m.campaign_name = coalesce(n ->> 'campaign_name', '')
     and m.adset_name = coalesce(n ->> 'adset_name', '')
     and m.ad_name = coalesce(n ->> 'ad_name', '')
   for update;

  if found and v_existing.row_fingerprint = p_row.fingerprint and v_existing.voided_at is null then
    update business_analysis.document_import_rows
       set status = 'unchanged', target_table = 'ad_campaign_metrics', target_id = v_existing.id
     where id = p_row.id;
    return 'unchanged';
  end if;

  if found then
    update business_analysis.document_import_rows
       set previous_values = to_jsonb(v_existing), target_table = 'ad_campaign_metrics', target_id = v_existing.id
     where id = p_row.id;
    update business_analysis.ad_campaign_metrics
       set campaign_id = n ->> 'campaign_id', adset_id = n ->> 'adset_id', ad_id = n ->> 'ad_id',
           spend = (n ->> 'spend')::numeric, impressions = coalesce((n ->> 'impressions')::bigint, 0),
           reach = (n ->> 'reach')::bigint, clicks = coalesce((n ->> 'clicks')::bigint, 0),
           link_clicks = (n ->> 'link_clicks')::bigint, purchases = coalesce((n ->> 'purchases')::numeric, 0),
           attributed_revenue = coalesce((n ->> 'attributed_revenue')::numeric, 0),
           attribution_window = n ->> 'attribution_window', source = 'import',
           row_fingerprint = p_row.fingerprint, last_import_id = p_imp.id, voided_at = null
     where id = v_existing.id;
    update business_analysis.document_import_rows set status = 'updated' where id = p_row.id;
    return 'updated';
  end if;

  insert into business_analysis.ad_campaign_metrics (
    business_id, ad_account_id, metric_date, campaign_name, adset_name, ad_name, campaign_id, adset_id, ad_id,
    spend, impressions, reach, clicks, link_clicks, purchases, attributed_revenue, attribution_window, source,
    row_fingerprint, source_import_id, last_import_id)
  values (
    v_business, v_account, (n ->> 'metric_date')::date, coalesce(n ->> 'campaign_name', ''),
    coalesce(n ->> 'adset_name', ''), coalesce(n ->> 'ad_name', ''), n ->> 'campaign_id', n ->> 'adset_id',
    n ->> 'ad_id', (n ->> 'spend')::numeric, coalesce((n ->> 'impressions')::bigint, 0), (n ->> 'reach')::bigint,
    coalesce((n ->> 'clicks')::bigint, 0), (n ->> 'link_clicks')::bigint, coalesce((n ->> 'purchases')::numeric, 0),
    coalesce((n ->> 'attributed_revenue')::numeric, 0), n ->> 'attribution_window', 'import', p_row.fingerprint,
    p_imp.id, p_imp.id)
  returning id into v_id;

  update business_analysis.document_import_rows
     set status = 'inserted', target_table = 'ad_campaign_metrics', target_id = v_id
   where id = p_row.id;
  return 'inserted';
end;
$$;

-- Recompute settlement totals from their live items and keep the payout's
-- single cash row in step. Fee statements never create cash rows.
create function business_analysis._refresh_settlements(p_business_id uuid, p_settlement_ids uuid[])
returns void
language plpgsql
set search_path = ''
as $$
begin
  update business_analysis.settlements s
     set gross_amount = coalesce(t.gross, 0),
         deductions_amount = coalesce(t.deductions, 0),
         net_amount = coalesce(t.net, 0),
         voided_at = case when t.items is null then coalesce(s.voided_at, now()) else null end,
         void_reason = case when t.items is null then 'all items voided' else null end
    from (
      select x.id,
             (select sum(si.amount) filter (where si.amount > 0) from business_analysis.settlement_items si
               where si.settlement_id = x.id and si.voided_at is null) as gross,
             (select sum(si.amount) filter (where si.amount < 0) from business_analysis.settlement_items si
               where si.settlement_id = x.id and si.voided_at is null) as deductions,
             (select sum(si.amount) from business_analysis.settlement_items si
               where si.settlement_id = x.id and si.voided_at is null) as net,
             (select count(*) from business_analysis.settlement_items si
               where si.settlement_id = x.id and si.voided_at is null having count(*) > 0) as items
        from unnest(p_settlement_ids) as x(id)
    ) t
   where s.id = t.id and s.business_id = p_business_id;

  -- Upsert / void the payout's cash row.
  insert into business_analysis.cash_transactions
    (business_id, txn_date, direction, txn_type, amount, external_reference, description, linked_settlement_id, source, source_import_id)
  select s.business_id, s.settlement_date, case when s.net_amount >= 0 then 'in' else 'out' end, 'settlement_payout',
         abs(s.net_amount), s.external_settlement_id, 'Platform settlement ' || s.external_settlement_id, s.id, 'system',
         s.source_import_id
    from business_analysis.settlements s
   where s.id = any (p_settlement_ids)
     and s.business_id = p_business_id
     and s.settlement_kind = 'payout'
     and s.voided_at is null
     and s.settlement_date is not null
     and s.net_amount <> 0
  on conflict (linked_settlement_id) where linked_settlement_id is not null do update
    set txn_date = excluded.txn_date, direction = excluded.direction, amount = excluded.amount,
        voided_at = null, void_reason = null;

  update business_analysis.cash_transactions c
     set voided_at = coalesce(c.voided_at, now()), void_reason = 'settlement voided or netted to zero'
    from business_analysis.settlements s
   where c.linked_settlement_id = s.id
     and s.id = any (p_settlement_ids)
     and s.business_id = p_business_id
     and (s.voided_at is not null or s.net_amount = 0 or s.settlement_date is null or s.settlement_kind <> 'payout')
     and c.voided_at is null;
end;
$$;

create function business_analysis._recount_import(p_import_id uuid)
returns void
language sql
set search_path = ''
as $$
  update business_analysis.document_imports i
     set inserted_count  = c.inserted,
         updated_count   = c.updated,
         unchanged_count = c.unchanged,
         rejected_count  = c.rejected,
         reverted_count  = c.reverted
    from (
      select count(*) filter (where r.status = 'inserted') as inserted,
             count(*) filter (where r.status = 'updated') as updated,
             count(*) filter (where r.status in ('unchanged', 'duplicate_existing')) as unchanged,
             count(*) filter (where r.status = 'rejected') as rejected,
             count(*) filter (where r.status in ('reverted')) as reverted
        from business_analysis.document_import_rows r
       where r.import_id = p_import_id
    ) c
   where i.id = p_import_id
$$;

-- Commits the next batch of valid staged rows. Call repeatedly until
-- 'remaining' is 0. Each call is one transaction; a row that fails is marked
-- rejected with the database error instead of aborting its batch. Rows already
-- processed are never processed again, so retrying after a timeout is safe.
create function business_analysis.commit_import_batch(
  p_import_id uuid, p_batch_size integer default 500, p_acknowledge_warnings boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_imp business_analysis.document_imports;
  v_row business_analysis.document_import_rows;
  v_outcome text;
  v_processed integer := 0;
  v_remaining integer;
  v_settlements uuid[];
begin
  select * into v_imp from business_analysis.document_imports where id = p_import_id for update;
  if not found then
    raise exception 'import not found' using errcode = 'P0002';
  end if;
  perform business_analysis.assert_role(v_imp.business_id, 'writer');

  if v_imp.status not in ('parsed', 'needs_review', 'committing', 'failed') then
    raise exception 'an import in status % cannot be committed', v_imp.status using errcode = '55000';
  end if;
  if v_imp.status = 'needs_review' and not p_acknowledge_warnings then
    raise exception 'this import has extraction warnings that must be acknowledged before committing' using errcode = '55000';
  end if;

  update business_analysis.document_imports set status = 'committing', error_summary = null where id = p_import_id;

  for v_row in
    select * from business_analysis.document_import_rows r
     where r.import_id = p_import_id and r.status = 'valid'
     order by r.source_row_number
     limit greatest(1, least(coalesce(p_batch_size, 500), 2000))
     for update
  loop
    begin
      v_outcome := case v_imp.report_type
        when 'meesho_orders'      then business_analysis._commit_order_line(v_imp, v_row)
        when 'meesho_settlements' then business_analysis._commit_settlement_line(v_imp, v_row)
        when 'platform_fees'      then business_analysis._commit_settlement_line(v_imp, v_row)
        when 'meesho_returns'     then business_analysis._commit_return_event(v_imp, v_row)
        when 'meta_ads'           then business_analysis._commit_ad_metric(v_imp, v_row)
      end;
    exception when others then
      update business_analysis.document_import_rows
         set status = 'rejected',
             errors = errors || jsonb_build_array(jsonb_build_object('code', 'commit_failed', 'message', sqlerrm))
       where id = v_row.id;
    end;
    v_processed := v_processed + 1;
  end loop;

  if v_imp.report_type in ('meesho_settlements', 'platform_fees') then
    select array_agg(distinct si.settlement_id) into v_settlements
      from business_analysis.settlement_items si
     where si.business_id = v_imp.business_id and si.source_import_id = p_import_id;
    if v_settlements is not null then
      perform business_analysis._refresh_settlements(v_imp.business_id, v_settlements);
    end if;
  end if;

  select count(*) into v_remaining from business_analysis.document_import_rows
   where import_id = p_import_id and status = 'valid';

  perform business_analysis._recount_import(p_import_id);
  update business_analysis.document_imports
     set status = case when v_remaining = 0 then 'committed' else 'committing' end,
         committed_at = case when v_remaining = 0 then now() else null end
   where id = p_import_id;

  return (
    select jsonb_build_object(
      'processed', v_processed, 'remaining', v_remaining, 'status', i.status,
      'inserted', i.inserted_count, 'updated', i.updated_count, 'unchanged', i.unchanged_count,
      'rejected', i.rejected_count)
      from business_analysis.document_imports i where i.id = p_import_id);
end;
$$;

-- Reverses a committed (or partially committed) import in batches. Records
-- this import created are voided; records it updated are restored from the
-- snapshot taken at commit — but only if no later import has changed them
-- since, in which case the row is reported as 'revert_skipped'. Unrelated
-- records are never touched.
create function business_analysis.rollback_import_batch(
  p_import_id uuid, p_reason text, p_batch_size integer default 1000)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_imp business_analysis.document_imports;
  v_row business_analysis.document_import_rows;
  v_prev jsonb;
  v_item business_analysis.sales_order_items;
  v_metric business_analysis.ad_campaign_metrics;
  v_processed integer := 0;
  v_remaining integer;
  v_settlements uuid[];
begin
  select * into v_imp from business_analysis.document_imports where id = p_import_id for update;
  if not found then
    raise exception 'import not found' using errcode = 'P0002';
  end if;
  perform business_analysis.assert_role(v_imp.business_id, 'admin');
  if v_imp.status not in ('committed', 'committing', 'failed', 'rolling_back') then
    raise exception 'an import in status % cannot be rolled back', v_imp.status using errcode = '55000';
  end if;

  update business_analysis.document_imports
     set status = 'rolling_back', rollback_reason = coalesce(rollback_reason, p_reason)
   where id = p_import_id;

  for v_row in
    select * from business_analysis.document_import_rows r
     where r.import_id = p_import_id and r.status in ('inserted', 'updated')
     order by r.source_row_number desc
     limit greatest(1, least(coalesce(p_batch_size, 1000), 5000))
     for update
  loop
    v_prev := v_row.previous_values;

    if v_row.target_table = 'sales_order_items' then
      select * into v_item from business_analysis.sales_order_items
       where id = v_row.target_id and business_id = v_imp.business_id for update;

      if not found or v_item.last_import_id is distinct from p_import_id then
        update business_analysis.document_import_rows
           set status = 'revert_skipped', warnings = warnings || jsonb_build_array(jsonb_build_object(
                 'code', 'superseded', 'message', 'A later import or edit changed this order line; it was left as is.'))
         where id = v_row.id;
      elsif v_row.status = 'inserted' then
        update business_analysis.sales_order_items
           set voided_at = now(), void_reason = 'import rolled back: ' || coalesce(p_reason, '')
         where id = v_item.id;
        update business_analysis.document_import_rows set status = 'reverted' where id = v_row.id;
      else
        update business_analysis.sales_order_items
           set status = v_prev ->> 'status',
               raw_status = v_prev ->> 'raw_status',
               quantity = (v_prev ->> 'quantity')::integer,
               sku = v_prev ->> 'sku',
               product_name = v_prev ->> 'product_name',
               size = v_prev ->> 'size',
               catalog_id = v_prev ->> 'catalog_id',
               packet_id = v_prev ->> 'packet_id',
               order_date = (v_prev ->> 'order_date')::date,
               delivered_on = (v_prev ->> 'delivered_on')::date,
               source_listed_price = (v_prev ->> 'source_listed_price')::numeric,
               source_discounted_price = (v_prev ->> 'source_discounted_price')::numeric,
               price_basis = v_prev ->> 'price_basis',
               listed_amount = (v_prev ->> 'listed_amount')::numeric,
               sale_amount = (v_prev ->> 'sale_amount')::numeric,
               row_fingerprint = v_prev ->> 'row_fingerprint',
               raw = v_prev -> 'raw',
               last_import_id = (v_prev ->> 'last_import_id')::uuid,
               source_row_number = (v_prev ->> 'source_row_number')::integer,
               voided_at = (v_prev ->> 'voided_at')::timestamptz,
               void_reason = v_prev ->> 'void_reason'
         where id = v_item.id;
        if v_item.status is distinct from (v_prev ->> 'status') then
          insert into business_analysis.sales_order_status_history
            (business_id, order_item_id, previous_status, new_status, source, source_import_id, changed_by, note)
          values (v_imp.business_id, v_item.id, v_item.status, v_prev ->> 'status', 'rollback', p_import_id, auth.uid(),
                  'Import rolled back');
        end if;
        update business_analysis.document_import_rows set status = 'reverted' where id = v_row.id;
      end if;

    elsif v_row.target_table = 'settlement_items' then
      update business_analysis.settlement_items
         set voided_at = now(), void_reason = 'import rolled back: ' || coalesce(p_reason, '')
       where business_id = v_imp.business_id
         and row_fingerprint = v_row.fingerprint
         and source_import_id = p_import_id
         and voided_at is null;
      update business_analysis.document_import_rows set status = 'reverted' where id = v_row.id;

    elsif v_row.target_table = 'ad_campaign_metrics' then
      select * into v_metric from business_analysis.ad_campaign_metrics
       where id = v_row.target_id and business_id = v_imp.business_id for update;
      if not found or v_metric.last_import_id is distinct from p_import_id then
        update business_analysis.document_import_rows
           set status = 'revert_skipped', warnings = warnings || jsonb_build_array(jsonb_build_object(
                 'code', 'superseded', 'message', 'A later import or edit changed this ad metric; it was left as is.'))
         where id = v_row.id;
      elsif v_row.status = 'inserted' then
        update business_analysis.ad_campaign_metrics set voided_at = now() where id = v_metric.id;
        update business_analysis.document_import_rows set status = 'reverted' where id = v_row.id;
      else
        update business_analysis.ad_campaign_metrics
           set spend = (v_prev ->> 'spend')::numeric,
               impressions = (v_prev ->> 'impressions')::bigint,
               reach = (v_prev ->> 'reach')::bigint,
               clicks = (v_prev ->> 'clicks')::bigint,
               link_clicks = (v_prev ->> 'link_clicks')::bigint,
               purchases = (v_prev ->> 'purchases')::numeric,
               attributed_revenue = (v_prev ->> 'attributed_revenue')::numeric,
               attribution_window = v_prev ->> 'attribution_window',
               source = v_prev ->> 'source',
               row_fingerprint = v_prev ->> 'row_fingerprint',
               last_import_id = (v_prev ->> 'last_import_id')::uuid,
               voided_at = (v_prev ->> 'voided_at')::timestamptz
         where id = v_metric.id;
        update business_analysis.document_import_rows set status = 'reverted' where id = v_row.id;
      end if;
    end if;

    v_processed := v_processed + 1;
  end loop;

  if v_imp.report_type in ('meesho_settlements', 'platform_fees') then
    select array_agg(distinct si.settlement_id) into v_settlements
      from business_analysis.settlement_items si
     where si.business_id = v_imp.business_id and si.source_import_id = p_import_id;
    if v_settlements is not null then
      perform business_analysis._refresh_settlements(v_imp.business_id, v_settlements);
    end if;
  end if;

  -- Orders left without any live line are voided too.
  if v_imp.report_type = 'meesho_orders' then
    update business_analysis.sales_orders o
       set voided_at = now(), void_reason = 'import rolled back'
     where o.business_id = v_imp.business_id
       and o.last_import_id = p_import_id
       and o.voided_at is null
       and not exists (select 1 from business_analysis.sales_order_items i where i.order_id = o.id and i.voided_at is null);
  end if;

  select count(*) into v_remaining from business_analysis.document_import_rows
   where import_id = p_import_id and status in ('inserted', 'updated');

  perform business_analysis._recount_import(p_import_id);
  update business_analysis.document_imports
     set status = case when v_remaining = 0 then 'rolled_back' else 'rolling_back' end,
         rolled_back_at = case when v_remaining = 0 then now() else null end,
         rolled_back_by = case when v_remaining = 0 then auth.uid() else null end
   where id = p_import_id;

  return (
    select jsonb_build_object('processed', v_processed, 'remaining', v_remaining, 'status', i.status,
                              'reverted', i.reverted_count)
      from business_analysis.document_imports i where i.id = p_import_id);
end;
$$;

-- ---- Reconciliation ----------------------------------------------------------

create function business_analysis.match_settlement_item(p_settlement_item_id uuid, p_order_item_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_si business_analysis.settlement_items;
begin
  select * into v_si from business_analysis.settlement_items where id = p_settlement_item_id for update;
  if not found then
    raise exception 'settlement item not found' using errcode = 'P0002';
  end if;
  perform business_analysis.assert_role(v_si.business_id, 'writer');

  if p_order_item_id is not null and not exists (
       select 1 from business_analysis.sales_order_items i
        where i.id = p_order_item_id and i.business_id = v_si.business_id and i.voided_at is null) then
    raise exception 'order line not found in this business' using errcode = 'P0002';
  end if;

  -- Match every component from the same source row together, so a payout
  -- line can never be half-linked.
  update business_analysis.settlement_items
     set order_item_id = p_order_item_id,
         match_type = case when p_order_item_id is null then null else 'manual' end,
         matched_by = case when p_order_item_id is null then null else auth.uid() end,
         matched_at = case when p_order_item_id is null then null else now() end
   where business_id = v_si.business_id
     and row_fingerprint = v_si.row_fingerprint
     and voided_at is null;

  perform business_analysis.write_audit(v_si.business_id,
    case when p_order_item_id is null then 'unmatch' else 'match' end, 'settlement_items', v_si.id,
    jsonb_build_object('order_item_id', v_si.order_item_id), jsonb_build_object('order_item_id', p_order_item_id));
end;
$$;

create function business_analysis.record_bank_receipt(
  p_settlement_id uuid, p_amount numeric, p_received_on date, p_reference text, p_tolerance numeric default 1)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_s business_analysis.settlements;
  v_status text;
begin
  select * into v_s from business_analysis.settlements where id = p_settlement_id for update;
  if not found then
    raise exception 'settlement not found' using errcode = 'P0002';
  end if;
  perform business_analysis.assert_role(v_s.business_id, 'writer');
  if p_amount is null or p_received_on is null then
    raise exception 'amount and date are required' using errcode = '22023';
  end if;

  v_status := case when abs(p_amount - v_s.net_amount) <= coalesce(p_tolerance, 1) then 'reconciled' else 'disputed' end;
  update business_analysis.settlements
     set bank_received_amount = p_amount, bank_received_on = p_received_on, bank_reference = p_reference, status = v_status
   where id = p_settlement_id;
  return v_status;
end;
$$;

-- ---- Expenses ----------------------------------------------------------------

-- Keeps the one cash row an expense may own in step with it. An expense that
-- the platform already deducted (reflected_in_settlement / platform_deduction)
-- never creates a cash row: the settlement payout already shows it.
create function business_analysis._sync_expense_cash(p_expense_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_e business_analysis.expenses;
  v_should boolean;
begin
  select * into v_e from business_analysis.expenses where id = p_expense_id;
  v_should := v_e.payment_status = 'paid'
              and not v_e.is_recurring_template
              and not v_e.reflected_in_settlement
              and coalesce(v_e.payment_method, '') <> 'platform_deduction'
              and v_e.reversal_of_id is null;

  if v_should then
    insert into business_analysis.cash_transactions
      (business_id, txn_date, direction, txn_type, amount, payment_account, external_reference, description,
       linked_expense_id, source, created_by)
    values (v_e.business_id, v_e.payment_date, 'out', 'expense_payment', v_e.amount, v_e.payment_method,
            v_e.reference_number, coalesce(v_e.vendor, 'Expense'), v_e.id, 'system', auth.uid())
    on conflict (linked_expense_id, txn_type) where linked_expense_id is not null do update
      set txn_date = excluded.txn_date, amount = excluded.amount, payment_account = excluded.payment_account,
          external_reference = excluded.external_reference, description = excluded.description,
          voided_at = null, void_reason = null;
  else
    update business_analysis.cash_transactions
       set voided_at = now(), void_reason = 'expense no longer paid in cash'
     where linked_expense_id = p_expense_id and txn_type = 'expense_payment' and voided_at is null;
  end if;
end;
$$;

create function business_analysis.save_expense(p_business_id uuid, p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid := nullif(p_payload ->> 'id', '')::uuid;
  v_existing business_analysis.expenses;
  v_category uuid := (p_payload ->> 'category_id')::uuid;
  v_paid boolean := coalesce(p_payload ->> 'payment_status', 'paid') = 'paid';
begin
  perform business_analysis.assert_role(p_business_id, 'writer');

  if not exists (select 1 from business_analysis.expense_categories c
                  where c.id = v_category and c.business_id = p_business_id and c.is_active) then
    raise exception 'unknown or inactive expense category' using errcode = '22023';
  end if;

  if v_id is null then
    insert into business_analysis.expenses (
      business_id, expense_date, category_id, amount, tax_amount, tax_treatment, vendor, payment_method,
      payment_status, payment_date, reference_number, notes, attachment_path, reflected_in_settlement,
      is_recurring_template, recurrence, source, created_by)
    values (
      p_business_id, (p_payload ->> 'expense_date')::date, v_category, (p_payload ->> 'amount')::numeric,
      coalesce((p_payload ->> 'tax_amount')::numeric, 0), coalesce(p_payload ->> 'tax_treatment', 'none'),
      p_payload ->> 'vendor', p_payload ->> 'payment_method', coalesce(p_payload ->> 'payment_status', 'paid'),
      case when v_paid then coalesce((p_payload ->> 'payment_date')::date, (p_payload ->> 'expense_date')::date) end,
      p_payload ->> 'reference_number', p_payload ->> 'notes', p_payload ->> 'attachment_path',
      coalesce((p_payload ->> 'reflected_in_settlement')::boolean, false),
      coalesce((p_payload ->> 'is_recurring_template')::boolean, false), p_payload -> 'recurrence', 'manual', auth.uid())
    returning id into v_id;
  else
    select * into v_existing from business_analysis.expenses
     where id = v_id and business_id = p_business_id for update;
    if not found then
      raise exception 'expense not found' using errcode = 'P0002';
    end if;
    if v_existing.status <> 'active' or v_existing.reversal_of_id is not null then
      raise exception 'reversed expenses and reversal entries cannot be edited' using errcode = '55000';
    end if;
    update business_analysis.expenses
       set expense_date = (p_payload ->> 'expense_date')::date,
           category_id = v_category,
           amount = (p_payload ->> 'amount')::numeric,
           tax_amount = coalesce((p_payload ->> 'tax_amount')::numeric, 0),
           tax_treatment = coalesce(p_payload ->> 'tax_treatment', 'none'),
           vendor = p_payload ->> 'vendor',
           payment_method = p_payload ->> 'payment_method',
           payment_status = coalesce(p_payload ->> 'payment_status', 'paid'),
           payment_date = case when v_paid then coalesce((p_payload ->> 'payment_date')::date, (p_payload ->> 'expense_date')::date) end,
           reference_number = p_payload ->> 'reference_number',
           notes = p_payload ->> 'notes',
           attachment_path = coalesce(p_payload ->> 'attachment_path', attachment_path),
           reflected_in_settlement = coalesce((p_payload ->> 'reflected_in_settlement')::boolean, false),
           recurrence = case when is_recurring_template then coalesce(p_payload -> 'recurrence', recurrence) else recurrence end
     where id = v_id;
  end if;

  perform business_analysis._sync_expense_cash(v_id);
  return v_id;
end;
$$;

-- Reversal instead of deletion. 'error' undoes an entry made by mistake (the
-- reversal is dated like the original and its cash row is voided); 'refund'
-- records money coming back on p_reversal_date.
create function business_analysis.reverse_expense(
  p_expense_id uuid, p_reason text, p_kind text default 'error', p_reversal_date date default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_e business_analysis.expenses;
  v_rev uuid;
  v_date date;
begin
  select * into v_e from business_analysis.expenses where id = p_expense_id for update;
  if not found then
    raise exception 'expense not found' using errcode = 'P0002';
  end if;
  perform business_analysis.assert_role(v_e.business_id, 'writer');
  if v_e.status <> 'active' or v_e.reversal_of_id is not null or v_e.is_recurring_template then
    raise exception 'this entry cannot be reversed' using errcode = '55000';
  end if;
  if p_kind not in ('error', 'refund') then
    raise exception 'kind must be error or refund' using errcode = '22023';
  end if;
  if coalesce(btrim(p_reason), '') = '' then
    raise exception 'a reason is required' using errcode = '22023';
  end if;

  v_date := case when p_kind = 'error' then v_e.expense_date else coalesce(p_reversal_date, current_date) end;

  insert into business_analysis.expenses (
    business_id, expense_date, category_id, amount, tax_amount, tax_treatment, vendor, payment_method,
    payment_status, payment_date, reference_number, notes, reflected_in_settlement, source, reversal_of_id,
    reversal_reason, created_by)
  values (
    v_e.business_id, v_date, v_e.category_id, -v_e.amount, -v_e.tax_amount, v_e.tax_treatment, v_e.vendor,
    v_e.payment_method, v_e.payment_status, case when v_e.payment_status = 'paid' then v_date end,
    v_e.reference_number, 'Reversal: ' || p_reason, v_e.reflected_in_settlement, 'system', v_e.id, p_reason, auth.uid())
  returning id into v_rev;

  update business_analysis.expenses set status = 'reversed', reversal_reason = p_reason where id = v_e.id;

  if p_kind = 'error' then
    update business_analysis.cash_transactions
       set voided_at = now(), void_reason = 'expense reversed: ' || p_reason
     where linked_expense_id = v_e.id and txn_type = 'expense_payment' and voided_at is null;
  elsif v_e.payment_status = 'paid' and not v_e.reflected_in_settlement
        and coalesce(v_e.payment_method, '') <> 'platform_deduction' then
    insert into business_analysis.cash_transactions
      (business_id, txn_date, direction, txn_type, amount, payment_account, description, linked_expense_id, source, created_by)
    values (v_e.business_id, v_date, 'in', 'expense_refund', v_e.amount, v_e.payment_method,
            'Refund: ' || coalesce(v_e.vendor, 'expense'), v_e.id, 'system', auth.uid());
  end if;
  return v_rev;
end;
$$;

-- Occurrence dates of a recurrence rule {frequency, interval, startDate, endDate}.
-- Each date is start + n × step (not a running sum), so a rule starting on the
-- 31st falls on the last day of shorter months without drifting afterwards.
create function business_analysis.recurrence_dates(p_rule jsonb, p_until date)
returns setof date
language sql
immutable
set search_path = ''
as $$
  with rule as (
    select (p_rule ->> 'startDate')::date as start_date,
           least(coalesce((p_rule ->> 'endDate')::date, p_until), p_until) as end_date,
           greatest(coalesce((p_rule ->> 'interval')::integer, 1), 1)
             * case when p_rule ->> 'frequency' = 'quarterly' then 3 else 1 end as step,
           case p_rule ->> 'frequency'
             when 'weekly' then interval '1 week'
             when 'monthly' then interval '1 month'
             when 'quarterly' then interval '1 month'
             when 'yearly' then interval '1 year'
           end as unit
  )
  select (rule.start_date::timestamp + (n * rule.step) * rule.unit)::date
    from rule, generate_series(0, 1000) as n
   where rule.unit is not null
     and (rule.start_date::timestamp + (n * rule.step) * rule.unit)::date <= rule.end_date
$$;

create function business_analysis.generate_recurring_expenses(p_business_id uuid, p_until date)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_t business_analysis.expenses;
  v_date date;
  v_id uuid;
  v_created integer := 0;
begin
  perform business_analysis.assert_role(p_business_id, 'writer');
  if p_until > current_date + 366 then
    raise exception 'cannot generate more than a year ahead' using errcode = '22023';
  end if;

  for v_t in
    select * from business_analysis.expenses
     where business_id = p_business_id and is_recurring_template and status = 'active'
  loop
    for v_date in select * from business_analysis.recurrence_dates(v_t.recurrence, p_until)
    loop
      v_id := null;
      insert into business_analysis.expenses (
        business_id, expense_date, category_id, amount, tax_amount, tax_treatment, vendor, payment_method,
        payment_status, payment_date, reference_number, notes, reflected_in_settlement, recurring_template_id,
        occurrence_date, source, created_by)
      values (
        p_business_id, v_date, v_t.category_id, v_t.amount, v_t.tax_amount, v_t.tax_treatment, v_t.vendor,
        v_t.payment_method, v_t.payment_status, case when v_t.payment_status = 'paid' then v_date end,
        v_t.reference_number, v_t.notes, v_t.reflected_in_settlement, v_t.id, v_date, 'recurring', auth.uid())
      on conflict (recurring_template_id, occurrence_date) do nothing
      returning id into v_id;
      if v_id is not null then
        perform business_analysis._sync_expense_cash(v_id);
        v_created := v_created + 1;
      end if;
    end loop;
  end loop;
  return v_created;
end;
$$;

-- ---- Cash --------------------------------------------------------------------

create function business_analysis.record_cash_transaction(p_business_id uuid, p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_type text := p_payload ->> 'txn_type';
  v_direction text;
  v_id uuid;
begin
  perform business_analysis.assert_role(p_business_id, 'writer');
  v_direction := case v_type
    when 'other_income' then 'in'
    when 'capital_injection' then 'in'
    when 'loan_received' then 'in'
    when 'other_inflow' then 'in'
    when 'owner_withdrawal' then 'out'
    when 'loan_repayment' then 'out'
    when 'other_outflow' then 'out'
  end;
  if v_direction is null then
    raise exception 'this transaction type is created by the system and cannot be entered manually' using errcode = '22023';
  end if;

  insert into business_analysis.cash_transactions
    (business_id, txn_date, direction, txn_type, amount, payment_account, external_reference, description, source, created_by)
  values (p_business_id, (p_payload ->> 'txn_date')::date, v_direction, v_type, (p_payload ->> 'amount')::numeric,
          p_payload ->> 'payment_account', p_payload ->> 'external_reference', p_payload ->> 'description', 'manual', auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;

create function business_analysis.void_cash_transaction(p_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_c business_analysis.cash_transactions;
begin
  select * into v_c from business_analysis.cash_transactions where id = p_id for update;
  if not found then
    raise exception 'transaction not found' using errcode = 'P0002';
  end if;
  perform business_analysis.assert_role(v_c.business_id, 'writer');
  if v_c.source <> 'manual' then
    raise exception 'system transactions follow their source record; reverse the expense or settlement instead' using errcode = '55000';
  end if;
  update business_analysis.cash_transactions
     set voided_at = now(), void_reason = coalesce(nullif(btrim(p_reason), ''), 'voided')
   where id = p_id and voided_at is null;
end;
$$;

-- ---- Inventory ---------------------------------------------------------------

create function business_analysis.record_inventory_movement(p_business_id uuid, p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform business_analysis.assert_role(p_business_id, 'writer');
  insert into business_analysis.inventory_movements
    (business_id, material_id, product_id, movement_type, quantity, unit_cost, movement_date, reference_type, notes, created_by)
  values (p_business_id, nullif(p_payload ->> 'material_id', '')::uuid, nullif(p_payload ->> 'product_id', '')::uuid,
          p_payload ->> 'movement_type', (p_payload ->> 'quantity')::numeric, (p_payload ->> 'unit_cost')::numeric,
          (p_payload ->> 'movement_date')::date, coalesce(p_payload ->> 'reference_type', 'manual'), p_payload ->> 'notes',
          auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;

create function business_analysis.void_inventory_movement(p_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_m business_analysis.inventory_movements;
begin
  select * into v_m from business_analysis.inventory_movements where id = p_id for update;
  if not found then
    raise exception 'movement not found' using errcode = 'P0002';
  end if;
  perform business_analysis.assert_role(v_m.business_id, 'writer');
  if v_m.reference_type = 'purchase_order' then
    raise exception 'purchase receipts cannot be voided individually' using errcode = '55000';
  end if;
  -- A production batch is voided as a whole.
  update business_analysis.inventory_movements
     set voided_at = now(), void_reason = coalesce(nullif(btrim(p_reason), ''), 'voided')
   where business_id = v_m.business_id
     and voided_at is null
     and (id = p_id or (v_m.reference_type = 'production' and reference_id = v_m.reference_id));
end;
$$;

-- Records a production run: consumes each recipe material (with wastage) and
-- optionally adds the finished units to stock. This is the only place stock
-- is consumed for production.
create function business_analysis.record_production(
  p_business_id uuid, p_product_id uuid, p_quantity numeric, p_date date, p_notes text default null,
  p_add_finished_goods boolean default false)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_batch uuid := gen_random_uuid();
  v_cost record;
  v_consumed integer := 0;
begin
  perform business_analysis.assert_role(p_business_id, 'writer');
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'quantity must be positive' using errcode = '22023';
  end if;
  select * into v_cost from business_analysis.recipe_unit_cost(p_business_id, p_product_id, p_date);
  if v_cost.recipe_id is null then
    raise exception 'this product has no active recipe on that date' using errcode = '55000';
  end if;
  if p_add_finished_goods and v_cost.missing_components > 0 then
    raise exception 'some recipe components have no price on that date, so finished goods cannot be valued' using errcode = '55000';
  end if;

  insert into business_analysis.inventory_movements
    (business_id, material_id, movement_type, quantity, movement_date, reference_type, reference_id, notes, created_by)
  select p_business_id, i.material_id, 'consumption',
         -round(p_quantity * i.quantity * (1 + i.wastage_percent / 100.0), 3),
         p_date, 'production', v_batch, p_notes, auth.uid()
    from business_analysis.product_recipe_items i
   where i.recipe_id = v_cost.recipe_id and i.business_id = p_business_id and i.material_id is not null;
  get diagnostics v_consumed = row_count;

  if p_add_finished_goods then
    insert into business_analysis.inventory_movements
      (business_id, product_id, movement_type, quantity, unit_cost, movement_date, reference_type, reference_id, notes, created_by)
    values (p_business_id, p_product_id, 'production_output', p_quantity,
            v_cost.material_cost + v_cost.packaging_cost + v_cost.other_cost, p_date, 'production', v_batch, p_notes, auth.uid());
  end if;

  if v_consumed = 0 and not p_add_finished_goods then
    raise exception 'the recipe has no stocked materials to consume' using errcode = '55000';
  end if;
  return v_batch;
end;
$$;

-- ---- Purchase orders ---------------------------------------------------------

create function business_analysis.save_purchase_order(p_business_id uuid, p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid := nullif(p_payload ->> 'id', '')::uuid;
  v_status text;
begin
  perform business_analysis.assert_role(p_business_id, 'writer');
  if jsonb_typeof(p_payload -> 'items') <> 'array' or jsonb_array_length(p_payload -> 'items') = 0 then
    raise exception 'a purchase order needs at least one item' using errcode = '22023';
  end if;

  if v_id is null then
    insert into business_analysis.purchase_orders
      (business_id, supplier_id, po_number, order_date, expected_date, status, notes, created_by)
    values (p_business_id, (p_payload ->> 'supplier_id')::uuid, btrim(p_payload ->> 'po_number'),
            (p_payload ->> 'order_date')::date, (p_payload ->> 'expected_date')::date,
            coalesce(p_payload ->> 'status', 'ordered'), p_payload ->> 'notes', auth.uid())
    returning id into v_id;
  else
    select status into v_status from business_analysis.purchase_orders
     where id = v_id and business_id = p_business_id for update;
    if v_status is null then
      raise exception 'purchase order not found' using errcode = 'P0002';
    end if;
    if v_status not in ('draft', 'ordered') then
      raise exception 'a % purchase order cannot be edited', v_status using errcode = '55000';
    end if;
    update business_analysis.purchase_orders
       set supplier_id = (p_payload ->> 'supplier_id')::uuid, po_number = btrim(p_payload ->> 'po_number'),
           order_date = (p_payload ->> 'order_date')::date, expected_date = (p_payload ->> 'expected_date')::date,
           status = coalesce(p_payload ->> 'status', status), notes = p_payload ->> 'notes'
     where id = v_id;
    delete from business_analysis.purchase_order_items where purchase_order_id = v_id and business_id = p_business_id;
  end if;

  insert into business_analysis.purchase_order_items (business_id, purchase_order_id, material_id, quantity, unit_price, tax_rate)
  select p_business_id, v_id, (x ->> 'material_id')::uuid, (x ->> 'quantity')::numeric, (x ->> 'unit_price')::numeric,
         coalesce((x ->> 'tax_rate')::numeric, 0)
    from jsonb_array_elements(p_payload -> 'items') x;

  update business_analysis.purchase_orders po
     set subtotal = t.subtotal, tax_total = t.tax, total = t.subtotal + t.tax
    from (select coalesce(sum(line_subtotal), 0) as subtotal, coalesce(sum(tax_amount), 0) as tax
            from business_analysis.purchase_order_items where purchase_order_id = v_id) t
   where po.id = v_id;
  return v_id;
end;
$$;

create function business_analysis.receive_purchase_order(
  p_po_id uuid, p_received_on date, p_update_material_costs boolean default true)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_po business_analysis.purchase_orders;
begin
  select * into v_po from business_analysis.purchase_orders where id = p_po_id for update;
  if not found then
    raise exception 'purchase order not found' using errcode = 'P0002';
  end if;
  perform business_analysis.assert_role(v_po.business_id, 'writer');
  if v_po.status not in ('draft', 'ordered') then
    raise exception 'a % purchase order cannot be received', v_po.status using errcode = '55000';
  end if;

  -- Inventory is valued at the pre-tax price; GST is tracked on the PO.
  insert into business_analysis.inventory_movements
    (business_id, material_id, movement_type, quantity, unit_cost, movement_date, reference_type, reference_id, notes, created_by)
  select v_po.business_id, i.material_id, 'purchase', i.quantity, i.unit_price, p_received_on, 'purchase_order', v_po.id,
         'PO ' || v_po.po_number, auth.uid()
    from business_analysis.purchase_order_items i
   where i.purchase_order_id = v_po.id and i.business_id = v_po.business_id;

  if p_update_material_costs then
    insert into business_analysis.material_cost_versions (business_id, material_id, effective_from, unit_cost, source, note, created_by)
    select v_po.business_id, i.material_id, p_received_on, round(sum(i.quantity * i.unit_price) / sum(i.quantity), 4),
           'purchase_order', 'PO ' || v_po.po_number, auth.uid()
      from business_analysis.purchase_order_items i
     where i.purchase_order_id = v_po.id and i.business_id = v_po.business_id
     group by i.material_id
    on conflict (material_id, effective_from) do update set unit_cost = excluded.unit_cost, source = excluded.source, note = excluded.note;
  end if;

  update business_analysis.purchase_orders set status = 'received', received_on = p_received_on where id = v_po.id;
end;
$$;

create function business_analysis.pay_purchase_order(
  p_po_id uuid, p_paid_on date, p_method text, p_reference text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_po business_analysis.purchase_orders;
begin
  select * into v_po from business_analysis.purchase_orders where id = p_po_id for update;
  if not found then
    raise exception 'purchase order not found' using errcode = 'P0002';
  end if;
  perform business_analysis.assert_role(v_po.business_id, 'writer');
  if v_po.status = 'cancelled' then
    raise exception 'a cancelled purchase order cannot be paid' using errcode = '55000';
  end if;
  if v_po.payment_status = 'paid' then
    raise exception 'this purchase order is already paid' using errcode = '55000';
  end if;

  update business_analysis.purchase_orders
     set payment_status = 'paid', payment_date = p_paid_on, payment_method = p_method, payment_reference = p_reference
   where id = v_po.id;

  insert into business_analysis.cash_transactions
    (business_id, txn_date, direction, txn_type, amount, payment_account, external_reference, description,
     linked_purchase_order_id, source, created_by)
  values (v_po.business_id, p_paid_on, 'out', 'purchase_payment', v_po.total, p_method, p_reference,
          'PO ' || v_po.po_number, v_po.id, 'system', auth.uid());
end;
$$;

create function business_analysis.cancel_purchase_order(p_po_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_po business_analysis.purchase_orders;
begin
  select * into v_po from business_analysis.purchase_orders where id = p_po_id for update;
  if not found then
    raise exception 'purchase order not found' using errcode = 'P0002';
  end if;
  perform business_analysis.assert_role(v_po.business_id, 'writer');
  if v_po.status not in ('draft', 'ordered') or v_po.payment_status = 'paid' then
    raise exception 'only unpaid, unreceived purchase orders can be cancelled' using errcode = '55000';
  end if;
  update business_analysis.purchase_orders set status = 'cancelled' where id = v_po.id;
end;
$$;

-- =============================================================================
-- 14. Function privileges
-- =============================================================================

revoke execute on all functions in schema business_analysis from public, anon;

grant execute on function
  business_analysis.member_business_ids(text),
  business_analysis.assert_role(uuid, text),
  business_analysis.settings_at(uuid, date),
  business_analysis.recipe_unit_cost(uuid, uuid, date),
  business_analysis.status_rank(text),
  business_analysis.line_contribution(text, numeric, numeric, numeric, text[], text[], numeric),
  business_analysis.recon_status(numeric, bigint, bigint, numeric, numeric, numeric, boolean),
  business_analysis.recurrence_dates(jsonb, date),
  business_analysis.order_daily_metrics(uuid, date, date, text, text, text, text[], text),
  business_analysis.settlement_daily_metrics(uuid, date, date, text, text, text, text[]),
  business_analysis.expense_daily_metrics(uuid, date, date),
  business_analysis.ad_daily_metrics(uuid, date, date),
  business_analysis.cash_daily_metrics(uuid, date, date),
  business_analysis.sku_profitability(uuid, date, date, text[], text[], numeric, text, text),
  business_analysis.order_lines_page(uuid, date, date, text[], text[], text[], numeric, numeric, text, text, text[], text, text, text, text, boolean, integer, integer),
  business_analysis.reconciliation_summary(uuid, date, date, text[], numeric),
  business_analysis.reconciliation_lines(uuid, date, date, text[], numeric, text, text, integer, integer),
  business_analysis.shipped_units_by_product(uuid, date, date, text[]),
  business_analysis.ad_campaign_summary(uuid, date, date),
  business_analysis.bootstrap_business(text, text, jsonb),
  business_analysis.add_member_by_email(uuid, text, text),
  business_analysis.update_member(uuid, text, boolean),
  business_analysis.refresh_order_costs(uuid, date, date, text, timestamptz, integer),
  business_analysis.create_manual_order(uuid, jsonb),
  business_analysis.update_order_item(uuid, jsonb),
  business_analysis.commit_import_batch(uuid, integer, boolean),
  business_analysis.rollback_import_batch(uuid, text, integer),
  business_analysis.match_settlement_item(uuid, uuid),
  business_analysis.record_bank_receipt(uuid, numeric, date, text, numeric),
  business_analysis.save_expense(uuid, jsonb),
  business_analysis.reverse_expense(uuid, text, text, date),
  business_analysis.generate_recurring_expenses(uuid, date),
  business_analysis.record_cash_transaction(uuid, jsonb),
  business_analysis.void_cash_transaction(uuid, text),
  business_analysis.record_inventory_movement(uuid, jsonb),
  business_analysis.void_inventory_movement(uuid, text),
  business_analysis.record_production(uuid, uuid, numeric, date, text, boolean),
  business_analysis.save_purchase_order(uuid, jsonb),
  business_analysis.receive_purchase_order(uuid, date, boolean),
  business_analysis.pay_purchase_order(uuid, date, text, text),
  business_analysis.cancel_purchase_order(uuid)
to authenticated;

grant select on business_analysis.v_line_settlements to authenticated;
grant usage on schema business_analysis to service_role;
grant execute on all functions in schema business_analysis to service_role;

-- Internal helpers (_commit_*, _apply_cost_snapshot, _refresh_settlements,
-- _sync_expense_cash, _recount_import, _resolve_gst, write_audit,
-- audit_row_change) are deliberately NOT granted to authenticated: they skip
-- authorization and are only reachable through the checked functions above.

-- =============================================================================
-- 15. Private document storage
-- =============================================================================

-- Original reports and receipts are stored under <business_id>/... in a
-- private bucket. Downloads use short-lived signed URLs generated server-side.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'business-analysis', 'business-analysis', false, 26214400,
  array[
    'text/csv', 'text/plain', 'application/csv', 'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/pdf',
    'image/jpeg', 'image/png', 'image/webp', 'application/octet-stream'])
on conflict (id) do update set public = false;

create policy business_analysis_documents_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'business-analysis'
    and (storage.foldername(name))[1] in (
      select b::text from business_analysis.member_business_ids('writer') as b));

create policy business_analysis_documents_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'business-analysis'
    and (storage.foldername(name))[1] in (
      select b::text from business_analysis.member_business_ids('writer') as b));

commit;
