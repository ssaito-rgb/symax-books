"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateFiscalYearTaxStatus } from "@/app/(app)/settings/actions";

const TAX_STATUS_LABELS: Record<string, string> = {
  undetermined: "未確定",
  exempt: "免税事業者",
  taxable_general: "課税事業者（原則課税）",
  taxable_simplified: "課税事業者（簡易課税）",
};

export default function TaxStatusSelect({ fiscalYearId, taxStatus }: { fiscalYearId: string; taxStatus: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleChange(value: string) {
    const formData = new FormData();
    formData.set("id", fiscalYearId);
    formData.set("tax_status", value);
    startTransition(async () => {
      await updateFiscalYearTaxStatus(formData);
      router.refresh();
    });
  }

  return (
    <select
      defaultValue={taxStatus}
      disabled={pending}
      onChange={(e) => handleChange(e.target.value)}
      className="rounded-md border border-gray-300 px-2 py-1 text-xs disabled:opacity-50"
    >
      {Object.entries(TAX_STATUS_LABELS).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}
