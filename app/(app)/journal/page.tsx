import Link from "next/link";
import { getAccounts, getPostedLines } from "@/lib/accounting/queries";
import { formatYen } from "@/lib/accounting/fiscal-year";

export default async function JournalListPage() {
  const [lines, accounts] = await Promise.all([getPostedLines(), getAccounts(true)]);
  const accountName = new Map(accounts.map((a) => [a.id, `${a.code} ${a.name}`]));

  const entries = new Map<
    string,
    { entry_id: string; entry_number: string; entry_date: string; description: string | null; is_voided: boolean; lines: typeof lines }
  >();
  for (const l of lines) {
    if (!entries.has(l.entry_id)) {
      entries.set(l.entry_id, {
        entry_id: l.entry_id,
        entry_number: l.entry_number,
        entry_date: l.entry_date,
        description: l.entry_description,
        is_voided: l.is_voided,
        lines: [],
      });
    }
    entries.get(l.entry_id)!.lines.push(l);
  }

  const sorted = [...entries.values()].sort(
    (a, b) => b.entry_date.localeCompare(a.entry_date) || b.entry_number.localeCompare(a.entry_number),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">仕訳一覧</h1>
        <Link href="/journal/new" className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
          仕訳を入力
        </Link>
      </div>

      <div className="flex flex-col gap-2">
        {sorted.length === 0 && (
          <p className="rounded-md border border-gray-200 bg-white p-4 text-sm text-gray-500">
            まだ仕訳がありません。
          </p>
        )}
        {sorted.map((entry) => (
          <Link
            key={entry.entry_id}
            href={`/journal/${entry.entry_id}`}
            className={`block rounded-lg border bg-white p-3 hover:border-indigo-300 ${
              entry.is_voided ? "border-gray-200 opacity-50" : "border-gray-200"
            }`}
          >
            <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
              <span>
                {entry.entry_date}　No.{entry.entry_number}
                {entry.is_voided && <span className="ml-2 text-red-500">取消済み</span>}
              </span>
              <span>{entry.description}</span>
            </div>
            <div className="flex flex-col gap-1 text-sm">
              {entry.lines.map((l) => (
                <div key={l.line_id} className="flex justify-between">
                  <span>{accountName.get(l.account_id) ?? l.account_id}</span>
                  <span className="font-mono">
                    {l.debit_amount ? `借 ${formatYen(l.debit_amount)}` : `貸 ${formatYen(l.credit_amount)}`}
                  </span>
                </div>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
