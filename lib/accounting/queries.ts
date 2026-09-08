import { createClient } from "@/lib/supabase/server";
import type {
  Account,
  Counterparty,
  FiscalYear,
  PostedLine,
  TaxCategory,
} from "@/lib/accounting/types";

export async function getAccounts(includeInactive = false): Promise<Account[]> {
  const supabase = await createClient();
  let query = supabase.from("chart_of_accounts").select("*").order("code");
  if (!includeInactive) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) throw error;
  return data as Account[];
}

export async function getFiscalYears(): Promise<FiscalYear[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("fiscal_years")
    .select("*")
    .order("start_date", { ascending: false });
  if (error) throw error;
  return data as FiscalYear[];
}

export async function getCounterparties(): Promise<Counterparty[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("counterparties").select("*").order("name");
  if (error) throw error;
  return data as Counterparty[];
}

export async function getTaxCategories(): Promise<TaxCategory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tax_categories")
    .select("*")
    .eq("is_active", true)
    .order("code");
  if (error) throw error;
  return data as TaxCategory[];
}

/** All journal lines joined with their entry header, flattened. Fine at this company's data volume. */
export async function getPostedLines(): Promise<PostedLine[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("journal_lines")
    .select(
      `id, account_id, counterparty_id, debit_amount, credit_amount,
       tax_category_code, tax_amount, description, evidence_url,
       journal_entries ( id, entry_number, entry_date, fiscal_year_id, description, is_voided )`,
    );
  if (error) throw error;

  return (data ?? []).map((l) => {
    const entry = Array.isArray(l.journal_entries) ? l.journal_entries[0] : l.journal_entries;
    return {
      line_id: l.id,
      entry_id: entry.id,
      entry_number: entry.entry_number,
      entry_date: entry.entry_date,
      fiscal_year_id: entry.fiscal_year_id,
      entry_description: entry.description,
      is_voided: entry.is_voided,
      account_id: l.account_id,
      counterparty_id: l.counterparty_id,
      debit_amount: Number(l.debit_amount),
      credit_amount: Number(l.credit_amount),
      tax_category_code: l.tax_category_code,
      tax_amount: l.tax_amount === null ? null : Number(l.tax_amount),
      line_description: l.description,
      evidence_url: l.evidence_url,
    } satisfies PostedLine;
  });
}

export async function createJournalEntry(
  header: {
    entry_number: string;
    fiscal_year_id: string;
    entry_date: string;
    description?: string;
    evidence_url?: string;
  },
  lines: Array<{
    account_id: string;
    counterparty_id?: string | null;
    debit_amount: number;
    credit_amount: number;
    tax_category_code?: string | null;
    tax_amount?: number | null;
    description?: string;
    evidence_url?: string;
  }>,
) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_journal_entry", {
    header,
    lines,
  });
  if (error) throw error;
  return data as string;
}

/** Running per-fiscal-year counter, zero-padded. Fine for single-user, low-volume bookkeeping. */
export async function nextEntryNumber(fiscalYearId: string): Promise<string> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("journal_entries")
    .select("id", { count: "exact", head: true })
    .eq("fiscal_year_id", fiscalYearId);
  if (error) throw error;
  return String((count ?? 0) + 1).padStart(4, "0");
}

/** Never hard-deletes: posts an auto-generated reversing entry and flags the original voided. */
export async function voidJournalEntry(entryId: string, fiscalYearId: string) {
  const supabase = await createClient();
  const newEntryNumber = await nextEntryNumber(fiscalYearId);
  const { error } = await supabase.rpc("void_journal_entry", {
    p_entry_id: entryId,
    p_new_entry_number: newEntryNumber,
  });
  if (error) throw error;
}
