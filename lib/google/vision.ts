import { randomUUID } from "node:crypto";
import { deleteGcsObjectsQuietly, downloadFromGcs, listGcsObjects, uploadToGcs } from "@/lib/google/gcs";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`環境変数 ${name} が設定されていません`);
  return value;
}

/** Runs OCR on an image buffer via Cloud Vision. Returns "" (never throws) if no text is found. */
export async function runTextDetection(buffer: Buffer): Promise<string> {
  const apiKey = requireEnv("GOOGLE_VISION_API_KEY");
  const base64 = buffer.toString("base64");

  const res = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: [
        {
          image: { content: base64 },
          features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
        },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`Vision APIの呼び出しに失敗しました（HTTP ${res.status}）`);
  }

  const json = await res.json();
  const first = json?.responses?.[0];
  if (first?.error) {
    throw new Error(first.error.message ?? "Vision APIがエラーを返しました");
  }
  return first?.fullTextAnnotation?.text ?? "";
}

/**
 * PDF OCR via Vision's async batch API (the sync `images:annotate` endpoint doesn't accept PDF).
 * Stages the file in GCS, polls the operation, reads the JSON result back from GCS, then cleans up.
 *
 * Uses the caller's OAuth access token (cloud-platform scope) throughout, for both the Vision calls
 * and the GCS reads/writes. Vision's async file access runs as the calling identity rather than a
 * separate Vision service agent, so the token needs enough scope to call Vision itself, not just
 * Storage — a plain API key has no IAM identity behind it and can't read a private bucket object.
 */
export async function runPdfTextDetection(accessToken: string, bucket: string, pdfBuffer: Buffer): Promise<string> {
  const id = randomUUID();
  const inputObject = `ocr-inbox/${id}.pdf`;
  const outputPrefix = `ocr-output/${id}/`;

  await uploadToGcs(accessToken, bucket, inputObject, pdfBuffer, "application/pdf");

  const startRes = await fetch("https://vision.googleapis.com/v1/files:asyncBatchAnnotate", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: [
        {
          inputConfig: { gcsSource: { uri: `gs://${bucket}/${inputObject}` }, mimeType: "application/pdf" },
          features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
          outputConfig: { gcsDestination: { uri: `gs://${bucket}/${outputPrefix}` }, batchSize: 20 },
        },
      ],
    }),
  });
  const startJson = await startRes.json();
  if (!startRes.ok) {
    throw new Error(startJson?.error?.message ?? `PDF OCRの開始に失敗しました（HTTP ${startRes.status}）`);
  }
  const operationName: string = startJson.name;

  const deadline = Date.now() + 50_000; // leave headroom under the route's maxDuration
  let done = false;
  while (Date.now() < deadline && !done) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const opRes = await fetch(`https://vision.googleapis.com/v1/${operationName}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const opJson = await opRes.json();
    if (opJson.error) throw new Error(opJson.error.message ?? "PDF OCRでエラーが発生しました");
    done = !!opJson.done;
  }
  if (!done) throw new Error("PDF OCRが時間内に完了しませんでした（ページ数が多い可能性があります）");

  const outputObjects = await listGcsObjects(accessToken, bucket, outputPrefix);
  const texts: string[] = [];
  for (const name of outputObjects.sort()) {
    const buf = await downloadFromGcs(accessToken, bucket, name);
    const json = JSON.parse(buf.toString("utf-8"));
    for (const response of json.responses ?? []) {
      if (response.fullTextAnnotation?.text) texts.push(response.fullTextAnnotation.text);
    }
  }

  deleteGcsObjectsQuietly(accessToken, bucket, [inputObject, ...outputObjects]).catch(() => {});

  return texts.join("\n");
}
