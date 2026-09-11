import { getAccounts, getFiscalYears, getPostedLines } from "@/lib/accounting/queries";
import { pickCurrentFiscalYear, formatYen } from "@/lib/accounting/fiscal-year";
import { computeIncomeStatement } from "@/lib/accounting/report";
import FiscalYearSelect from "@/components/FiscalYearSelect";
import PageHeader from "@/components/ui/PageHeader";

export default async function IncomeStatementPage({
  searchParams,
}: {
  searchParams: Promise<{ fy?: string }>;
}) {
  const params = await searchParams;
  const [accounts, fiscalYears, lines] = await Promise.all([getAccounts(), getFiscalYears(), getPostedLines()]);
  const fiscalYear = fiscalYears.find((fy) => fy.id === params.fy) ?? pickCurrentFiscalYear(fiscalYears);

  if (!fiscalYear) return <p className="text-sm text-gray-500">会計期間が登録されていません。</p>;

  const pl = computeIncomeStatement(lines, accounts, fiscalYear);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="損益計算書（PL）"
        subtitle={`${fiscalYear.start_date} 〜 ${fiscalYear.end_date}`}
        action={<FiscalYearSelect fiscalYears={fiscalYears} selectedId={fiscalYear.id} basePath="/reports/pl" />}
      />

      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold text-gray-700">売上</h2>
        <table className="mb-4 w-full text-sm">
          <tbody>
            {pl.revenueRows.map((r) => (
              <tr key={r.account.id} className="border-b border-gray-100">
                <td className="py-1.5">
                  {r.account.code} {r.account.name}
                </td>
                <td className="py-1.5 text-right font-mono">{formatYen(r.amount)}</td>
              </tr>
            ))}
            <tr className="font-medium">
              <td className="py-1.5">売上合計</td>
              <td className="py-1.5 text-right font-mono">{formatYen(pl.totalRevenue)}</td>
            </tr>
          </tbody>
        </table>

        <h2 className="mb-2 text-sm font-semibold text-gray-700">経費</h2>
        <table className="w-full text-sm">
          <tbody>
            {pl.expenseRows.map((r) => (
              <tr key={r.account.id} className="border-b border-gray-100">
                <td className="py-1.5">
                  {r.account.code} {r.account.name}
                </td>
                <td className="py-1.5 text-right font-mono">{formatYen(r.amount)}</td>
              </tr>
            ))}
            <tr className="font-medium">
              <td className="py-1.5">経費合計</td>
              <td className="py-1.5 text-right font-mono">{formatYen(pl.totalExpense)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="rounded-md border border-indigo-200 bg-indigo-50 p-3 text-sm font-medium text-indigo-800">
        当期純利益：{formatYen(pl.netIncome)}
      </div>
    </div>
  );
}
