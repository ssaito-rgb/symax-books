"use client";

import { useState } from "react";
import { uploadReceiptForOcr } from "@/lib/receipt-upload";
import { recordPurchaseInvoiceAction } from "@/app/(app)/payables/actions";
import CounterpartyPicker from "@/components/CounterpartyPicker";
import AccountPicker from "@/components/AccountPicker";
import type { Account, Counterparty, FiscalYear } from "@/lib/accounting/types";

export default function PurchaseInvoiceForm({
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
  const expenseAccounts = accounts.filter((a) => a.category === "expense");

  const [receivedDate, setReceivedDate] = useState(today);
  const [counterpartyId, setCounterpartyId] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [expenseAccountId, setExpenseAccountId] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [vendorHint, setVendorHint] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrNotice, setOcrNotice] = useState<string | null>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setOcrLoading(true);
    setOcrNotice(null);
    setVendorHint(null);
    try {
      const result = await uploadReceiptForOcr(file);
      if (result.ocr?.date) setReceivedDate(result.ocr.date);
      if (result.ocr?.amount) setAmount(result.ocr.amount);
      if (result.ocr?.counterpartyId) setCounterpartyId(result.ocr.counterpartyId);
      if (result.ocr?.vendorRaw && !result.ocr.counterpartyId) setVendorHint(result.ocr.vendorRaw);
      if (result.drive?.webViewLink) setEvidenceUrl(result.drive.webViewLink);
      setOcrNotice("請求書の内容を読み取りました。内容を確認してください。");
    } catch (err) {
      setOcrNotice(err instanceof Error ? err.message : "読み取りに失敗しました。");
    } finally {
      setOcrLoading(false);
    }
  }

  return (
    <form action={recordPurchaseInvoiceAction} className="flex flex-col gap-4">
      <input type="hidden" name="fiscal_year_id" value={defaultFiscalYear?.id ?? ""} />
      <input type="hidden" name="counterparty_id" value={counterpartyId} />
      <input type="hidden" name="amount" value={amount} />
      <input type="hidden" name="expense_account_id" value={expenseAccountId} />
      <input type="hidden" name="evidence_url" value={evidenceUrl} />

      <div className="rounded-lg border border-dashed border-gray-300 bg-white p-3">
        <label className="inline-block cursor-pointer rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50">
          {ocrLoading ? "読み取り中…" : "請求書を読み込む（画像・PDF）"}
          <input type="file" accept="image/*,application/pdf" onChange={handleFileSelect} disabled={ocrLoading} className="hidden" />
        </label>
        {ocrNotice && <p className="mt-2 text-sm text-gray-600">{ocrNotice}</p>}
        {vendorHint && (
          <p className="mt-1 text-xs text-amber-700">
            レシート読み取り候補: {vendorHint}（取引先マスタに未登録なら下で新規追加してください）
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-white p-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">取引先</label>
          <CounterpartyPicker counterparties={counterparties} value={counterpartyId} onChange={setCounterpartyId} required />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">先方の請求書番号（任意）</label>
          <input name="vendor_invoice_number" className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">受領日</label>
          <input
            type="date"
            value={receivedDate}
            onChange={(e) => setReceivedDate(e.target.value)}
            name="received_date"
            required
            className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">支払期限（任意）</label>
          <input type="date" name="due_date" className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">金額</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
            required
            className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">経費の種類</label>
          <AccountPicker accounts={expenseAccounts} value={expenseAccountId} onChange={setExpenseAccountId} required />
        </div>
        <div className="md:col-span-2">
          <label className="mb-1 block text-xs font-medium text-gray-600">内容（任意）</label>
          <input name="description" className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
        </div>
      </div>

      <button
        type="submit"
        disabled={!counterpartyId || !amount || !expenseAccountId}
        className="self-start rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        登録する
      </button>
    </form>
  );
}
