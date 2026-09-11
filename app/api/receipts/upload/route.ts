import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAccessToken, GoogleReauthRequiredError } from "@/lib/google/oauth";
import { ensureYearMonthFolder, uploadReceiptFile } from "@/lib/google/drive";
import { runTextDetection } from "@/lib/google/vision";
import { parseReceiptText, type ParsedReceipt } from "@/lib/google/receipt-parser";
import { getCounterparties } from "@/lib/accounting/queries";

export const runtime = "nodejs";

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

  let ocr: ParsedReceipt | null = null;
  let ocrError: string | null = null;
  try {
    const counterparties = await getCounterparties();
    const text = await runTextDetection(buffer);
    ocr = text ? parseReceiptText(text, counterparties) : { date: null, amount: null, vendorRaw: null, counterpartyId: null };
  } catch (err) {
    ocrError = err instanceof Error ? err.message : "OCRに失敗しました";
  }

  let drive: { webViewLink: string } | null = null;
  let driveError: string | null = null;
  try {
    const accessToken = await getAccessToken(supabase);
    if (accessToken) {
      const folderId = await ensureYearMonthFolder(accessToken, ocr?.date ?? null);
      const uploaded = await uploadReceiptFile(accessToken, {
        buffer,
        mimeType: file.type || "image/jpeg",
        filename: buildFilename(ocr, file.name),
        folderId,
      });
      drive = { webViewLink: uploaded.webViewLink };
    }
  } catch (err) {
    driveError =
      err instanceof GoogleReauthRequiredError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Google Driveへのアップロードに失敗しました";
  }

  return NextResponse.json({ ocr, ocrError, drive, driveError });
}
