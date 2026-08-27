import { NextResponse } from "next/server";
import { loginOrCreateUser, isAllowedDomain, ALLOWED_DOMAIN } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state") || "/";

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=no_code", request.url));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  let redirectUri: string;
  if (process.env.NEXTAUTH_URL) {
    redirectUri = `${process.env.NEXTAUTH_URL.replace(/\/$/, "")}/api/auth/callback/google`;
  } else {
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost:8088";
    const proto = request.headers.get("x-forwarded-proto") || (host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https");
    redirectUri = `${proto}://${host}/api/auth/callback/google`;
  }

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/login?error=google_oauth_missing", request.url));
  }

  try {
    // 1. Exchange authorization code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenRes.json();
    if (!tokenRes.ok || !tokens.access_token) {
      console.error("Token exchange failed:", tokens);
      return NextResponse.redirect(new URL("/login?error=token_exchange_failed", request.url));
    }

    // 2. Fetch User Profile from Google
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    const profile = await profileRes.json();
    const email = profile.email;
    const name = profile.name || email.split("@")[0];
    const avatarUrl = profile.picture;

    // 3. Strict Domain Verification
    if (!isAllowedDomain(email)) {
      return NextResponse.redirect(
        new URL(
          `/login?error=domain_not_allowed&attempted=${encodeURIComponent(email)}`,
          request.url
        )
      );
    }

    // 4. Log in or create User with auto-derived role
    const result = await loginOrCreateUser(email, name, avatarUrl);
    if (!result.success) {
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(result.error || "")}`, request.url));
    }

    return NextResponse.redirect(new URL(state, request.url));
  } catch (err: any) {
    console.error("OAuth callback error:", err);
    return NextResponse.redirect(new URL("/login?error=auth_failed", request.url));
  }
}
