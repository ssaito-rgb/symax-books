import { getTaxCategories } from "@/lib/accounting/queries";

const DIRECTION_LABELS: Record<string, string> = {
  sales: "売上",
  purchases: "仕入・経費",
  none: "対象外",
};

export default async function TaxCategoriesSettingsPage() {
  const taxCategories = await getTaxCategories();

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-600">
        消費税区分マスタです。課税事業者になった場合に仕訳入力時の税区分として使用します。免税事業者の間は使用しなくても問題ありません。
      </p>
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th className="px-3 py-2">区分名</th>
              <th className="px-3 py-2">税率</th>
              <th className="px-3 py-2">売上／仕入</th>
            </tr>
          </thead>
          <tbody>
            {taxCategories.map((t) => (
              <tr key={t.code} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-3 py-2">{t.name}</td>
                <td className="px-3 py-2">{t.rate}%</td>
                <td className="px-3 py-2">{DIRECTION_LABELS[t.direction]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
