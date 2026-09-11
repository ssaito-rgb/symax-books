function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`環境変数 ${name} が設定されていません`);
  return value;
}

/** Thin wrapper around Resend's REST API. No SDK — this project keeps to fetch-only integrations. */
export async function sendEmail(params: { to: string; subject: string; html: string }): Promise<void> {
  const apiKey = requireEnv("RESEND_API_KEY");
  const from = process.env.RESEND_FROM_ADDRESS || "Symax Books <onboarding@resend.dev>";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: params.to, subject: params.subject, html: params.html }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`メール送信に失敗しました（HTTP ${res.status}）: ${body}`);
  }
}
