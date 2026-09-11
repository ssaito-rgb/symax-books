/**
 * Plain-language "品目" choices for the sales invoice form — the user picks one of these,
 * never a raw revenue account. Each maps to an existing chart_of_accounts code (seeded in
 * supabase/seed.sql). Resolve the code to an actual account id via the accounts list at
 * render time (ids are generated UUIDs, not stable across environments).
 */
export const INVOICE_ITEMS: { label: string; accountCode: string }[] = [
  { label: "研修費（コースS）", accountCode: "4001" },
  { label: "研修費（コースP）", accountCode: "4002" },
  { label: "コンサルティング費用", accountCode: "4003" },
  { label: "営業代行費用", accountCode: "4004" },
  { label: "教材費", accountCode: "4005" },
  { label: "その他", accountCode: "4009" },
];
