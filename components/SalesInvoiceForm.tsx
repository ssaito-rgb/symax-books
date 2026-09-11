"use client";

import { useMemo, useState } from "react";
import { createDraftAction } from "@/app/(app)/invoices/actions";
import { INVOICE_ITEMS } from "@/lib/accounting/invoice-items";
import { formatYen } from "@/lib/accounting/fiscal-year";
import CounterpartyPicker from "@/components/CounterpartyPicker";
import type { Account, Counterparty, FiscalYear } from "@/lib/accounting/types";

type LineDraft = {
  key: string;
  itemLabel: string;
  description: string;
  quantity: number;
  unitPrice: number;
};

function emptyLine(): LineDraft {
  return { key: crypto.randomUUID(), itemLabel: INVOICE_ITEMS[0].label, description: INVOICE_ITEMS[0].label, quantity: 1, unitPrice: 0 };
}

export default function SalesInvoiceForm({
  accounts,
  counterparties,
  fiscalYears,
}: {
  accounts: Account[];
  counterparties: Counterparty[];
  fiscalYears: FiscalYear[];
}) {
  const today = new Date().toISOString().slice(0, 10);
  const defaultFiscalYear = fiscalYears.find((fy) => fy.start_date <= today && today <= fy.end_date) ?? fiscalYears[0];
  const accountIdByCode = useMemo(() => new Map(accounts.map((a) => [a.code, a.id])), [accounts]);

  const [counterpartyId, setCounterpartyId] = useState("");
  const [issueDate, setIssueDate] = useState(today);
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([emptyLine()]);

  function updateLine(key: string, patch: Partial<LineDraft>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function addLine() {
    setLines((prev) => [...prev, emptyLine()]);
  }

  function removeLine(key: string) {
    setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.key !== key) : prev));
  }

  const total = lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);

  const linesPayload = lines.map((l) => {
    const item = INVOICE_ITEMS.find((i) => i.label === l.itemLabel) ?? INVOICE_ITEMS[0];
    return {
      description: l.description,
      revenue_account_id: accountIdByCode.get(item.accountCode) ?? "",
      quantity: l.quantity,
      unit_price: l.unitPrice,
      amount: l.quantity * l.unitPrice,
    };
  });

  const canSubmit = counterpartyId && issueDate && linesPayload.every((l) => l.revenue_account_id && l.amount > 0);

  return (
    <form action={createDraftAction} className="flex flex-col gap-4">
      <input type="hidden" name="counterparty_id" value={counterpartyId} />
      <input type="hidden" name="fiscal_year_id" value={defaultFiscalYear?.id ?? ""} />
      <input type="hidden" name="lines" value={JSON.stringify(linesPayload)} />

      <div className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-white p-4 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">請求先</label>
          <CounterpartyPicker counterparties={counterparties} value={counterpartyId} onChange={setCounterpartyId} required />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">請求日</label>
          <input
            type="date"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
            name="issue_date"
            required
            className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">支払期限（任意）</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            name="due_date"
            className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {lines.map((line) => (
          <div key={line.key} className="grid grid-cols-1 gap-2 rounded-lg border border-gray-200 bg-white p-3 md:grid-cols-12 md:items-center">
            <div className="md:col-span-3">
              <select
                value={line.itemLabel}
                onChange={(e) => updateLine(line.key, { itemLabel: e.target.value, description: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              >
                {INVOICE_ITEMS.map((item) => (
                  <option key={item.label} value={item.label}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-4">
              <input
                value={line.description}
                onChange={(e) => updateLine(line.key, { description: e.target.value })}
                placeholder="内容（明細に表示されます）"
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div className="md:col-span-1">
              <input
                type="number"
                min={1}
                value={line.quantity}
                onChange={(e) => updateLine(line.key, { quantity: Number(e.target.value) || 1 })}
                placeholder="数量"
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <input
                type="number"
                min={0}
                value={line.unitPrice || ""}
                onChange={(e) => updateLine(line.key, { unitPrice: Number(e.target.value) || 0 })}
                placeholder="単価"
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div className="md:col-span-1 text-right font-mono text-sm">{formatYen(line.quantity * line.unitPrice)}</div>
            <div className="md:col-span-1 text-right">
              <button type="button" onClick={() => removeLine(line.key)} disabled={lines.length <= 1} className="text-xs text-gray-400 hover:text-red-600 disabled:opacity-30">
                削除
              </button>
            </div>
          </div>
        ))}
      </div>

      <button type="button" onClick={addLine} className="self-start rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50">
        + 明細行を追加
      </button>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">備考（任意）</label>
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          name="notes"
          className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        />
      </div>

      <div className="rounded-md border border-indigo-200 bg-indigo-50 p-3 text-sm font-medium text-indigo-800">
        請求金額合計：{formatYen(total)}
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        className="self-start rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        下書きを作成する
      </button>
    </form>
  );
}
