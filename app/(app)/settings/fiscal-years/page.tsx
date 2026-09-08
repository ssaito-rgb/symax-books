import { getFiscalYears } from "@/lib/accounting/queries";
import { createFiscalYear, toggleFiscalYearClosed, updateFiscalYearTaxStatus } from "@/app/(app)/settings/actions";

const TAX_STATUS_LABELS: Record<string, string> = {
  undetermined: "未確定",
  exempt: "免税事業者",
  taxable_general: "課税事業者（原則課税）",
  taxable_simplified: "課税事業者（簡易課税）",
};

export default async function FiscalYearsSettingsPage() {
  const fiscalYears = await getFiscalYears();

  return (
    <div className="flex flex-col gap-6">
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th className="px-3 py-2">会計期間</th>
              <th className="px-3 py-2">開始日</th>
              <th className="px-3 py-2">終了日</th>
              <th className="px-3 py-2">消費税区分</th>
              <th className="px-3 py-2">状態</th>
            </tr>
          </thead>
          <tbody>
            {fiscalYears.map((fy) => (
              <tr key={fy.id} className="border-b border-gray-100">
                <td className="px-3 py-2">{fy.label}</td>
                <td className="px-3 py-2">{fy.start_date}</td>
                <td className="px-3 py-2">{fy.end_date}</td>
                <td className="px-3 py-2">
                  <form action={updateFiscalYearTaxStatus} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={fy.id} />
                    <select
                      name="tax_status"
                      defaultValue={fy.tax_status}
                      onChange={(e) => e.currentTarget.form?.requestSubmit()}
                      className="rounded-md border border-gray-300 px-2 py-1 text-xs"
                    >
                      {Object.entries(TAX_STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </form>
                </td>
                <td className="px-3 py-2">
                  <form action={toggleFiscalYearClosed}>
                    <input type="hidden" name="id" value={fy.id} />
                    <input type="hidden" name="is_closed" value={String(fy.is_closed)} />
                    <button type="submit" className="text-xs text-gray-500 hover:underline">
                      {fy.is_closed ? "確定済み（解除する）" : "未確定（確定する）"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form action={createFiscalYear} className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-white p-4 md:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">会計期間名</label>
          <input name="label" required placeholder="例）第2期" className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">開始日</label>
          <input type="date" name="start_date" required className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">終了日</label>
          <input type="date" name="end_date" required className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
        </div>
        <div className="flex items-end">
          <button type="submit" className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            会計期間を追加
          </button>
        </div>
      </form>

      <p className="text-xs text-gray-500">
        消費税課税事業者判定は税理士等への確認が必要です。「未確定」のままで運用し、判定が確定した時点でここを更新してください。
      </p>
    </div>
  );
}
