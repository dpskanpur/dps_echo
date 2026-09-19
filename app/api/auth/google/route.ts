import { NextResponse } from "next/server";
import { publicUrl, publicBaseUrl } from "@/lib/public-url";
import crypto from "crypto";
import { ALLOWED_DOMAIN } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const redirectPath = searchParams.get("redirect") || "/";

  const clientId = process.env.GOOGLE_CLIENT_ID;

  const redirectUri = `${publicBaseUrl(request)}/api/auth/callback/google`;

  if (!clientId) {
    return NextResponse.redirect(
      publicUrl(`/login?error=google_oauth_missing&redirect=${encodeURIComponent(redirectPath)}`, request)
    );
  }

  // Generate cryptographic CSRF token for OAuth state verification
  const csrfToken = crypto.randomBytes(16).toString("hex");
  const statePayload = `${csrfToken}:${redirectPath}`;

  const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleAuthUrl.searchParams.set("client_id", clientId);
  googleAuthUrl.searchParams.set("redirect_uri", redirectUri);
  googleAuthUrl.searchParams.set("response_type", "code");
  googleAuthUrl.searchParams.set("scope", "openid email profile");
  googleAuthUrl.searchParams.set("hd", ALLOWED_DOMAIN);
  googleAuthUrl.searchParams.set("prompt", "select_account");
  googleAuthUrl.searchParams.set("state", statePayload);

  const response = NextResponse.redirect(googleAuthUrl.toString());
  response.cookies.set("dps_echo_oauth_csrf", csrfToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60, // 10 minutes TTL
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
