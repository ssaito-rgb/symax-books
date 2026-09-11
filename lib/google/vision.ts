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
