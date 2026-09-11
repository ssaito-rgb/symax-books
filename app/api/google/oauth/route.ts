import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { getGoogleAuthUrl } from "@/lib/google/oauth";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const state = randomBytes(16).toString("hex");
  const authUrl = getGoogleAuthUrl(request.nextUrl.origin, state);

  const response = NextResponse.redirect(authUrl);
  response.cookies.set("google_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}
