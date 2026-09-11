import { createClient } from "@/lib/supabase/server";
import type {
  Account,
  Counterparty,
  FiscalYear,
  PostedLine,
  PurchaseInvoice,
  SalesInvoice,
  SalesInvoiceLine,
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

// ============ 買掛金（仕入請求書） ============

export async function getPurchaseInvoices(): Promise<PurchaseInvoice[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("purchase_invoices")
    .select("*")
    .order("received_date", { ascending: false });
  if (error) throw error;
  return data as PurchaseInvoice[];
}

/** Records the invoice and posts the 借方[経費]/貸方 未払金 entry atomically via RPC. */
export async function recordPurchaseInvoice(header: {
  counterparty_id: string;
  vendor_invoice_number?: string;
  received_date: string;
  due_date?: string;
  amount: number;
  expense_account_id: string;
  fiscal_year_id: string;
  evidence_url?: string;
  description?: string;
}): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("record_purchase_invoice", { header });
  if (error) throw error;
  return data as string;
}

/** Marks the invoice paid and posts the 借方 未払金/貸方 普通預金 settling entry atomically. */
export async function markPurchaseInvoicePaid(invoiceId: string, paidDate: string, paidAmount: number) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_purchase_invoice_paid", {
    p_invoice_id: invoiceId,
    p_paid_date: paidDate,
    p_paid_amount: paidAmount,
  });
  if (error) throw error;
}

// ============ 売掛金（売上請求書） ============

export async function getSalesInvoices(): Promise<SalesInvoice[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sales_invoices")
    .select("*")
    .order("issue_date", { ascending: false });
  if (error) throw error;
  return data as SalesInvoice[];
}

export async function getSalesInvoice(id: string): Promise<SalesInvoice | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("sales_invoices").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as SalesInvoice | null;
}

export async function getSalesInvoiceLines(salesInvoiceId: string): Promise<SalesInvoiceLine[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sales_invoice_lines")
    .select("*")
    .eq("sales_invoice_id", salesInvoiceId)
    .order("line_no");
  if (error) throw error;
  return data as SalesInvoiceLine[];
}

/** Creates a draft invoice + its line items in one go (no journal entry yet — that happens on finalize). */
export async function createSalesInvoiceDraft(
  header: {
    counterparty_id: string;
    fiscal_year_id: string;
    issue_date: string;
    due_date?: string;
    notes?: string;
  },
  lines: Array<{
    description: string;
    revenue_account_id: string;
    quantity: number;
    unit_price: number;
    amount: number;
  }>,
): Promise<string> {
  const supabase = await createClient();
  const { data: invoice, error } = await supabase
    .from("sales_invoices")
    .insert({ ...header, created_by: (await supabase.auth.getUser()).data.user?.id })
    .select("id")
    .single();
  if (error) throw error;

  const { error: linesError } = await supabase.from("sales_invoice_lines").insert(
    lines.map((line, idx) => ({ ...line, sales_invoice_id: invoice.id, line_no: idx + 1 })),
  );
  if (linesError) throw linesError;

  return invoice.id as string;
}

/** Assigns the invoice number and posts the 借方 売掛金/貸方 各売上科目 entry atomically via RPC. */
export async function finalizeSalesInvoice(invoiceId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("finalize_sales_invoice", { p_invoice_id: invoiceId });
  if (error) throw error;
}

/** Marks the invoice as emailed. Plain single-table update — no journal entry involved. */
export async function markSalesInvoiceSent(invoiceId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("sales_invoices")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", invoiceId);
  if (error) throw error;
}

/** Records payment and posts the 借方 普通預金/貸方 売掛金 settling entry atomically via RPC. */
export async function recordSalesInvoicePayment(invoiceId: string, receivedDate: string, amount: number) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("record_sales_invoice_payment", {
    p_invoice_id: invoiceId,
    p_received_date: receivedDate,
    p_amount: amount,
  });
  if (error) throw error;
}
