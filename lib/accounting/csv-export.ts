import type { Account, Counterparty, PostedLine } from "@/lib/accounting/types";

/**
 * Generic backup/audit CSV — one row per journal line, plain and self-describing.
 * Not tied to any specific accounting software's import format.
 */
export function linesToCsv(
  lines: PostedLine[],
  accounts: Account[],
  counterparties: Counterparty[],
): string {
  const accountName = new Map(accounts.map((a) => [a.id, `${a.code} ${a.name}`]));
  const counterpartyName = new Map(counterparties.map((c) => [c.id, c.name]));

  const header = [
    "伝票番号",
    "日付",
    "勘定科目",
    "借方金額",
    "貸方金額",
    "取引先",
    "税区分",
    "税額",
    "摘要",
    "証憑リンク",
    "取消済み",
  ];

  const rows = lines
    .slice()
    .sort((a, b) => a.entry_date.localeCompare(b.entry_date) || a.entry_number.localeCompare(b.entry_number))
    .map((l) => [
      l.entry_number,
      l.entry_date,
      accountName.get(l.account_id) ?? l.account_id,
      l.debit_amount ? String(l.debit_amount) : "",
      l.credit_amount ? String(l.credit_amount) : "",
      l.counterparty_id ? (counterpartyName.get(l.counterparty_id) ?? "") : "",
      l.tax_category_code ?? "",
      l.tax_amount != null ? String(l.tax_amount) : "",
      l.line_description ?? l.entry_description ?? "",
      l.evidence_url ?? "",
      l.is_voided ? "取消済み" : "",
    ]);

  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const csvLines = [header, ...rows].map((row) => row.map(escape).join(","));
  return "﻿" + csvLines.join("\r\n");
}
