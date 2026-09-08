import Link from "next/link";
import { getAccounts, getFiscalYears, getPostedLines } from "@/lib/accounting/queries";
import { pickCurrentFiscalYear, formatYen } from "@/lib/accounting/fiscal-year";
import { computeIncomeStatement, computeBalanceSheet, computeTrialBalance } from "@/lib/accounting/report";

export default async function DashboardPage() {
  const [accounts, fiscalYears, lines] = await Promise.all([
    getAccounts(),
    getFiscalYears(),
    getPostedLines(),
  ]);
  const fiscalYear = pickCurrentFiscalYear(fiscalYears);

  if (!fiscalYear) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        会計期間が登録されていません。設定から会計期間を作成してください。
      </div>
    );
  }

  const pl = computeIncomeStatement(lines, accounts, fiscalYear);
  const bs = computeBalanceSheet(lines, accounts, fiscalYear, new Date().toISOString().slice(0, 10));
  const tb = computeTrialBalance(lines, accounts, fiscalYear);
  const isBalanced = Math.abs(tb.totalPeriodDebit - tb.totalPeriodCredit) < 1;

  const cards = [
    { label: "売上合計（当期）", value: pl.totalRevenue },
    { label: "経費合計（当期）", value: pl.totalExpense },
    { label: "当期純利益", value: pl.netIncome },
    { label: "資産合計（現在）", value: bs.totalAssets },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold">{fiscalYear.label}</h1>
        <p className="text-sm text-gray-500">
          {fiscalYear.start_date} 〜 {fiscalYear.end_date}（消費税区分：
          {fiscalYear.tax_status === "undetermined" ? "未確定" : fiscalYear.tax_status}）
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-xs text-gray-500">{c.label}</p>
            <p className="mt-1 text-lg font-semibold">{formatYen(c.value)}</p>
          </div>
        ))}
      </div>

      <div
        className={`rounded-md border p-3 text-sm ${
          isBalanced ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800"
        }`}
      >
        試算表 貸借一致チェック：借方合計 {formatYen(tb.totalPeriodDebit)} / 貸方合計{" "}
        {formatYen(tb.totalPeriodCredit)}　{isBalanced ? "✓ 一致しています" : "✗ 不一致です"}
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/journal/new" className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
          仕訳を入力する
        </Link>
        <Link href="/journal" className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">
          仕訳一覧を見る
        </Link>
        <Link href="/trial-balance" className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">
          試算表を見る
        </Link>
      </div>
    </div>
  );
}
