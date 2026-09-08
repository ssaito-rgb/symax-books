-- Pin search_path on SECURITY-sensitive functions (Supabase linter: function_search_path_mutable)

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
$$ language plpgsql
set search_path = public;

create or replace function create_journal_entry(header jsonb, lines jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public
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
