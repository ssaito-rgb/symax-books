"use client";

import { useState } from "react";
import { markPaidAction } from "@/app/(app)/payables/actions";

export default function MarkPurchasePaidForm({ invoiceId, amount }: { invoiceId: string; amount: number }) {
  const [open, setOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-sm text-indigo-600 hover:underline">
        支払いを記録
      </button>
    );
  }

  return (
    <form action={markPaidAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="invoice_id" value={invoiceId} />
      <input type="date" name="paid_date" defaultValue={today} required className="rounded-md border border-gray-300 px-2 py-1 text-xs" />
      <input
        type="number"
        name="paid_amount"
        defaultValue={amount}
        required
        className="w-24 rounded-md border border-gray-300 px-2 py-1 text-xs"
      />
      <button type="submit" className="rounded-md bg-indigo-600 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-700">
        確定
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-xs text-gray-400 hover:text-gray-600">
        キャンセル
      </button>
    </form>
  );
}
