import { getAccounts, getFiscalYears, getPostedLines } from "@/lib/accounting/queries";
import { pickCurrentFiscalYear, formatYen } from "@/lib/accounting/fiscal-year";
import { computeTrialBalance } from "@/lib/accounting/report";
import FiscalYearSelect from "@/components/FiscalYearSelect";
import PageHeader from "@/components/ui/PageHeader";

const CATEGORY_LABELS: Record<string, string> = {
  asset: "資産",
  liability: "負債",
  equity: "純資産",
  revenue: "収益",
  expense: "費用",
};

export default async function TrialBalancePage({
  searchParams,
}: {
  searchParams: Promise<{ fy?: string }>;
}) {
  const params = await searchParams;
  const [accounts, fiscalYears, lines] = await Promise.all([getAccounts(), getFiscalYears(), getPostedLines()]);
  const fiscalYear = fiscalYears.find((fy) => fy.id === params.fy) ?? pickCurrentFiscalYear(fiscalYears);

  if (!fiscalYear) {
    return <p className="text-sm text-gray-500">会計期間が登録されていません。</p>;
  }

  const { rows, totalPeriodDebit, totalPeriodCredit } = computeTrialBalance(lines, accounts, fiscalYear);
  const isBalanced = Math.abs(totalPeriodDebit - totalPeriodCredit) < 1;
  const nonZeroRows = rows.filter(
    (r) => r.openingBalance !== 0 || r.periodDebit !== 0 || r.periodCredit !== 0 || r.closingBalance !== 0,
  );

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="試算表"
        action={<FiscalYearSelect fiscalYears={fiscalYears} selectedId={fiscalYear.id} basePath="/trial-balance" />}
      />

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th className="px-3 py-2">科目</th>
              <th className="px-3 py-2">区分</th>
              <th className="px-3 py-2 text-right">期首残高</th>
              <th className="px-3 py-2 text-right">借方合計</th>
              <th className="px-3 py-2 text-right">貸方合計</th>
              <th className="px-3 py-2 text-right">期末残高</th>
            </tr>
          </thead>
          <tbody>
            {nonZeroRows.map((r) => (
              <tr key={r.account.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-3 py-2">
                  {r.account.code} {r.account.name}
                </td>
                <td className="px-3 py-2 text-xs text-gray-500">{CATEGORY_LABELS[r.account.category]}</td>
                <td className="px-3 py-2 text-right font-mono">{formatYen(r.openingBalance)}</td>
                <td className="px-3 py-2 text-right font-mono">{formatYen(r.periodDebit)}</td>
                <td className="px-3 py-2 text-right font-mono">{formatYen(r.periodCredit)}</td>
                <td className="px-3 py-2 text-right font-mono">{formatYen(r.closingBalance)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 font-medium">
              <td className="px-3 py-2" colSpan={3}>
                合計
              </td>
              <td className="px-3 py-2 text-right font-mono">{formatYen(totalPeriodDebit)}</td>
              <td className="px-3 py-2 text-right font-mono">{formatYen(totalPeriodCredit)}</td>
              <td className="px-3 py-2" />
            </tr>
          </tfoot>
        </table>
      </div>

      <div
        className={`rounded-md border p-3 text-sm ${
          isBalanced ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800"
        }`}
      >
        {isBalanced ? "✓ 借方合計と貸方合計が一致しています" : "✗ 借方合計と貸方合計が一致していません"}
      </div>
    </div>
  );
}
