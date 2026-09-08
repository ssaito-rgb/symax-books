"use client";

import type { Counterparty } from "@/lib/accounting/types";

export default function CounterpartyPicker({
  counterparties,
  value,
  onChange,
  required,
}: {
  counterparties: Counterparty[];
  value: string;
  onChange: (counterpartyId: string) => void;
  required?: boolean;
}) {
  return (
    <select
      value={value}
      required={required}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
    >
      <option value="">{required ? "取引先を選択" : "（取引先なし）"}</option>
      {counterparties.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
