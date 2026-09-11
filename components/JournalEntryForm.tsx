"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { linesAreBalanced, sumCredit, sumDebit } from "@/lib/accounting/balance";
import { formatYen } from "@/lib/accounting/fiscal-year";
import AccountPicker from "@/components/AccountPicker";
import CounterpartyPicker from "@/components/CounterpartyPicker";
import type { Account, Counterparty, FiscalYear, JournalLineDraft, TaxCategory } from "@/lib/accounting/types";

type LineDraft = JournalLineDraft & { key: string };

function emptyLine(): LineDraft {
  return {
    key: crypto.randomUUID(),
    account_id: "",
    counterparty_id: "",
    debit_amount: 0,
    credit_amount: 0,
    tax_category_code: "",
    description: "",
    evidence_url: "",
  };
}

const MAX_UPLOAD_DIMENSION = 2000;

/** Re-encodes to JPEG and downscales client-side (handles HEIC-from-iPhone and keeps upload size small). */
async function normalizeImageForUpload(file: File): Promise<File> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = objectUrl;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("画像を読み込めませんでした"));
    });

    const scale = Math.min(1, MAX_UPLOAD_DIMENSION / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file; // fall back to the original file if browser can't decode it client-side
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export default function JournalEntryForm({
  accounts,
  counterparties,
  taxCategories,
  fiscalYears,
}: {
  accounts: Account[];
  counterparties: Counterparty[];
  taxCategories: TaxCategory[];
  fiscalYears: FiscalYear[];
}) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const defaultFiscalYear =
    fiscalYears.find((fy) => fy.start_date <= today && today <= fy.end_date) ?? fiscalYears[0];

  const [entryDate, setEntryDate] = useState(today);
  const [fiscalYearId, setFiscalYearId] = useState(defaultFiscalYear?.id ?? "");
  const [description, setDescription] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([emptyLine(), emptyLine()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrNotice, setOcrNotice] = useState<string | null>(null);
  const [vendorHint, setVendorHint] = useState<string | null>(null);

  const accountById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const totalDebit = sumDebit(lines);
  const totalCredit = sumCredit(lines);
  const balanced = linesAreBalanced(lines);

  function updateLine(key: string, patch: Partial<LineDraft>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function addLine() {
    setLines((prev) => [...prev, emptyLine()]);
  }

  function removeLine(key: string) {
    setLines((prev) => (prev.length > 2 ? prev.filter((l) => l.key !== key) : prev));
  }

  async function handleReceiptSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setOcrLoading(true);
    setOcrNotice(null);
    setVendorHint(null);

    try {
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      const normalized = isPdf ? file : await normalizeImageForUpload(file);
      const formData = new FormData();
      formData.append("file", normalized);

      const res = await fetch("/api/receipts/upload", { method: "POST", body: formData });
      const result = await res.json();

      if (!res.ok) {
        setOcrNotice(result.error ?? "領収書の処理に失敗しました。");
        return;
      }

      const notices: string[] = [];

      if (result.ocr) {
        if (result.ocr.date) setEntryDate(result.ocr.date);
        setLines((prev) => {
          const next = [...prev];
          if (result.ocr.amount) next[0] = { ...next[0], debit_amount: result.ocr.amount, credit_amount: 0 };
          if (result.ocr.counterpartyId) next[0] = { ...next[0], counterparty_id: result.ocr.counterpartyId };
          if (result.drive?.webViewLink) next[0] = { ...next[0], evidence_url: result.drive.webViewLink };
          return next;
        });
        if (result.ocr.vendorRaw && !result.ocr.counterpartyId) {
          setVendorHint(
            `レシート読み取り候補: ${result.ocr.vendorRaw}（取引先マスタに未登録のようです。必要なら設定＞取引先マスタから追加してください）`,
          );
        }
        notices.push("OCRで日付・金額を1行目に自動入力しました。内容を確認してください。");
      } else if (result.ocrError) {
        notices.push(`OCR: ${result.ocrError}`);
      }

      if (result.drive) {
        notices.push("Google Driveに保存しました。");
      } else if (result.driveError) {
        notices.push(`Drive: ${result.driveError}`);
      } else {
        notices.push("Google Drive未接続のため、証憑リンクは自動設定されません（設定＞Google Drive連携）。");
      }

      setOcrNotice(notices.join(" "));
    } catch {
      setOcrNotice("領収書の処理中にエラーが発生しました。");
    } finally {
      setOcrLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!fiscalYearId) {
      setError("会計期間を選択してください。");
      return;
    }
    if (!balanced) {
      setError("借方合計と貸方合計が一致していません。");
      return;
    }
    for (const line of lines) {
      if (!line.account_id) {
        setError("すべての行で勘定科目を選択してください。");
        return;
      }
      const account = accountById.get(line.account_id);
      if (account?.requires_counterparty && !line.counterparty_id) {
        setError(`「${account.name}」は取引先の入力が必須です。`);
        return;
      }
    }

    setSubmitting(true);
    const supabase = createClient();

    const { count, error: countError } = await supabase
      .from("journal_entries")
      .select("id", { count: "exact", head: true })
      .eq("fiscal_year_id", fiscalYearId);

    if (countError) {
      setError(countError.message);
      setSubmitting(false);
      return;
    }

    const entryNumber = String((count ?? 0) + 1).padStart(4, "0");

    const { error: rpcError } = await supabase.rpc("create_journal_entry", {
      header: {
        entry_number: entryNumber,
        fiscal_year_id: fiscalYearId,
        entry_date: entryDate,
        description,
      },
      lines: lines.map((l) => ({
        account_id: l.account_id,
        counterparty_id: l.counterparty_id || null,
        debit_amount: l.debit_amount || 0,
        credit_amount: l.credit_amount || 0,
        tax_category_code: l.tax_category_code || null,
        tax_amount: l.tax_amount ?? null,
        description: l.description || null,
        evidence_url: l.evidence_url || null,
      })),
    });

    setSubmitting(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    router.push("/journal");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-white p-4 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">日付</label>
          <input
            type="date"
            required
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">会計期間</label>
          <select
            value={fiscalYearId}
            onChange={(e) => setFiscalYearId(e.target.value)}
            required
            className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          >
            <option value="">選択してください</option>
            {fiscalYears.map((fy) => (
              <option key={fy.id} value={fy.id}>
                {fy.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">摘要</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            placeholder="例）METS バーチャルオフィス利用料"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-gray-300 bg-white p-3">
        <label className="cursor-pointer rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50">
          {ocrLoading ? "読み取り中…" : "領収書を読み込む"}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleReceiptSelect}
            disabled={ocrLoading}
            className="hidden"
          />
        </label>
        {ocrNotice && <p className="text-sm text-gray-600">{ocrNotice}</p>}
      </div>
      {vendorHint && <p className="text-xs text-amber-700">{vendorHint}</p>}

      <div className="flex flex-col gap-3">
        {lines.map((line, idx) => {
          const account = accountById.get(line.account_id);
          return (
            <div key={line.key} className="grid grid-cols-1 gap-2 rounded-lg border border-gray-200 bg-white p-3 md:grid-cols-12 md:items-center">
              <div className="md:col-span-3">
                <AccountPicker
                  accounts={accounts}
                  value={line.account_id}
                  onChange={(v) => updateLine(line.key, { account_id: v })}
                  required
                />
              </div>
              <div className="md:col-span-2">
                <input
                  type="number"
                  min={0}
                  placeholder="借方金額"
                  value={line.debit_amount || ""}
                  onChange={(e) =>
                    updateLine(line.key, { debit_amount: Number(e.target.value) || 0, credit_amount: 0 })
                  }
                  className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <input
                  type="number"
                  min={0}
                  placeholder="貸方金額"
                  value={line.credit_amount || ""}
                  onChange={(e) =>
                    updateLine(line.key, { credit_amount: Number(e.target.value) || 0, debit_amount: 0 })
                  }
                  className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <CounterpartyPicker
                  counterparties={counterparties}
                  value={line.counterparty_id ?? ""}
                  onChange={(v) => updateLine(line.key, { counterparty_id: v })}
                  required={account?.requires_counterparty}
                />
              </div>
              <div className="md:col-span-2">
                <input
                  placeholder="内容・証憑リンク"
                  value={line.evidence_url ?? ""}
                  onChange={(e) => updateLine(line.key, { evidence_url: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                />
              </div>
              <div className="md:col-span-1 text-right">
                <button
                  type="button"
                  onClick={() => removeLine(line.key)}
                  disabled={lines.length <= 2}
                  className="text-xs text-gray-400 hover:text-red-600 disabled:opacity-30"
                >
                  行{idx + 1}削除
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <button type="button" onClick={addLine} className="self-start rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50">
        + 行を追加
      </button>

      <div
        className={`rounded-md border p-3 text-sm ${
          balanced ? "border-green-200 bg-green-50 text-green-800" : "border-amber-200 bg-amber-50 text-amber-800"
        }`}
      >
        借方合計 {formatYen(totalDebit)} / 貸方合計 {formatYen(totalCredit)}
        {balanced ? "　✓ 貸借一致" : "　貸借が一致するまで登録できません"}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={!balanced || submitting}
        className="self-start rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {submitting ? "登録中…" : "仕訳を登録する"}
      </button>
    </form>
  );
}
