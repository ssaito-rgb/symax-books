import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAccessToken, GoogleReauthRequiredError } from "@/lib/google/oauth";
import { ensureYearMonthFolder, uploadReceiptFile } from "@/lib/google/drive";
import { runPdfTextDetection, runTextDetection } from "@/lib/google/vision";
import { parseReceiptText, type ParsedReceipt } from "@/lib/google/receipt-parser";
import { getCounterparties } from "@/lib/accounting/queries";

export const runtime = "nodejs";
export const maxDuration = 60; // PDF OCR polls an async Vision operation; images finish well within this

const BLANK_RECEIPT: ParsedReceipt = { date: null, amount: null, vendorRaw: null, counterpartyId: null };

function sanitizeForFilename(value: string): string {
  return value.replace(/[\\/:*?"<>|\r\n]/g, "").trim().slice(0, 40) || "領収書";
}

function buildFilename(ocr: ParsedReceipt | null, originalName: string): string {
  const ext = originalName.includes(".") ? originalName.slice(originalName.lastIndexOf(".")) : ".jpg";
  const datePart = (ocr?.date ?? new Date().toISOString().slice(0, 10)).replace(/-/g, "");
  const labelPart = sanitizeForFilename(ocr?.vendorRaw ?? "領収書");
  const amountPart = ocr?.amount ? `_${ocr.amount}円` : "";
  return `${datePart}_${labelPart}${amountPart}${ext}`;
}

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof GoogleReauthRequiredError) return err.message;
  return err instanceof Error ? err.message : fallback;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "ファイルがありません" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

  let accessToken: string | null = null;
  let driveError: string | null = null;
  try {
    accessToken = await getAccessToken(supabase);
  } catch (err) {
    driveError = errorMessage(err, "Google接続の確認に失敗しました");
  }

  let ocr: ParsedReceipt | null = null;
  let ocrError: string | null = null;
  try {
    if (isPdf) {
      if (!accessToken) {
        ocrError = "PDFのOCRにはGoogle Drive連携が必要です（設定＞Google Drive連携から接続してください）。";
      } else {
        const bucket = process.env.GOOGLE_GCS_BUCKET;
        if (!bucket) throw new Error("環境変数 GOOGLE_GCS_BUCKET が設定されていません");
        const [counterparties, text] = await Promise.all([
          getCounterparties(),
          runPdfTextDetection(accessToken, bucket, buffer),
        ]);
        ocr = text ? parseReceiptText(text, counterparties) : BLANK_RECEIPT;
      }
    } else {
      const [counterparties, text] = await Promise.all([getCounterparties(), runTextDetection(buffer)]);
      ocr = text ? parseReceiptText(text, counterparties) : BLANK_RECEIPT;
    }
  } catch (err) {
    ocrError = errorMessage(err, "OCRに失敗しました");
  }

  let drive: { webViewLink: string } | null = null;
  if (accessToken) {
    try {
      const folderId = await ensureYearMonthFolder(accessToken, ocr?.date ?? null);
      const uploaded = await uploadReceiptFile(accessToken, {
        buffer,
        mimeType: file.type || (isPdf ? "application/pdf" : "image/jpeg"),
        filename: buildFilename(ocr, file.name),
        folderId,
      });
      drive = { webViewLink: uploaded.webViewLink };
    } catch (err) {
      driveError = errorMessage(err, "Google Driveへのアップロードに失敗しました");
    }
  }

  return NextResponse.json({ ocr, ocrError, drive, driveError });
}
