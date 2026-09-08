"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { Account, FiscalYear } from "@/lib/accounting/types";

export default function LedgerFilters({
  accounts,
  fiscalYears,
  selectedAccountId,
  selectedFiscalYearId,
}: {
  accounts: Account[];
  fiscalYears: FiscalYear[];
  selectedAccountId: string;
  selectedFiscalYearId: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.push(`/ledger?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-3 rounded-lg border border-gray-200 bg-white p-3">
      <select
        value={selectedFiscalYearId}
        onChange={(e) => update("fy", e.target.value)}
        className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
      >
        {fiscalYears.map((fy) => (
          <option key={fy.id} value={fy.id}>
            {fy.label}
          </option>
        ))}
      </select>
      <select
        value={selectedAccountId}
        onChange={(e) => update("account", e.target.value)}
        className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
      >
        <option value="">勘定科目を選択</option>
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.code} {a.name}
          </option>
        ))}
      </select>
    </div>
  );
}
