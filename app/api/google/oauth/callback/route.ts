import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exchangeCodeForTokens, saveRefreshToken } from "@/lib/google/oauth";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const settingsUrl = new URL("/settings/google-drive", request.url);

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const storedState = request.cookies.get("google_oauth_state")?.value;
  const error = request.nextUrl.searchParams.get("error");

  if (error) {
    settingsUrl.searchParams.set("error", error);
    return NextResponse.redirect(settingsUrl);
  }
  if (!code || !state || !storedState || state !== storedState) {
    settingsUrl.searchParams.set("error", "invalid_state");
    return NextResponse.redirect(settingsUrl);
  }

  try {
    const tokens = await exchangeCodeForTokens(code, request.nextUrl.origin);
    if (!tokens.refresh_token) {
      // Google omits refresh_token if the user has already granted this app consent
      // before without revoking it; prompt=consent on the auth URL should prevent this,
      // but guard anyway with a clear message instead of silently storing nothing.
      settingsUrl.searchParams.set("error", "no_refresh_token");
      return NextResponse.redirect(settingsUrl);
    }
    await saveRefreshToken(supabase, user.id, tokens.refresh_token, tokens.scope);
    settingsUrl.searchParams.set("connected", "1");
  } catch (err) {
    console.error("[google oauth callback]", err);
    settingsUrl.searchParams.set("error", "exchange_failed");
  }

  const response = NextResponse.redirect(settingsUrl);
  response.cookies.delete("google_oauth_state");
  return response;
}
