-- Phase 3: 買掛金（仕入請求書）・売掛金（売上請求書）
-- 借方・貸方はユーザーに見せず、業務言葉のフォームから複式仕訳を自動生成する。

-- ============ 新規勘定科目：売掛金 ============
insert into chart_of_accounts (code, name, category, subcategory, normal_balance, requires_counterparty, description)
values ('1003', '売掛金', 'asset', '流動資産', 'debit', true, 'クライアントへの請求書発行に伴う売上債権')
on conflict (code) do nothing;

-- ============ 買掛金（仕入請求書） ============
create table purchase_invoices (
  id uuid primary key default gen_random_uuid(),
  counterparty_id uuid not null references counterparties(id),
  vendor_invoice_number text,
  received_date date not null,
  due_date date,
  amount numeric(14,0) not null check (amount > 0),
  expense_account_id uuid not null references chart_of_accounts(id),
  fiscal_year_id uuid not null references fiscal_years(id),
  status text not null default 'unpaid' check (status in ('unpaid','paid','void')),
  evidence_url text,
  journal_entry_id uuid references journal_entries(id),
  payment_journal_entry_id uuid references journal_entries(id),
  paid_date date,
  paid_amount numeric(14,0),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table purchase_invoices enable row level security;
create policy "authenticated read/write" on purchase_invoices for all
  using (auth.uid() is not null) with check (auth.uid() is not null);

-- ============ 売掛金（売上請求書） ============
create table sales_invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text unique,
  counterparty_id uuid not null references counterparties(id),
  fiscal_year_id uuid not null references fiscal_years(id),
  issue_date date not null,
  due_date date,
  status text not null default 'draft' check (status in ('draft','finalized','sent','paid','void')),
  notes text,
  journal_entry_id uuid references journal_entries(id),
  payment_journal_entry_id uuid references journal_entries(id),
  paid_date date,
  paid_amount numeric(14,0),
  sent_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table sales_invoices enable row level security;
create policy "authenticated read/write" on sales_invoices for all
  using (auth.uid() is not null) with check (auth.uid() is not null);

create table sales_invoice_lines (
  id uuid primary key default gen_random_uuid(),
  sales_invoice_id uuid not null references sales_invoices(id) on delete cascade,
  line_no int not null,
  description text not null,
  revenue_account_id uuid not null references chart_of_accounts(id),
  quantity numeric(10,2) not null default 1,
  unit_price numeric(14,0) not null,
  amount numeric(14,0) not null,
  unique (sales_invoice_id, line_no)
);

alter table sales_invoice_lines enable row level security;
create policy "authenticated read/write" on sales_invoice_lines for all
  using (auth.uid() is not null) with check (auth.uid() is not null);

-- ============ 請求書番号の採番（会計期間ごとの連番、行ロックで安全に発番） ============
create table invoice_number_counters (
  fiscal_year_id uuid primary key references fiscal_years(id),
  last_number int not null default 0
);

alter table invoice_number_counters enable row level security;
create policy "authenticated read/write" on invoice_number_counters for all
  using (auth.uid() is not null) with check (auth.uid() is not null);

create or replace function next_invoice_number(p_fiscal_year_id uuid)
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_year text;
  v_next int;
begin
  insert into invoice_number_counters (fiscal_year_id, last_number)
    values (p_fiscal_year_id, 0)
    on conflict (fiscal_year_id) do nothing;

  update invoice_number_counters
    set last_number = last_number + 1
    where fiscal_year_id = p_fiscal_year_id
    returning last_number into v_next;

  select to_char(start_date, 'YYYY') into v_year from fiscal_years where id = p_fiscal_year_id;

  return 'INV-' || v_year || '-' || lpad(v_next::text, 4, '0');
end;
$$;

-- ============ 仕訳番号の採番（既存アプリのnextEntryNumberと同じcount()ベースの簡易方式） ============
create or replace function next_entry_number(p_fiscal_year_id uuid)
returns text
language sql
security invoker
set search_path = public
as $$
  select lpad((count(*) + 1)::text, 4, '0') from journal_entries where fiscal_year_id = p_fiscal_year_id;
$$;

-- ============ 買掛金：登録（未払金の計上仕訳を同時生成） ============
create or replace function record_purchase_invoice(header jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_fiscal_year_id uuid := (header->>'fiscal_year_id')::uuid;
  v_counterparty_id uuid := (header->>'counterparty_id')::uuid;
  v_expense_account_id uuid := (header->>'expense_account_id')::uuid;
  v_amount numeric := (header->>'amount')::numeric;
  v_received_date date := (header->>'received_date')::date;
  v_payable_account_id uuid;
  v_entry_id uuid;
  v_invoice_id uuid;
begin
  select id into v_payable_account_id from chart_of_accounts where code = '2002';

  insert into journal_entries (entry_number, fiscal_year_id, entry_date, description, source, evidence_url, created_by)
  values (
    next_entry_number(v_fiscal_year_id),
    v_fiscal_year_id,
    v_received_date,
    concat('仕入請求書計上: ', coalesce(header->>'description', header->>'vendor_invoice_number', '')),
    'system',
    header->>'evidence_url',
    auth.uid()
  ) returning id into v_entry_id;

  insert into journal_lines (entry_id, line_no, account_id, debit_amount, credit_amount, description, evidence_url)
  values (v_entry_id, 1, v_expense_account_id, v_amount, 0, header->>'description', header->>'evidence_url');

  insert into journal_lines (entry_id, line_no, account_id, counterparty_id, debit_amount, credit_amount, description)
  values (v_entry_id, 2, v_payable_account_id, v_counterparty_id, 0, v_amount, header->>'vendor_invoice_number');

  insert into purchase_invoices (
    counterparty_id, vendor_invoice_number, received_date, due_date, amount,
    expense_account_id, fiscal_year_id, evidence_url, journal_entry_id, created_by
  ) values (
    v_counterparty_id, header->>'vendor_invoice_number', v_received_date,
    nullif(header->>'due_date','')::date, v_amount,
    v_expense_account_id, v_fiscal_year_id, header->>'evidence_url', v_entry_id, auth.uid()
  ) returning id into v_invoice_id;

  return v_invoice_id;
end;
$$;

-- ============ 買掛金：支払記録（未払金の消込仕訳を同時生成） ============
create or replace function mark_purchase_invoice_paid(p_invoice_id uuid, p_paid_date date, p_paid_amount numeric)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_invoice purchase_invoices%rowtype;
  v_payable_account_id uuid;
  v_bank_account_id uuid;
  v_entry_id uuid;
begin
  select * into v_invoice from purchase_invoices where id = p_invoice_id;
  if not found then
    raise exception '買掛金レコードが見つかりません: %', p_invoice_id;
  end if;
  if v_invoice.status <> 'unpaid' then
    raise exception 'この買掛金は既に支払済み・無効です: %', p_invoice_id;
  end if;

  select id into v_payable_account_id from chart_of_accounts where code = '2002';
  select id into v_bank_account_id from chart_of_accounts where code = '1002';

  insert into journal_entries (entry_number, fiscal_year_id, entry_date, description, source, created_by)
  values (
    next_entry_number(v_invoice.fiscal_year_id),
    v_invoice.fiscal_year_id,
    p_paid_date,
    '仕入請求書支払',
    'system',
    auth.uid()
  ) returning id into v_entry_id;

  insert into journal_lines (entry_id, line_no, account_id, counterparty_id, debit_amount, credit_amount)
  values (v_entry_id, 1, v_payable_account_id, v_invoice.counterparty_id, p_paid_amount, 0);

  insert into journal_lines (entry_id, line_no, account_id, debit_amount, credit_amount)
  values (v_entry_id, 2, v_bank_account_id, 0, p_paid_amount);

  update purchase_invoices
    set status = 'paid', paid_date = p_paid_date, paid_amount = p_paid_amount, payment_journal_entry_id = v_entry_id
    where id = p_invoice_id;
end;
$$;

-- ============ 売掛金：請求書確定（売掛金の計上仕訳と請求書番号を同時発行） ============
create or replace function finalize_sales_invoice(p_invoice_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_invoice sales_invoices%rowtype;
  v_receivable_account_id uuid;
  v_entry_id uuid;
  v_invoice_number text;
  v_line_no int := 2;
  v_total numeric := 0;
  v_group record;
begin
  select * into v_invoice from sales_invoices where id = p_invoice_id;
  if not found then
    raise exception '請求書が見つかりません: %', p_invoice_id;
  end if;
  if v_invoice.status <> 'draft' then
    raise exception 'この請求書は既に確定済みです: %', p_invoice_id;
  end if;

  select id into v_receivable_account_id from chart_of_accounts where code = '1003';
  v_invoice_number := next_invoice_number(v_invoice.fiscal_year_id);

  insert into journal_entries (entry_number, fiscal_year_id, entry_date, description, source, created_by)
  values (
    next_entry_number(v_invoice.fiscal_year_id),
    v_invoice.fiscal_year_id,
    v_invoice.issue_date,
    concat('売上請求書: ', v_invoice_number),
    'system',
    auth.uid()
  ) returning id into v_entry_id;

  select coalesce(sum(amount), 0) into v_total from sales_invoice_lines where sales_invoice_id = p_invoice_id;
  if v_total <= 0 then
    raise exception '請求書の明細金額が0円以下です: %', p_invoice_id;
  end if;

  insert into journal_lines (entry_id, line_no, account_id, counterparty_id, debit_amount, credit_amount)
  values (v_entry_id, 1, v_receivable_account_id, v_invoice.counterparty_id, v_total, 0);

  for v_group in
    select revenue_account_id, sum(amount) as amount
    from sales_invoice_lines
    where sales_invoice_id = p_invoice_id
    group by revenue_account_id
  loop
    insert into journal_lines (entry_id, line_no, account_id, debit_amount, credit_amount)
    values (v_entry_id, v_line_no, v_group.revenue_account_id, 0, v_group.amount);
    v_line_no := v_line_no + 1;
  end loop;

  update sales_invoices
    set status = 'finalized', invoice_number = v_invoice_number, journal_entry_id = v_entry_id
    where id = p_invoice_id;
end;
$$;

-- ============ 売掛金：入金消込（普通預金への入金仕訳を同時生成） ============
create or replace function record_sales_invoice_payment(p_invoice_id uuid, p_received_date date, p_amount numeric)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_invoice sales_invoices%rowtype;
  v_receivable_account_id uuid;
  v_bank_account_id uuid;
  v_entry_id uuid;
begin
  select * into v_invoice from sales_invoices where id = p_invoice_id;
  if not found then
    raise exception '請求書が見つかりません: %', p_invoice_id;
  end if;
  if v_invoice.status not in ('finalized','sent') then
    raise exception 'この請求書は入金消込できる状態ではありません: %', p_invoice_id;
  end if;

  select id into v_receivable_account_id from chart_of_accounts where code = '1003';
  select id into v_bank_account_id from chart_of_accounts where code = '1002';

  insert into journal_entries (entry_number, fiscal_year_id, entry_date, description, source, created_by)
  values (
    next_entry_number(v_invoice.fiscal_year_id),
    v_invoice.fiscal_year_id,
    p_received_date,
    concat('入金消込: ', v_invoice.invoice_number),
    'system',
    auth.uid()
  ) returning id into v_entry_id;

  insert into journal_lines (entry_id, line_no, account_id, debit_amount, credit_amount)
  values (v_entry_id, 1, v_bank_account_id, p_amount, 0);

  insert into journal_lines (entry_id, line_no, account_id, counterparty_id, debit_amount, credit_amount)
  values (v_entry_id, 2, v_receivable_account_id, v_invoice.counterparty_id, 0, p_amount);

  update sales_invoices
    set status = 'paid', paid_date = p_received_date, paid_amount = p_amount, payment_journal_entry_id = v_entry_id
    where id = p_invoice_id;
end;
$$;
