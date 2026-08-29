import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { loginOrCreateUser, isAllowedDomain } from "@/lib/auth";
import { SESSION_COOKIE_NAME, encodeSessionCookie, sessionCookieOptions } from "@/lib/session-cookie";

async function fetchWithRetry(url: string, options: RequestInit, retries = 3): Promise<Response> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fetch(url, options);
    } catch (err: any) {
      if (attempt === retries) throw err;
      console.warn(`Fetch to ${url} failed (attempt ${attempt}/${retries}): ${err.message}. Retrying in ${attempt * 250}ms...`);
      await new Promise((res) => setTimeout(res, attempt * 250));
    }
  }
  throw new Error(`Fetch to ${url} failed after ${retries} attempts`);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const rawState = searchParams.get("state") || "/";

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=no_code", request.url));
  }

  // Parse state parameter (format: "csrfToken:redirectPath")
  let csrfTokenFromState = "";
  let redirectTarget = "/";
  if (rawState.includes(":")) {
    const colonIdx = rawState.indexOf(":");
    csrfTokenFromState = rawState.substring(0, colonIdx);
    redirectTarget = rawState.substring(colonIdx + 1) || "/";
  } else {
    redirectTarget = rawState;
  }

  // Verify CSRF state token against HTTP-only cookie
  const cookieStore = await cookies();
  const storedCsrfToken = cookieStore.get("dps_echo_oauth_csrf")?.value;

  if (csrfTokenFromState && storedCsrfToken && csrfTokenFromState !== storedCsrfToken) {
    console.error("OAuth CSRF Mismatch attack detected!");
    return NextResponse.redirect(new URL("/login?error=csrf_mismatch", request.url));
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
    // 1. Exchange authorization code for tokens (with DNS/network retry)
    const tokenRes = await fetchWithRetry("https://oauth2.googleapis.com/token", {
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
      const detail = tokens.error_description || tokens.error || "token_exchange_failed";
      return NextResponse.redirect(
        new URL(`/login?error=token_exchange_failed&detail=${encodeURIComponent(detail)}`, request.url)
      );
    }

    // 2. Fetch User Profile from Google (with retry)
    const profileRes = await fetchWithRetry("https://www.googleapis.com/oauth2/v2/userinfo", {
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
    if (!result.success || !result.user) {
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(result.error || "")}`, request.url));
    }

    const redirectUrlObj = new URL(redirectTarget, request.url);
    redirectUrlObj.searchParams.set("login_success", "true");

    const response = NextResponse.redirect(redirectUrlObj);
    response.cookies.set(SESSION_COOKIE_NAME, await encodeSessionCookie(result.user), {
      ...sessionCookieOptions,
      secure: process.env.NODE_ENV === "production",
    });
    response.cookies.delete("dps_echo_oauth_csrf");
    return response;
  } catch (err: any) {
    console.error("OAuth callback error:", err);
    return NextResponse.redirect(new URL("/login?error=auth_failed", request.url));
  }
}
