import { getAccounts, getFiscalYears, getPostedLines } from "@/lib/accounting/queries";
import { pickCurrentFiscalYear, formatYen } from "@/lib/accounting/fiscal-year";
import { computeBalanceSheet } from "@/lib/accounting/report";

export default async function BalanceSheetPage({
  searchParams,
}: {
  searchParams: Promise<{ fy?: string; asOf?: string }>;
}) {
  const params = await searchParams;
  const [accounts, fiscalYears, lines] = await Promise.all([getAccounts(), getFiscalYears(), getPostedLines()]);
  const fiscalYear = fiscalYears.find((fy) => fy.id === params.fy) ?? pickCurrentFiscalYear(fiscalYears);

  if (!fiscalYear) return <p className="text-sm text-gray-500">会計期間が登録されていません。</p>;

  const asOfDate = params.asOf || new Date().toISOString().slice(0, 10);
  const bs = computeBalanceSheet(lines, accounts, fiscalYear, asOfDate);
  const isBalanced = Math.abs(bs.totalAssets - bs.totalLiabilitiesAndEquity) < 1;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">貸借対照表（BS）</h1>
        <form className="flex items-center gap-2">
          <select
            name="fy"
            defaultValue={fiscalYear.id}
            className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            onChange={(e) => e.currentTarget.form?.submit()}
          >
            {fiscalYears.map((fy) => (
              <option key={fy.id} value={fy.id}>
                {fy.label}
              </option>
            ))}
          </select>
          <input
            type="date"
            name="asOf"
            defaultValue={asOfDate}
            onChange={(e) => e.currentTarget.form?.submit()}
            className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          />
        </form>
      </div>
      <p className="text-sm text-gray-500">{asOfDate} 時点</p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold text-gray-700">資産</h2>
          <table className="w-full text-sm">
            <tbody>
              {bs.assetRows.map((r) => (
                <tr key={r.account.id} className="border-b border-gray-100">
                  <td className="py-1.5">
                    {r.account.code} {r.account.name}
                  </td>
                  <td className="py-1.5 text-right font-mono">{formatYen(r.amount)}</td>
                </tr>
              ))}
              <tr className="font-medium">
                <td className="py-1.5">資産合計</td>
                <td className="py-1.5 text-right font-mono">{formatYen(bs.totalAssets)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold text-gray-700">負債</h2>
          <table className="mb-4 w-full text-sm">
            <tbody>
              {bs.liabilityRows.map((r) => (
                <tr key={r.account.id} className="border-b border-gray-100">
                  <td className="py-1.5">
                    {r.account.code} {r.account.name}
                  </td>
                  <td className="py-1.5 text-right font-mono">{formatYen(r.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2 className="mb-2 text-sm font-semibold text-gray-700">純資産</h2>
          <table className="w-full text-sm">
            <tbody>
              {bs.equityRows.map((r) => (
                <tr key={r.account.id} className="border-b border-gray-100">
                  <td className="py-1.5">
                    {r.account.code} {r.account.name}
                  </td>
                  <td className="py-1.5 text-right font-mono">{formatYen(r.amount)}</td>
                </tr>
              ))}
              <tr className="border-b border-gray-100">
                <td className="py-1.5">当期純利益（未処分）</td>
                <td className="py-1.5 text-right font-mono">{formatYen(bs.currentPeriodNetIncome)}</td>
              </tr>
              <tr className="font-medium">
                <td className="py-1.5">負債・純資産合計</td>
                <td className="py-1.5 text-right font-mono">{formatYen(bs.totalLiabilitiesAndEquity)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div
        className={`rounded-md border p-3 text-sm ${
          isBalanced ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800"
        }`}
      >
        {isBalanced
          ? "✓ 資産合計 と 負債・純資産合計 が一致しています"
          : "✗ 資産合計 と 負債・純資産合計 が一致していません"}
      </div>
    </div>
  );
}
