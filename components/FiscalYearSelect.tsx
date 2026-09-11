"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { FiscalYear } from "@/lib/accounting/types";

export default function FiscalYearSelect({
  fiscalYears,
  selectedId,
  basePath,
}: {
  fiscalYears: FiscalYear[];
  selectedId: string;
  basePath: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("fy", value);
    router.push(`${basePath}?${params.toString()}`);
  }

  return (
    <select
      value={selectedId}
      onChange={(e) => handleChange(e.target.value)}
      className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
    >
      {fiscalYears.map((fy) => (
        <option key={fy.id} value={fy.id}>
          {fy.label}
        </option>
      ))}
    </select>
  );
}
