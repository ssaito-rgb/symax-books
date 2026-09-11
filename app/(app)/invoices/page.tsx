import Link from "next/link";
import { getCounterparties, getSalesInvoices } from "@/lib/accounting/queries";

const STATUS_LABELS: Record<string, string> = {
  draft: "下書き",
  finalized: "確定済み（未送信）",
  sent: "送信済み",
  paid: "入金済み",
  void: "取消",
};

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  finalized: "bg-amber-100 text-amber-700",
  sent: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
  void: "bg-red-100 text-red-700",
};

export default async function SalesInvoicesPage() {
  const [invoices, counterparties] = await Promise.all([getSalesInvoices(), getCounterparties()]);
  const counterpartyName = new Map(counterparties.map((c) => [c.id, c.name]));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">請求書（売掛金）</h1>
        <Link href="/invoices/new" className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
          請求書を作成
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th className="px-3 py-2">請求書番号</th>
              <th className="px-3 py-2">請求先</th>
              <th className="px-3 py-2">請求日</th>
              <th className="px-3 py-2">状態</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-b border-gray-100">
                <td className="px-3 py-2">{inv.invoice_number ?? "（下書き）"}</td>
                <td className="px-3 py-2">{counterpartyName.get(inv.counterparty_id)}</td>
                <td className="px-3 py-2">{inv.issue_date}</td>
                <td className="px-3 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLES[inv.status]}`}>
                    {STATUS_LABELS[inv.status]}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">
                  <Link href={`/invoices/${inv.id}`} className="text-indigo-600 hover:underline">
                    開く
                  </Link>
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td className="px-3 py-4 text-gray-500" colSpan={5}>
                  まだ請求書がありません。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
