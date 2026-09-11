import Link from "next/link";
import { getAccounts } from "@/lib/accounting/queries";
import { toggleAccountActive } from "@/app/(app)/accounts/actions";
import PageHeader from "@/components/ui/PageHeader";
import type { Account } from "@/lib/accounting/types";

const CATEGORY_LABELS: Record<Account["category"], string> = {
  asset: "資産",
  liability: "負債",
  equity: "純資産",
  revenue: "収益",
  expense: "費用",
};

export default async function AccountsPage() {
  const accounts = await getAccounts(true);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="勘定科目マスタ"
        action={
          <Link href="/accounts/new" className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            科目を追加
          </Link>
        }
      />

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th className="px-3 py-2">コード</th>
              <th className="px-3 py-2">科目名</th>
              <th className="px-3 py-2">区分</th>
              <th className="px-3 py-2">貸借</th>
              <th className="px-3 py-2">取引先必須</th>
              <th className="px-3 py-2">状態</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.id} className={`border-b border-gray-100 hover:bg-gray-50 ${a.is_active ? "" : "text-gray-400"}`}>
                <td className="px-3 py-2 font-mono">{a.code}</td>
                <td className="px-3 py-2">{a.name}</td>
                <td className="px-3 py-2">{CATEGORY_LABELS[a.category]}</td>
                <td className="px-3 py-2">{a.normal_balance === "debit" ? "借方" : "貸方"}</td>
                <td className="px-3 py-2">{a.requires_counterparty ? "○" : ""}</td>
                <td className="px-3 py-2">{a.is_active ? "有効" : "無効"}</td>
                <td className="px-3 py-2 text-right">
                  <Link href={`/accounts/${a.id}`} className="mr-3 text-indigo-600 hover:underline">
                    編集
                  </Link>
                  <form
                    action={async () => {
                      "use server";
                      await toggleAccountActive(a.id, a.is_active);
                    }}
                    className="inline"
                  >
                    <button type="submit" className="text-gray-500 hover:underline">
                      {a.is_active ? "無効化" : "有効化"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
