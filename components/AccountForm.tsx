"use client";

import { useActionState } from "react";
import { upsertAccount, type AccountFormState } from "@/app/(app)/accounts/actions";
import type { Account, TaxCategory } from "@/lib/accounting/types";

const CATEGORY_LABELS: Record<Account["category"], string> = {
  asset: "資産",
  liability: "負債",
  equity: "純資産",
  revenue: "収益",
  expense: "費用",
};

export default function AccountForm({
  account,
  taxCategories,
}: {
  account?: Account;
  taxCategories: TaxCategory[];
}) {
  const [state, formAction, pending] = useActionState<AccountFormState, FormData>(upsertAccount, {});

  return (
    <form
      action={formAction}
      className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-white p-4 md:grid-cols-2"
    >
      {account && <input type="hidden" name="id" value={account.id} />}

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">科目コード</label>
        <input
          name="code"
          defaultValue={account?.code}
          required
          className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">科目名</label>
        <input
          name="name"
          defaultValue={account?.name}
          required
          className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">区分</label>
        <select
          name="category"
          defaultValue={account?.category ?? "expense"}
          className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        >
          {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">貸借区分（正常残高）</label>
        <select
          name="normal_balance"
          defaultValue={account?.normal_balance ?? "debit"}
          className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        >
          <option value="debit">借方</option>
          <option value="credit">貸方</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">サブ区分（任意）</label>
        <input
          name="subcategory"
          defaultValue={account?.subcategory ?? ""}
          className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">デフォルト税区分（任意）</label>
        <select
          name="default_tax_category_code"
          defaultValue={account?.default_tax_category_code ?? ""}
          className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        >
          <option value="">（なし）</option>
          {taxCategories.map((t) => (
            <option key={t.code} value={t.code}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="requires_counterparty"
          name="requires_counterparty"
          defaultChecked={account?.requires_counterparty}
        />
        <label htmlFor="requires_counterparty" className="text-xs text-gray-600">
          取引先の入力を必須にする（勘定科目内訳明細書対象科目向け）
        </label>
      </div>
      <div className="md:col-span-2">
        <label className="mb-1 block text-xs font-medium text-gray-600">説明（任意）</label>
        <input
          name="description"
          defaultValue={account?.description ?? ""}
          className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        />
      </div>

      {state.error && <p className="text-sm text-red-600 md:col-span-2">{state.error}</p>}

      <div className="md:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {pending ? "保存中…" : account ? "更新する" : "追加する"}
        </button>
      </div>
    </form>
  );
}
