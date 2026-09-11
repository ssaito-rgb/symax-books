import Link from "next/link";
import {
  getAccounts,
  getFiscalYears,
  getPostedLines,
  getPurchaseInvoices,
  getSalesInvoices,
} from "@/lib/accounting/queries";
import { pickCurrentFiscalYear, formatYen } from "@/lib/accounting/fiscal-year";
import { computeIncomeStatement, computeBalanceSheet, computeTrialBalance } from "@/lib/accounting/report";
import PageHeader from "@/components/ui/PageHeader";

export default async function DashboardPage() {
  const [accounts, fiscalYears, lines, purchaseInvoices, salesInvoices] = await Promise.all([
    getAccounts(),
    getFiscalYears(),
    getPostedLines(),
    getPurchaseInvoices(),
    getSalesInvoices(),
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

  const unpaidPayables = purchaseInvoices.filter((i) => i.status === "unpaid");
  const unpaidPayablesTotal = unpaidPayables.reduce((sum, i) => sum + i.amount, 0);
  const draftInvoices = salesInvoices.filter((i) => i.status === "draft");
  const unsentInvoices = salesInvoices.filter((i) => i.status === "finalized");
  const unpaidSentInvoices = salesInvoices.filter((i) => i.status === "sent");

  const stats = [
    { label: "売上合計（当期）", value: pl.totalRevenue, accent: "border-l-indigo-400" },
    { label: "経費合計（当期）", value: pl.totalExpense, accent: "border-l-gray-300" },
    { label: "当期純利益", value: pl.netIncome, accent: "border-l-green-400" },
    { label: "資産合計（現在）", value: bs.totalAssets, accent: "border-l-blue-400" },
  ];

  const todos = [
    unpaidPayables.length > 0 && {
      href: "/payables",
      text: `未払いの請求書が${unpaidPayables.length}件あります（合計${formatYen(unpaidPayablesTotal)}）`,
    },
    draftInvoices.length > 0 && {
      href: "/invoices",
      text: `下書きの請求書が${draftInvoices.length}件あります`,
    },
    unsentInvoices.length > 0 && {
      href: "/invoices",
      text: `確定済みで未送信の請求書が${unsentInvoices.length}件あります`,
    },
    unpaidSentInvoices.length > 0 && {
      href: "/invoices",
      text: `入金待ちの請求書が${unpaidSentInvoices.length}件あります`,
    },
  ].filter(Boolean) as { href: string; text: string }[];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={fiscalYear.label}
        subtitle={`${fiscalYear.start_date} 〜 ${fiscalYear.end_date}（消費税区分：${
          fiscalYear.tax_status === "undetermined" ? "未確定" : fiscalYear.tax_status
        }）`}
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((c) => (
          <div key={c.label} className={`rounded-lg border border-l-4 border-gray-200 bg-white p-4 ${c.accent}`}>
            <p className="text-xs text-gray-500">{c.label}</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">{formatYen(c.value)}</p>
          </div>
        ))}
      </div>

      {todos.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">やること</h2>
          <ul className="flex flex-col gap-2">
            {todos.map((todo, idx) => (
              <li key={idx}>
                <Link href={todo.href} className="flex items-center gap-2 text-sm text-gray-700 hover:text-indigo-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  {todo.text}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div
        className={`rounded-md border p-3 text-sm ${
          isBalanced ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800"
        }`}
      >
        試算表 貸借一致チェック：借方合計 {formatYen(tb.totalPeriodDebit)} / 貸方合計{" "}
        {formatYen(tb.totalPeriodCredit)}　{isBalanced ? "✓ 一致しています" : "✗ 不一致です"}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">クイックアクション</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/receipts/bulk" className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            領収書を読み込む
          </Link>
          <Link href="/journal/new" className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50">
            仕訳を入力する
          </Link>
          <Link href="/payables/new" className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50">
            請求書を登録（買掛金）
          </Link>
          <Link href="/invoices/new" className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50">
            請求書を作成（売掛金）
          </Link>
        </div>
      </div>
    </div>
  );
}
