"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { FiscalYear } from "@/lib/accounting/types";

export default function BsFilters({
  fiscalYears,
  selectedFiscalYearId,
  asOfDate,
}: {
  fiscalYears: FiscalYear[];
  selectedFiscalYearId: string;
  asOfDate: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.push(`/reports/bs?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
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
      <input
        type="date"
        value={asOfDate}
        onChange={(e) => update("asOf", e.target.value)}
        className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
      />
    </div>
  );
}
