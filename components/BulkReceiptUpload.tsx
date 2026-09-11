"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { uploadReceiptForOcr } from "@/lib/receipt-upload";
import AccountPicker from "@/components/AccountPicker";
import type { Account, Counterparty, FiscalYear } from "@/lib/accounting/types";

type DraftRow = {
  key: string;
  fileName: string;
  status: "processing" | "ready" | "error";
  errorMessage?: string;
  date: string;
  amount: number;
  account_id: string;
  counterparty_id: string;
  vendorHint: string | null;
  evidence_url: string;
  registered: boolean;
};

export default function BulkReceiptUpload({
  accounts,
  counterparties,
  fiscalYears,
}: {
  accounts: Account[];
  counterparties: Counterparty[];
  fiscalYears: FiscalYear[];
}) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const defaultFiscalYear = fiscalYears.find((fy) => fy.start_date <= today && today <= fy.end_date) ?? fiscalYears[0];
  const bankAccount = accounts.find((a) => a.code === "1002");

  const [rows, setRows] = useState<DraftRow[]>([]);
  const [registering, setRegistering] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const counterpartyById = useMemo(() => new Map(counterparties.map((c) => [c.id, c.name])), [counterparties]);

  function updateRow(key: string, patch: Partial<DraftRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  async function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;

    const newRows: DraftRow[] = files.map((file) => ({
      key: crypto.randomUUID(),
      fileName: file.name,
      status: "processing",
      date: today,
      amount: 0,
      account_id: "",
      counterparty_id: "",
      vendorHint: null,
      evidence_url: "",
      registered: false,
    }));
    setRows((prev) => [...prev, ...newRows]);
    setSummary(null);

    // Sequential, not parallel — keeps each request well within the OCR route's own time budget
    // and avoids bursting Vision/GCS all at once for no benefit at this volume.
    for (let i = 0; i < files.length; i++) {
      const key = newRows[i].key;
      try {
        const result = await uploadReceiptForOcr(files[i]);
        updateRow(key, {
          status: "ready",
          date: result.ocr?.date ?? today,
          amount: result.ocr?.amount ?? 0,
          counterparty_id: result.ocr?.counterpartyId ?? "",
          vendorHint: result.ocr?.vendorRaw && !result.ocr.counterpartyId ? result.ocr.vendorRaw : null,
          evidence_url: result.drive?.webViewLink ?? "",
        });
      } catch (err) {
        updateRow(key, {
          status: "error",
          errorMessage: err instanceof Error ? err.message : "処理に失敗しました",
        });
      }
    }
  }

  function removeRow(key: string) {
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  async function handleRegisterAll() {
    if (!defaultFiscalYear || !bankAccount) return;
    setRegistering(true);
    setSummary(null);
    const supabase = createClient();

    let successCount = 0;
    let failCount = 0;

    for (const row of rows) {
      if (row.registered || row.status !== "ready") continue;
      if (!row.account_id || !row.amount) {
        failCount++;
        continue;
      }

      const { count } = await supabase
        .from("journal_entries")
        .select("id", { count: "exact", head: true })
        .eq("fiscal_year_id", defaultFiscalYear.id);
      const entryNumber = String((count ?? 0) + 1).padStart(4, "0");

      const { error } = await supabase.rpc("create_journal_entry", {
        header: {
          entry_number: entryNumber,
          fiscal_year_id: defaultFiscalYear.id,
          entry_date: row.date,
          description: row.fileName,
        },
        lines: [
          {
            account_id: row.account_id,
            counterparty_id: row.counterparty_id || null,
            debit_amount: row.amount,
            credit_amount: 0,
            evidence_url: row.evidence_url || null,
          },
          {
            account_id: bankAccount.id,
            debit_amount: 0,
            credit_amount: row.amount,
          },
        ],
      });

      if (error) {
        failCount++;
      } else {
        successCount++;
        updateRow(row.key, { registered: true });
      }
    }

    setRegistering(false);
    setSummary(`${successCount}件登録しました${failCount > 0 ? `（${failCount}件は未入力項目があり失敗しました）` : ""}。`);
    if (failCount === 0) router.refresh();
  }

  const readyCount = rows.filter((r) => r.status === "ready" && !r.registered).length;
  const allSelectedHaveAccount = rows
    .filter((r) => r.status === "ready" && !r.registered)
    .every((r) => r.account_id && r.amount > 0);

  return (
    <div className="flex flex-col gap-4">
      <label className="inline-block w-fit cursor-pointer rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
        領収書を選択（複数可）
        <input type="file" accept="image/*,application/pdf" multiple onChange={handleFilesSelected} className="hidden" />
      </label>

      {rows.length > 0 && (
        <div className="flex flex-col gap-3">
          {rows.map((row) => (
            <div
              key={row.key}
              className={`rounded-lg border bg-white p-3 ${
                row.registered ? "border-green-200 opacity-60" : "border-gray-200"
              }`}
            >
              <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
                <span>{row.fileName}</span>
                {row.status === "processing" && <span>読み取り中…</span>}
                {row.status === "error" && <span className="text-red-600">{row.errorMessage}</span>}
                {row.registered && <span className="text-green-700">✓ 登録済み</span>}
                {!row.registered && row.status !== "processing" && (
                  <button type="button" onClick={() => removeRow(row.key)} className="text-gray-400 hover:text-red-600">
                    削除
                  </button>
                )}
              </div>

              {row.status === "ready" && (
                <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
                  <input
                    type="date"
                    value={row.date}
                    disabled={row.registered}
                    onChange={(e) => updateRow(row.key, { date: e.target.value })}
                    className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  />
                  <input
                    type="number"
                    placeholder="金額"
                    value={row.amount || ""}
                    disabled={row.registered}
                    onChange={(e) => updateRow(row.key, { amount: Number(e.target.value) || 0 })}
                    className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  />
                  <div className="md:col-span-2">
                    <AccountPicker
                      accounts={accounts}
                      value={row.account_id}
                      onChange={(v) => updateRow(row.key, { account_id: v })}
                      required
                    />
                  </div>
                  {row.counterparty_id && (
                    <p className="text-xs text-gray-500 md:col-span-4">
                      取引先候補: {counterpartyById.get(row.counterparty_id) ?? row.counterparty_id}
                    </p>
                  )}
                  {row.vendorHint && (
                    <p className="text-xs text-amber-700 md:col-span-4">
                      レシート読み取り候補: {row.vendorHint}（取引先マスタに未登録のようです）
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {rows.length > 0 && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRegisterAll}
            disabled={registering || readyCount === 0 || !allSelectedHaveAccount}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {registering ? "登録中…" : `全て登録する（${readyCount}件）`}
          </button>
          {!allSelectedHaveAccount && readyCount > 0 && (
            <span className="text-xs text-amber-700">勘定科目・金額が未入力の行があります</span>
          )}
        </div>
      )}

      {summary && <p className="text-sm text-gray-700">{summary}</p>}
    </div>
  );
}
