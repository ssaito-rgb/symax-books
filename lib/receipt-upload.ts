const MAX_UPLOAD_DIMENSION = 2000;

export function isPdfFile(file: File): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

/** Re-encodes to JPEG and downscales client-side (handles HEIC-from-iPhone and keeps upload size small). */
export async function normalizeImageForUpload(file: File): Promise<File> {
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

export type ReceiptUploadResult = {
  ocr: { date: string | null; amount: number | null; vendorRaw: string | null; counterpartyId: string | null } | null;
  ocrError: string | null;
  drive: { webViewLink: string } | null;
  driveError: string | null;
};

/** Normalizes (if image) and POSTs a receipt file to /api/receipts/upload. */
export async function uploadReceiptForOcr(file: File): Promise<ReceiptUploadResult> {
  const normalized = isPdfFile(file) ? file : await normalizeImageForUpload(file);
  const formData = new FormData();
  formData.append("file", normalized);

  const res = await fetch("/api/receipts/upload", { method: "POST", body: formData });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error ?? "領収書の処理に失敗しました。");
  return result as ReceiptUploadResult;
}
