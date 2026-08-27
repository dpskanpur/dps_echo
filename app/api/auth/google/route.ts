import { NextResponse } from "next/server";
import { ALLOWED_DOMAIN } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const redirectPath = searchParams.get("redirect") || "/";

  const clientId = process.env.GOOGLE_CLIENT_ID;
  
  // Compute redirect URI matching the request host
  let redirectUri: string;
  if (process.env.NEXTAUTH_URL) {
    redirectUri = `${process.env.NEXTAUTH_URL.replace(/\/$/, "")}/api/auth/callback/google`;
  } else {
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost:8088";
    const proto = request.headers.get("x-forwarded-proto") || (host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https");
    redirectUri = `${proto}://${host}/api/auth/callback/google`;
  }

  if (!clientId) {
    // If Google Client ID is not configured yet in environment, redirect to login with informative banner
    return NextResponse.redirect(
      new URL(`/login?error=google_oauth_missing&redirect=${encodeURIComponent(redirectPath)}`, request.url)
    );
  }

  // Construct Google OAuth URL with hd (Hosted Domain) restriction
  const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleAuthUrl.searchParams.set("client_id", clientId);
  googleAuthUrl.searchParams.set("redirect_uri", redirectUri);
  googleAuthUrl.searchParams.set("response_type", "code");
  googleAuthUrl.searchParams.set("scope", "openid email profile");
  googleAuthUrl.searchParams.set("hd", ALLOWED_DOMAIN); // Restricts Google picker to @dpskanpur.com
  googleAuthUrl.searchParams.set("prompt", "select_account");
  googleAuthUrl.searchParams.set("state", redirectPath);

  return NextResponse.redirect(googleAuthUrl.toString());
}
