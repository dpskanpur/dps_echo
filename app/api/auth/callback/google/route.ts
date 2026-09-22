import { NextResponse } from "next/server";
import { publicUrl, publicBaseUrl } from "@/lib/public-url";
import { cookies } from "next/headers";
import { loginOrCreateUser, isAllowedDomain } from "@/lib/auth";
import { SESSION_COOKIE_NAME, encodeSessionCookie, sessionCookieOptions } from "@/lib/session-cookie";
import { httpRequest } from "@/lib/http";
import { logAuditAction } from "@/lib/audit-log";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const rawState = searchParams.get("state") || "/";

  if (!code) {
    return NextResponse.redirect(publicUrl("/login?error=no_code", request));
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
    return NextResponse.redirect(publicUrl("/login?error=csrf_mismatch", request));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  // Must match the redirect_uri sent in the authorize step byte for byte,
  // or Google rejects the code exchange.
  const redirectUri = `${publicBaseUrl(request)}/api/auth/callback/google`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(publicUrl("/login?error=google_oauth_missing", request));
  }

  try {
    // 1. Exchange authorization code for tokens (with IPv4 fallback)
    const bodyParams = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }).toString();

    const tokenRes = await httpRequest("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: bodyParams,
    });

    const tokens = await tokenRes.json();
    if (!tokenRes.ok || !tokens.access_token) {
      console.error("Token exchange failed:", tokens);
      const detail = tokens.error_description || tokens.error || "token_exchange_failed";
      return NextResponse.redirect(
        publicUrl(`/login?error=token_exchange_failed&detail=${encodeURIComponent(detail)}`, request)
      );
    }

    // 2. Fetch User Profile from Google (with IPv4 fallback)
    const profileRes = await httpRequest("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    const profile = await profileRes.json();

    // A failed or scope-limited userinfo call returns no email; without this
    // guard that surfaced as a generic "auth_failed" with no explanation.
    if (!profileRes.ok || !profile?.email) {
      console.error("Google profile fetch failed:", profileRes.status, profile);
      const detail =
        profile?.error?.message || `userinfo returned HTTP ${profileRes.status} without an email`;
      return NextResponse.redirect(
        publicUrl(`/login?error=profile_fetch_failed&detail=${encodeURIComponent(detail)}`, request)
      );
    }

    const email = profile.email;
    const name = profile.name || email.split("@")[0];
    const avatarUrl = profile.picture;

    // 3. Strict Domain Verification
    if (!isAllowedDomain(email)) {
      return NextResponse.redirect(
        publicUrl(
          `/login?error=domain_not_allowed&attempted=${encodeURIComponent(email)}`,
          request
        )
      );
    }

    // 4. Log in or create User with auto-derived role
    const result = await loginOrCreateUser(email, name, avatarUrl);
    if (!result.success || !result.user) {
      return NextResponse.redirect(publicUrl(`/login?error=${encodeURIComponent(result.error || "")}`, request));
    }

    await logAuditAction({
      userId: result.user.id,
      userEmail: result.user.email,
      userName: result.user.name,
      userRole: result.user.role,
      action: "AUTH_LOGIN",
      entityType: "User",
      entityId: result.user.id,
      details: `Google OAuth login (${result.user.role})`,
    });

    const redirectUrlObj = publicUrl(redirectTarget, request);
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
    const detail = String(err?.message || "unknown error").slice(0, 200);
    return NextResponse.redirect(
      publicUrl(`/login?error=auth_failed&detail=${encodeURIComponent(detail)}`, request)
    );
  }
}
