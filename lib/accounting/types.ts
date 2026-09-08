export type Account = {
  id: string;
  code: string;
  name: string;
  category: "asset" | "liability" | "equity" | "revenue" | "expense";
  subcategory: string | null;
  normal_balance: "debit" | "credit";
  default_tax_category_code: string | null;
  requires_counterparty: boolean;
  is_active: boolean;
  description: string | null;
};

export type FiscalYear = {
  id: string;
  label: string;
  start_date: string;
  end_date: string;
  tax_status: "undetermined" | "exempt" | "taxable_general" | "taxable_simplified";
  is_closed: boolean;
};

export type Counterparty = {
  id: string;
  name: string;
  kana: string | null;
  is_qualified_invoice_issuer: boolean | null;
  notes: string | null;
};

export type TaxCategory = {
  code: string;
  name: string;
  rate: number;
  direction: "sales" | "purchases" | "none";
};

/** A journal_line joined with its parent entry and account, flattened for reporting. */
export type PostedLine = {
  line_id: string;
  entry_id: string;
  entry_number: string;
  entry_date: string;
  fiscal_year_id: string;
  entry_description: string | null;
  is_voided: boolean;
  account_id: string;
  counterparty_id: string | null;
  debit_amount: number;
  credit_amount: number;
  tax_category_code: string | null;
  tax_amount: number | null;
  line_description: string | null;
  evidence_url: string | null;
};

export type JournalLineDraft = {
  account_id: string;
  counterparty_id?: string | null;
  debit_amount: number;
  credit_amount: number;
  tax_category_code?: string | null;
  tax_amount?: number | null;
  description?: string;
  evidence_url?: string;
};
