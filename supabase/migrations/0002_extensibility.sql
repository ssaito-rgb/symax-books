-- Schema-only extensibility tables for future tax-filing support.
-- No calculation logic yet (depreciation, 別表4 math) — these are worksheets/masters
-- populated manually in Phase 1, with logic to be added in a later phase.

create table fixed_assets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  account_id uuid not null references chart_of_accounts(id),
  acquisition_date date not null,
  acquisition_cost numeric(14,0) not null,
  useful_life_years int,
  depreciation_method text check (depreciation_method in ('straight_line','declining_balance')),
  asset_class_code text,
  salvage_value numeric(14,0) default 1,
  is_small_amount_depreciable boolean default false,
  disposal_date date,
  disposal_amount numeric(14,0),
  evidence_url text,
  notes text,
  created_at timestamptz not null default now()
);

create table depreciation_schedule_lines (
  id uuid primary key default gen_random_uuid(),
  fixed_asset_id uuid not null references fixed_assets(id) on delete cascade,
  fiscal_year_id uuid not null references fiscal_years(id),
  depreciation_amount numeric(14,0) not null,
  accumulated_depreciation numeric(14,0) not null,
  book_value_end numeric(14,0) not null,
  journal_entry_id uuid references journal_entries(id),
  created_at timestamptz not null default now(),
  unique (fixed_asset_id, fiscal_year_id)
);

create table tax_adjustments (
  id uuid primary key default gen_random_uuid(),
  fiscal_year_id uuid not null references fiscal_years(id),
  direction text not null check (direction in ('addition','subtraction')),
  item_name text not null,
  amount numeric(14,0) not null,
  related_account_id uuid references chart_of_accounts(id),
  related_journal_entry_id uuid references journal_entries(id),
  status text not null default 'draft' check (status in ('draft','confirmed')),
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table fixed_assets enable row level security;
alter table depreciation_schedule_lines enable row level security;
alter table tax_adjustments enable row level security;

create policy "authenticated read/write" on fixed_assets for all
  using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "authenticated read/write" on depreciation_schedule_lines for all
  using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "authenticated read/write" on tax_adjustments for all
  using (auth.uid() is not null) with check (auth.uid() is not null);
