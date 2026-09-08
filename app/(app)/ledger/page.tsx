import { getAccounts, getCounterparties, getFiscalYears, getPostedLines } from "@/lib/accounting/queries";
import { pickCurrentFiscalYear, formatYen } from "@/lib/accounting/fiscal-year";
import { computeLedger } from "@/lib/accounting/report";
import LedgerFilters from "@/components/LedgerFilters";

export default async function LedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ account?: string; fy?: string }>;
}) {
  const params = await searchParams;
  const [accounts, fiscalYears, lines, counterparties] = await Promise.all([
    getAccounts(),
    getFiscalYears(),
    getPostedLines(),
    getCounterparties(),
  ]);

  const fiscalYear = fiscalYears.find((fy) => fy.id === params.fy) ?? pickCurrentFiscalYear(fiscalYears);
  const account = accounts.find((a) => a.id === params.account) ?? accounts[0];
  const counterpartyNames = new Map(counterparties.map((c) => [c.id, c.name]));

  if (!fiscalYear || !account) {
    return <p className="text-sm text-gray-500">勘定科目または会計期間が登録されていません。</p>;
  }

  const { openingBalance, rows } = computeLedger(lines, account.id, account, fiscalYear, counterpartyNames);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">総勘定元帳</h1>
      <LedgerFilters
        accounts={accounts}
        fiscalYears={fiscalYears}
        selectedAccountId={account.id}
        selectedFiscalYearId={fiscalYear.id}
      />

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th className="px-3 py-2">日付</th>
              <th className="px-3 py-2">伝票No.</th>
              <th className="px-3 py-2">摘要</th>
              <th className="px-3 py-2">取引先</th>
              <th className="px-3 py-2 text-right">借方</th>
              <th className="px-3 py-2 text-right">貸方</th>
              <th className="px-3 py-2 text-right">残高</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-100 bg-gray-50">
              <td className="px-3 py-2" colSpan={6}>
                期首残高
              </td>
              <td className="px-3 py-2 text-right font-mono">{formatYen(openingBalance)}</td>
            </tr>
            {rows.map((r) => (
              <tr key={r.entry_id + r.debit_amount + r.credit_amount} className="border-b border-gray-100">
                <td className="px-3 py-2">{r.entry_date}</td>
                <td className="px-3 py-2">{r.entry_number}</td>
                <td className="px-3 py-2">{r.description}</td>
                <td className="px-3 py-2">{r.counterpartyName}</td>
                <td className="px-3 py-2 text-right font-mono">{r.debit_amount ? formatYen(r.debit_amount) : ""}</td>
                <td className="px-3 py-2 text-right font-mono">{r.credit_amount ? formatYen(r.credit_amount) : ""}</td>
                <td className="px-3 py-2 text-right font-mono">{formatYen(r.runningBalance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
