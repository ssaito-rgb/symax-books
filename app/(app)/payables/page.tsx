import Link from "next/link";
import { getAccounts, getCounterparties, getPurchaseInvoices } from "@/lib/accounting/queries";
import { formatYen } from "@/lib/accounting/fiscal-year";
import MarkPurchasePaidForm from "@/components/MarkPurchasePaidForm";
import PageHeader from "@/components/ui/PageHeader";

export default async function PayablesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const tab = params.tab === "paid" ? "paid" : "unpaid";
  const [invoices, accounts, counterparties] = await Promise.all([
    getPurchaseInvoices(),
    getAccounts(true),
    getCounterparties(),
  ]);

  const accountName = new Map(accounts.map((a) => [a.id, a.name]));
  const counterpartyName = new Map(counterparties.map((c) => [c.id, c.name]));
  const filtered = invoices.filter((inv) => inv.status === tab);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="買掛金（受け取った請求書）"
        subtitle="仕入先・外注先から受け取った請求書を記録し、支払いを管理します。"
        action={
          <Link href="/payables/new" className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            請求書を登録
          </Link>
        }
      />

      <div className="flex gap-4 border-b border-gray-200 text-sm">
        <Link href="/payables?tab=unpaid" className={`pb-2 ${tab === "unpaid" ? "border-b-2 border-indigo-600 font-medium" : "text-gray-500"}`}>
          未払い
        </Link>
        <Link href="/payables?tab=paid" className={`pb-2 ${tab === "paid" ? "border-b-2 border-indigo-600 font-medium" : "text-gray-500"}`}>
          支払済み
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th className="px-3 py-2">取引先</th>
              <th className="px-3 py-2">受領日</th>
              <th className="px-3 py-2">支払期限</th>
              <th className="px-3 py-2">経費の種類</th>
              <th className="px-3 py-2 text-right">金額</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((inv) => (
              <tr key={inv.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-3 py-2">{counterpartyName.get(inv.counterparty_id)}</td>
                <td className="px-3 py-2">{inv.received_date}</td>
                <td className="px-3 py-2">{inv.due_date}</td>
                <td className="px-3 py-2">{accountName.get(inv.expense_account_id)}</td>
                <td className="px-3 py-2 text-right font-mono">{formatYen(inv.amount)}</td>
                <td className="px-3 py-2 text-right">
                  {inv.status === "unpaid" && <MarkPurchasePaidForm invoiceId={inv.id} amount={inv.amount} />}
                  {inv.status === "paid" && <span className="text-xs text-gray-400">{inv.paid_date} 支払</span>}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td className="px-3 py-4 text-gray-500" colSpan={6}>
                  {tab === "unpaid" ? "未払いの請求書はありません。" : "支払済みの請求書はありません。"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
