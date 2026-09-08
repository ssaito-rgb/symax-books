"use client";

import type { Account } from "@/lib/accounting/types";

export default function AccountPicker({
  accounts,
  value,
  onChange,
  required,
}: {
  accounts: Account[];
  value: string;
  onChange: (accountId: string) => void;
  required?: boolean;
}) {
  return (
    <select
      value={value}
      required={required}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
    >
      <option value="">勘定科目を選択</option>
      {accounts.map((a) => (
        <option key={a.id} value={a.id}>
          {a.code} {a.name}
        </option>
      ))}
    </select>
  );
}
