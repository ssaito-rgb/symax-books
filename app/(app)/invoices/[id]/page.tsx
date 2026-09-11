import { notFound } from "next/navigation";
import { getCounterparties, getSalesInvoice, getSalesInvoiceLines } from "@/lib/accounting/queries";
import { formatYen } from "@/lib/accounting/fiscal-year";
import { finalizeAction, recordPaymentAction, sendInvoiceAction } from "@/app/(app)/invoices/actions";
import PrintButton from "@/components/PrintButton";

const SENDER_INFO = "Symax Partners合同会社";

export default async function SalesInvoiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sent?: string; sendError?: string }>;
}) {
  const { id } = await params;
  const search = await searchParams;
  const [invoice, counterparties] = await Promise.all([getSalesInvoice(id), getCounterparties()]);
  if (!invoice) notFound();

  const lines = await getSalesInvoiceLines(id);
  const client = counterparties.find((c) => c.id === invoice.counterparty_id);
  const total = lines.reduce((sum, l) => sum + l.amount, 0);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-xl font-semibold">請求書プレビュー</h1>
        <div className="flex gap-2">
          {invoice.status === "draft" && (
            <form action={finalizeAction}>
              <input type="hidden" name="invoice_id" value={invoice.id} />
              <button type="submit" className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
                請求書を確定する
              </button>
            </form>
          )}
          {(invoice.status === "finalized" || invoice.status === "sent" || invoice.status === "paid") && <PrintButton />}
        </div>
      </div>

      {search.sent && (
        <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800 print:hidden">
          メールを送信しました。
        </div>
      )}
      {search.sendError && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 print:hidden">
          送信に失敗しました: {decodeURIComponent(search.sendError)}
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white p-8 print:border-0 print:shadow-none">
        <div className="mb-8 flex items-start justify-between">
          <h2 className="text-2xl font-bold">請求書</h2>
          {invoice.invoice_number && <p className="text-sm text-gray-500">No. {invoice.invoice_number}</p>}
        </div>

        <div className="mb-8 flex justify-between">
          <div>
            <p className="text-lg font-medium">{client?.name} 御中</p>
          </div>
          <div className="text-right text-sm text-gray-600">
            <p>請求日: {invoice.issue_date}</p>
            {invoice.due_date && <p>お支払期限: {invoice.due_date}</p>}
            <p className="mt-2 font-medium">{SENDER_INFO}</p>
          </div>
        </div>

        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-gray-800">
              <th className="p-2 text-left">品目</th>
              <th className="p-2 text-right">数量</th>
              <th className="p-2 text-right">単価</th>
              <th className="p-2 text-right">金額</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.id} className="border-b border-gray-200">
                <td className="p-2">{l.description}</td>
                <td className="p-2 text-right">{l.quantity}</td>
                <td className="p-2 text-right font-mono">{formatYen(l.unit_price)}</td>
                <td className="p-2 text-right font-mono">{formatYen(l.amount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="p-2 text-right font-medium" colSpan={3}>
                ご請求金額合計
              </td>
              <td className="p-2 text-right font-mono font-medium">{formatYen(total)}</td>
            </tr>
          </tfoot>
        </table>

        {invoice.notes && <p className="mt-4 text-sm text-gray-600">{invoice.notes}</p>}

        <p className="mt-8 text-xs text-gray-500">
          当社は消費税免税事業者のため、本請求書は適格請求書（インボイス）には該当しません。
        </p>
      </div>

      {invoice.status === "finalized" && (
        <form action={sendInvoiceAction} className="flex flex-wrap items-end gap-2 rounded-lg border border-gray-200 bg-white p-4 print:hidden">
          <input type="hidden" name="invoice_id" value={invoice.id} />
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">送信先メールアドレス</label>
            <input
              type="email"
              name="recipient_email"
              required
              placeholder="例）contact@client.co.jp"
              className="w-64 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            />
          </div>
          <button type="submit" className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            メールで送信
          </button>
        </form>
      )}

      {invoice.status === "sent" && (
        <form action={recordPaymentAction} className="flex flex-wrap items-end gap-2 rounded-lg border border-gray-200 bg-white p-4 print:hidden">
          <input type="hidden" name="invoice_id" value={invoice.id} />
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">入金日</label>
            <input type="date" name="received_date" defaultValue={today} required className="rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">入金額</label>
            <input type="number" name="amount" defaultValue={total} required className="w-32 rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
          </div>
          <button type="submit" className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            入金を記録
          </button>
        </form>
      )}

      {invoice.status === "paid" && (
        <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800 print:hidden">
          ✓ {invoice.paid_date} に{formatYen(invoice.paid_amount ?? 0)}の入金を確認済みです。
        </div>
      )}
    </div>
  );
}
