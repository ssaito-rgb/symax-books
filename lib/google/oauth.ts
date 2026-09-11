import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";

// drive.file: write receipt files into the user's own Drive.
// devstorage.read_write: stage PDFs in GCS for Vision's async OCR (images use the sync API and don't need this).
// Both scopes run under the user's own Google identity — they own the GCP project, so no separate service account is needed.
const SCOPES = [
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/devstorage.read_write",
].join(" ");

export class GoogleReauthRequiredError extends Error {
  constructor() {
    super("Google Driveへの接続が切れています。設定画面から再接続してください。");
    this.name = "GoogleReauthRequiredError";
  }
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`環境変数 ${name} が設定されていません`);
  return value;
}

export function redirectUriFor(origin: string): string {
  return `${origin}/api/google/oauth/callback`;
}

export function getGoogleAuthUrl(origin: string, state: string): string {
  const params = new URLSearchParams({
    client_id: requireEnv("GOOGLE_OAUTH_CLIENT_ID"),
    redirect_uri: redirectUriFor(origin),
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

type TokenResponse = {
  access_token: string;
  expires_in: number;
  scope: string;
  refresh_token?: string;
  error?: string;
  error_description?: string;
};

export async function exchangeCodeForTokens(code: string, origin: string): Promise<TokenResponse> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: requireEnv("GOOGLE_OAUTH_CLIENT_ID"),
      client_secret: requireEnv("GOOGLE_OAUTH_CLIENT_SECRET"),
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUriFor(origin),
    }),
  });
  const json = (await res.json()) as TokenResponse;
  if (!res.ok || !json.access_token) {
    throw new Error(json.error_description ?? json.error ?? "Googleトークンの取得に失敗しました");
  }
  return json;
}

export async function saveRefreshToken(
  supabase: SupabaseClient<Database>,
  userId: string,
  refreshToken: string,
  scope: string,
) {
  const { error } = await supabase
    .from("google_oauth_tokens")
    .upsert({ user_id: userId, refresh_token: refreshToken, scope, updated_at: new Date().toISOString() });
  if (error) throw error;
}

export async function isGoogleConnected(supabase: SupabaseClient<Database>): Promise<boolean> {
  const { data } = await supabase.from("google_oauth_tokens").select("id").maybeSingle();
  return !!data;
}

export async function disconnectGoogle(supabase: SupabaseClient<Database>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data } = await supabase.from("google_oauth_tokens").select("refresh_token").maybeSingle();
  if (data?.refresh_token) {
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(data.refresh_token)}`, {
      method: "POST",
    }).catch(() => {
      // best-effort revoke; deleting our own copy below is what actually matters
    });
  }
  const { error } = await supabase.from("google_oauth_tokens").delete().eq("user_id", user.id);
  if (error) throw error;
}

/** Mints a fresh access token from the stored refresh token. Returns null if never connected. */
export async function getAccessToken(supabase: SupabaseClient<Database>): Promise<string | null> {
  const { data } = await supabase.from("google_oauth_tokens").select("refresh_token").maybeSingle();
  if (!data) return null;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: requireEnv("GOOGLE_OAUTH_CLIENT_ID"),
      client_secret: requireEnv("GOOGLE_OAUTH_CLIENT_SECRET"),
      refresh_token: data.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  const json = (await res.json()) as TokenResponse;
  if (!res.ok || !json.access_token) {
    if (json.error === "invalid_grant") throw new GoogleReauthRequiredError();
    throw new Error(json.error_description ?? json.error ?? "Googleアクセストークンの更新に失敗しました");
  }
  return json.access_token;
}
