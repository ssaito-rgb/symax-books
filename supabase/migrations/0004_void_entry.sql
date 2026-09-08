-- Void via reversing entry (never hard-delete or silently hide posted entries).
create or replace function void_journal_entry(p_entry_id uuid, p_new_entry_number text)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_original journal_entries%rowtype;
  v_new_entry_id uuid;
  v_line record;
begin
  select * into v_original from journal_entries where id = p_entry_id;
  if not found then
    raise exception '仕訳が見つかりません: %', p_entry_id;
  end if;
  if v_original.is_voided then
    raise exception 'この仕訳は既に取消済みです: %', p_entry_id;
  end if;

  insert into journal_entries (entry_number, fiscal_year_id, entry_date, description, source, reverses_entry_id, created_by)
  values (
    p_new_entry_number,
    v_original.fiscal_year_id,
    current_date,
    concat('取消: ', coalesce(v_original.description, v_original.entry_number)),
    'system',
    p_entry_id,
    auth.uid()
  )
  returning id into v_new_entry_id;

  for v_line in select * from journal_lines where entry_id = p_entry_id order by line_no loop
    insert into journal_lines (
      entry_id, line_no, account_id, counterparty_id,
      debit_amount, credit_amount, tax_category_code, tax_amount,
      description, evidence_url
    ) values (
      v_new_entry_id, v_line.line_no, v_line.account_id, v_line.counterparty_id,
      v_line.credit_amount, v_line.debit_amount, v_line.tax_category_code, v_line.tax_amount,
      concat('取消: ', coalesce(v_line.description, '')), v_line.evidence_url
    );
  end loop;

  update journal_entries set is_voided = true, reversed_by_entry_id = v_new_entry_id, updated_at = now()
    where id = p_entry_id;

  return v_new_entry_id;
end;
$$;
