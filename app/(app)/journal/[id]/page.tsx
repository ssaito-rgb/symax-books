import { notFound } from "next/navigation";
import { getAccounts, getCounterparties, getPostedLines } from "@/lib/accounting/queries";
import { formatYen } from "@/lib/accounting/fiscal-year";
import { voidEntryAction } from "@/app/(app)/journal/actions";

export default async function JournalEntryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [lines, accounts, counterparties] = await Promise.all([
    getPostedLines(),
    getAccounts(true),
    getCounterparties(),
  ]);
  const entryLines = lines.filter((l) => l.entry_id === id);
  if (entryLines.length === 0) notFound();

  const header = entryLines[0];
  const accountName = new Map(accounts.map((a) => [a.id, `${a.code} ${a.name}`]));
  const counterpartyName = new Map(counterparties.map((c) => [c.id, c.name]));

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">
          仕訳 No.{header.entry_number}
          {header.is_voided && <span className="ml-2 text-sm text-red-500">取消済み</span>}
        </h1>
        <p className="text-sm text-gray-500">
          {header.entry_date}　{header.entry_description}
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th className="px-3 py-2">勘定科目</th>
              <th className="px-3 py-2">取引先</th>
              <th className="px-3 py-2 text-right">借方</th>
              <th className="px-3 py-2 text-right">貸方</th>
              <th className="px-3 py-2">証憑・内容</th>
            </tr>
          </thead>
          <tbody>
            {entryLines.map((l) => (
              <tr key={l.line_id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-3 py-2">{accountName.get(l.account_id)}</td>
                <td className="px-3 py-2">{l.counterparty_id ? counterpartyName.get(l.counterparty_id) : ""}</td>
                <td className="px-3 py-2 text-right font-mono">{l.debit_amount ? formatYen(l.debit_amount) : ""}</td>
                <td className="px-3 py-2 text-right font-mono">{l.credit_amount ? formatYen(l.credit_amount) : ""}</td>
                <td className="px-3 py-2 text-xs">
                  {l.evidence_url?.startsWith("http") ? (
                    <a href={l.evidence_url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
                      証憑を開く
                    </a>
                  ) : (
                    l.evidence_url
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!header.is_voided && (
        <form action={voidEntryAction}>
          <input type="hidden" name="entry_id" value={header.entry_id} />
          <input type="hidden" name="fiscal_year_id" value={header.fiscal_year_id} />
          <button
            type="submit"
            className="rounded-md border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            この仕訳を取り消す（反対仕訳を自動作成）
          </button>
        </form>
      )}
    </div>
  );
}
