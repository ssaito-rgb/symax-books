import { getCounterparties } from "@/lib/accounting/queries";
import { createCounterparty } from "@/app/(app)/settings/actions";

export default async function CounterpartiesSettingsPage() {
  const counterparties = await getCounterparties();

  return (
    <div className="flex flex-col gap-6">
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th className="px-3 py-2">名称</th>
              <th className="px-3 py-2">フリガナ</th>
              <th className="px-3 py-2">インボイス登録</th>
              <th className="px-3 py-2">備考</th>
            </tr>
          </thead>
          <tbody>
            {counterparties.map((c) => (
              <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-3 py-2">{c.name}</td>
                <td className="px-3 py-2">{c.kana}</td>
                <td className="px-3 py-2">
                  {c.is_qualified_invoice_issuer === true ? "登録あり" : c.is_qualified_invoice_issuer === false ? "登録なし" : "不明"}
                </td>
                <td className="px-3 py-2">{c.notes}</td>
              </tr>
            ))}
            {counterparties.length === 0 && (
              <tr>
                <td className="px-3 py-4 text-gray-500" colSpan={4}>
                  まだ取引先が登録されていません。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <form action={createCounterparty} className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-white p-4 md:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">名称</label>
          <input name="name" required className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">フリガナ（任意）</label>
          <input name="kana" className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">インボイス登録事業者か</label>
          <select name="is_qualified_invoice_issuer" defaultValue="unknown" className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm">
            <option value="unknown">不明</option>
            <option value="yes">登録あり</option>
            <option value="no">登録なし</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">備考（任意）</label>
          <input name="notes" className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
        </div>
        <div className="md:col-span-4">
          <button type="submit" className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            取引先を追加
          </button>
        </div>
      </form>
    </div>
  );
}
