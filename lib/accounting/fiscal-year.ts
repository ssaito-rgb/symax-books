import type { FiscalYear } from "@/lib/accounting/types";

export function pickCurrentFiscalYear(fiscalYears: FiscalYear[]): FiscalYear | null {
  if (fiscalYears.length === 0) return null;
  const today = new Date().toISOString().slice(0, 10);
  const containing = fiscalYears.find((fy) => fy.start_date <= today && today <= fy.end_date);
  if (containing) return containing;
  // fiscalYears is expected sorted by start_date desc (see getFiscalYears)
  return fiscalYears[0];
}

export function formatYen(amount: number): string {
  return `¥${Math.round(amount).toLocaleString("ja-JP")}`;
}
