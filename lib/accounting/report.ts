import type { Account, FiscalYear, PostedLine } from "@/lib/accounting/types";

/** Signed delta on the account's normal-balance side (positive = normal-side balance grew). */
function normalDelta(line: PostedLine, normalBalance: "debit" | "credit"): number {
  const raw = line.debit_amount - line.credit_amount;
  return normalBalance === "debit" ? raw : -raw;
}

export function activeLines(lines: PostedLine[]): PostedLine[] {
  return lines.filter((l) => !l.is_voided);
}

function accountMap(accounts: Account[]): Map<string, Account> {
  return new Map(accounts.map((a) => [a.id, a]));
}

export type TrialBalanceRow = {
  account: Account;
  openingBalance: number;
  periodDebit: number;
  periodCredit: number;
  closingBalance: number;
};

export function computeTrialBalance(
  lines: PostedLine[],
  accounts: Account[],
  fiscalYear: FiscalYear,
): { rows: TrialBalanceRow[]; totalPeriodDebit: number; totalPeriodCredit: number } {
  const live = activeLines(lines);
  const rows: TrialBalanceRow[] = accounts.map((account) => {
    const accountLines = live.filter((l) => l.account_id === account.id);
    const openingLines = accountLines.filter((l) => l.entry_date < fiscalYear.start_date);
    const periodLines = accountLines.filter(
      (l) => l.entry_date >= fiscalYear.start_date && l.entry_date <= fiscalYear.end_date,
    );
    const openingBalance = openingLines.reduce(
      (sum, l) => sum + normalDelta(l, account.normal_balance),
      0,
    );
    const periodDebit = periodLines.reduce((sum, l) => sum + l.debit_amount, 0);
    const periodCredit = periodLines.reduce((sum, l) => sum + l.credit_amount, 0);
    const closingBalance =
      openingBalance +
      periodLines.reduce((sum, l) => sum + normalDelta(l, account.normal_balance), 0);
    return { account, openingBalance, periodDebit, periodCredit, closingBalance };
  });

  return {
    rows,
    totalPeriodDebit: rows.reduce((sum, r) => sum + r.periodDebit, 0),
    totalPeriodCredit: rows.reduce((sum, r) => sum + r.periodCredit, 0),
  };
}

export type LedgerRow = {
  entry_id: string;
  entry_number: string;
  entry_date: string;
  description: string | null;
  counterpartyName: string | null;
  debit_amount: number;
  credit_amount: number;
  runningBalance: number;
};

export function computeLedger(
  lines: PostedLine[],
  accountId: string,
  account: Account,
  fiscalYear: FiscalYear,
  counterpartyNames: Map<string, string>,
): { openingBalance: number; rows: LedgerRow[] } {
  const live = activeLines(lines).filter((l) => l.account_id === accountId);
  const openingBalance = live
    .filter((l) => l.entry_date < fiscalYear.start_date)
    .reduce((sum, l) => sum + normalDelta(l, account.normal_balance), 0);

  const periodLines = live
    .filter((l) => l.entry_date >= fiscalYear.start_date && l.entry_date <= fiscalYear.end_date)
    .sort((a, b) => a.entry_date.localeCompare(b.entry_date) || a.entry_number.localeCompare(b.entry_number));

  let running = openingBalance;
  const rows: LedgerRow[] = periodLines.map((l) => {
    running += normalDelta(l, account.normal_balance);
    return {
      entry_id: l.entry_id,
      entry_number: l.entry_number,
      entry_date: l.entry_date,
      description: l.line_description ?? l.entry_description,
      counterpartyName: l.counterparty_id ? (counterpartyNames.get(l.counterparty_id) ?? null) : null,
      debit_amount: l.debit_amount,
      credit_amount: l.credit_amount,
      runningBalance: running,
    };
  });

  return { openingBalance, rows };
}

export type IncomeStatement = {
  revenueRows: { account: Account; amount: number }[];
  expenseRows: { account: Account; amount: number }[];
  totalRevenue: number;
  totalExpense: number;
  netIncome: number;
};

export function computeIncomeStatement(
  lines: PostedLine[],
  accounts: Account[],
  fiscalYear: FiscalYear,
): IncomeStatement {
  const live = activeLines(lines).filter(
    (l) => l.entry_date >= fiscalYear.start_date && l.entry_date <= fiscalYear.end_date,
  );
  const accMap = accountMap(accounts);

  const revenueRows = accounts
    .filter((a) => a.category === "revenue")
    .map((account) => ({
      account,
      amount: live
        .filter((l) => l.account_id === account.id)
        .reduce((sum, l) => sum + normalDelta(l, account.normal_balance), 0),
    }))
    .filter((r) => r.amount !== 0);

  const expenseRows = accounts
    .filter((a) => a.category === "expense")
    .map((account) => ({
      account,
      amount: live
        .filter((l) => l.account_id === account.id)
        .reduce((sum, l) => sum + normalDelta(l, account.normal_balance), 0),
    }))
    .filter((r) => r.amount !== 0);

  const totalRevenue = revenueRows.reduce((sum, r) => sum + r.amount, 0);
  const totalExpense = expenseRows.reduce((sum, r) => sum + r.amount, 0);

  void accMap;
  return { revenueRows, expenseRows, totalRevenue, totalExpense, netIncome: totalRevenue - totalExpense };
}

export type BalanceSheet = {
  assetRows: { account: Account; amount: number }[];
  liabilityRows: { account: Account; amount: number }[];
  equityRows: { account: Account; amount: number }[];
  currentPeriodNetIncome: number;
  totalAssets: number;
  totalLiabilitiesAndEquity: number;
};

export function computeBalanceSheet(
  lines: PostedLine[],
  accounts: Account[],
  fiscalYear: FiscalYear,
  asOfDate: string,
): BalanceSheet {
  const live = activeLines(lines).filter((l) => l.entry_date <= asOfDate);

  function rowsFor(category: "asset" | "liability" | "equity") {
    return accounts
      .filter((a) => a.category === category)
      .map((account) => ({
        account,
        amount: live
          .filter((l) => l.account_id === account.id)
          .reduce((sum, l) => sum + normalDelta(l, account.normal_balance), 0),
      }))
      .filter((r) => r.amount !== 0);
  }

  const assetRows = rowsFor("asset");
  const liabilityRows = rowsFor("liability");
  const equityRows = rowsFor("equity");

  // Closing entries haven't been posted mid-year, so current-period net income is shown
  // as an unappropriated line under equity (standard practice for an interim/draft B/S).
  const { netIncome: currentPeriodNetIncome } = computeIncomeStatement(lines, accounts, {
    ...fiscalYear,
    end_date: asOfDate < fiscalYear.end_date ? asOfDate : fiscalYear.end_date,
  });

  const totalAssets = assetRows.reduce((sum, r) => sum + r.amount, 0);
  const totalLiabilitiesAndEquity =
    liabilityRows.reduce((sum, r) => sum + r.amount, 0) +
    equityRows.reduce((sum, r) => sum + r.amount, 0) +
    currentPeriodNetIncome;

  return {
    assetRows,
    liabilityRows,
    equityRows,
    currentPeriodNetIncome,
    totalAssets,
    totalLiabilitiesAndEquity,
  };
}
