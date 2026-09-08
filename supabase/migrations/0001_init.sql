-- Core double-entry bookkeeping schema for Symax Partners合同会社

create extension if not exists "pgcrypto";

-- ============ fiscal_years ============
create table fiscal_years (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  start_date date not null,
  end_date date not null,
  tax_status text not null default 'undetermined'
    check (tax_status in ('undetermined','exempt','taxable_general','taxable_simplified')),
  is_closed boolean not null default false,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (start_date, end_date)
);

-- ============ tax_categories (lookup, not hardcoded) ============
create table tax_categories (
  code text primary key,
  name text not null,
  rate numeric(5,2) not null default 0,
  direction text not null check (direction in ('sales','purchases','none')),
  is_active boolean not null default true
);

-- ============ chart_of_accounts ============
create table chart_of_accounts (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  category text not null
    check (category in ('asset','liability','equity','revenue','expense')),
  subcategory text,
  normal_balance text not null
    check (normal_balance in ('debit','credit')),
  default_tax_category_code text references tax_categories(code),
  requires_counterparty boolean not null default false,
  is_active boolean not null default true,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ counterparties (取引先マスタ) ============
create table counterparties (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kana text,
  is_qualified_invoice_issuer boolean,
  invoice_registration_number text,
  notes text,
  created_at timestamptz not null default now()
);

-- ============ journal_entries (伝票ヘッダ) ============
create table journal_entries (
  id uuid primary key default gen_random_uuid(),
  entry_number text not null,
  fiscal_year_id uuid not null references fiscal_years(id),
  entry_date date not null,
  description text,
  source text not null default 'manual'
    check (source in ('manual','import_legacy_sheet','system')),
  is_voided boolean not null default false,
  reverses_entry_id uuid references journal_entries(id),
  reversed_by_entry_id uuid references journal_entries(id),
  evidence_url text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (fiscal_year_id, entry_number)
);

-- ============ journal_lines (仕訳明細) ============
create table journal_lines (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references journal_entries(id) on delete cascade,
  line_no int not null,
  account_id uuid not null references chart_of_accounts(id),
  counterparty_id uuid references counterparties(id),
  debit_amount numeric(14,0) not null default 0 check (debit_amount >= 0),
  credit_amount numeric(14,0) not null default 0 check (credit_amount >= 0),
  tax_category_code text references tax_categories(code),
  tax_amount numeric(14,0),
  description text,
  evidence_url text,
  created_at timestamptz not null default now(),
  unique (entry_id, line_no),
  check (not (debit_amount > 0 and credit_amount > 0)),
  check (debit_amount > 0 or credit_amount > 0)
);

create index on journal_lines (account_id);
create index on journal_lines (counterparty_id);
create index on journal_entries (entry_date);
create index on journal_entries (fiscal_year_id);

-- ============ balanced-entry enforcement (deferred constraint trigger) ============
create or replace function check_entry_balanced() returns trigger as $$
declare
  v_entry_id uuid := coalesce(new.entry_id, old.entry_id);
  v_debit numeric;
  v_credit numeric;
begin
  select coalesce(sum(debit_amount),0), coalesce(sum(credit_amount),0)
    into v_debit, v_credit
  from journal_lines where entry_id = v_entry_id;
  if v_debit <> v_credit then
    raise exception '仕訳が貸借不一致です（entry_id=%, 借方=%, 貸方=%）', v_entry_id, v_debit, v_credit;
  end if;
  return null;
end;
$$ language plpgsql;

create constraint trigger trg_journal_lines_balanced
after insert or update or delete on journal_lines
deferrable initially deferred
for each row execute function check_entry_balanced();

-- ============ atomic write RPC ============
-- header: {fiscal_year_id, entry_date, description, evidence_url, entry_number}
-- lines: [{account_id, counterparty_id, debit_amount, credit_amount, tax_category_code, tax_amount, description, evidence_url}]
create or replace function create_journal_entry(header jsonb, lines jsonb)
returns uuid
language plpgsql
security invoker
as $$
declare
  v_entry_id uuid;
  v_line jsonb;
  v_line_no int := 1;
begin
  insert into journal_entries (
    entry_number, fiscal_year_id, entry_date, description, evidence_url, created_by
  ) values (
    header->>'entry_number',
    (header->>'fiscal_year_id')::uuid,
    (header->>'entry_date')::date,
    header->>'description',
    header->>'evidence_url',
    auth.uid()
  ) returning id into v_entry_id;

  for v_line in select * from jsonb_array_elements(lines) loop
    insert into journal_lines (
      entry_id, line_no, account_id, counterparty_id,
      debit_amount, credit_amount, tax_category_code, tax_amount,
      description, evidence_url
    ) values (
      v_entry_id, v_line_no,
      (v_line->>'account_id')::uuid,
      nullif(v_line->>'counterparty_id','')::uuid,
      coalesce((v_line->>'debit_amount')::numeric, 0),
      coalesce((v_line->>'credit_amount')::numeric, 0),
      nullif(v_line->>'tax_category_code',''),
      nullif(v_line->>'tax_amount','')::numeric,
      v_line->>'description',
      v_line->>'evidence_url'
    );
    v_line_no := v_line_no + 1;
  end loop;

  return v_entry_id;
end;
$$;

-- ============ Row Level Security ============
alter table fiscal_years enable row level security;
alter table tax_categories enable row level security;
alter table chart_of_accounts enable row level security;
alter table counterparties enable row level security;
alter table journal_entries enable row level security;
alter table journal_lines enable row level security;

create policy "authenticated read/write" on fiscal_years for all
  using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "authenticated read/write" on tax_categories for all
  using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "authenticated read/write" on chart_of_accounts for all
  using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "authenticated read/write" on counterparties for all
  using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "authenticated read/write" on journal_entries for all
  using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "authenticated read/write" on journal_lines for all
  using (auth.uid() is not null) with check (auth.uid() is not null);
