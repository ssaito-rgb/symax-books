import type { JournalLineDraft } from "@/lib/accounting/types";

/** Client-side pre-check mirroring the DB's deferred balance trigger. Not a substitute for it. */
export function linesAreBalanced(lines: JournalLineDraft[]): boolean {
  const totalDebit = lines.reduce((sum, l) => sum + (l.debit_amount || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (l.credit_amount || 0), 0);
  return lines.length >= 2 && totalDebit === totalCredit && totalDebit > 0;
}

export function sumDebit(lines: JournalLineDraft[]): number {
  return lines.reduce((sum, l) => sum + (l.debit_amount || 0), 0);
}

export function sumCredit(lines: JournalLineDraft[]): number {
  return lines.reduce((sum, l) => sum + (l.credit_amount || 0), 0);
}
