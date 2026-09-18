import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dns from "dns";
import { loginOrCreateUser, isAllowedDomain } from "@/lib/auth";
import { SESSION_COOKIE_NAME, encodeSessionCookie, sessionCookieOptions } from "@/lib/session-cookie";

// Prefer A records over AAAA. On machines behind a VPN resolver (Tailscale
// MagicDNS, for example) the IPv6 resolution path can fail outright and
// surface as ENOTFOUND even though IPv4 resolves fine.
try {
  dns.setDefaultResultOrder("ipv4first");
} catch {
  // Not available on every runtime; the default order still works elsewhere.
}

/**
 * Calls a Google endpoint, retrying briefly on transient network errors.
 *
 * An earlier version fell back to resolving the hostname itself and dialling
 * the raw IP. On a machine using a VPN resolver (Tailscale's 100.100.100.100,
 * for example) that side path fails with a misleading "queryA ECONNREFUSED"
 * and masks the real error. Node's own resolver already handles this
 * correctly, so a short retry is both simpler and more reliable.
 */
async function googleFetch(
  urlStr: string,
  options: { method?: string; headers?: Record<string, string>; body?: string } = {},
  attempts = 3
): Promise<Response> {
  let lastError: any;

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fetch(urlStr, {
        method: options.method || "GET",
        headers: options.headers,
        body: options.body,
        signal: AbortSignal.timeout(10_000),
      });
    } catch (err: any) {
      lastError = err;
      const reason = err?.cause?.message || err?.message || "unknown error";
      console.warn(`[oauth] ${urlStr} attempt ${attempt + 1}/${attempts} failed: ${reason}`);
      if (attempt < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
      }
    }
  }

  const reason = lastError?.cause?.message || lastError?.message || "unknown error";
  const hostname = new URL(urlStr).hostname;
  const isDnsFailure = /ENOTFOUND|EAI_AGAIN|getaddrinfo/i.test(reason);

  throw new Error(
    isDnsFailure
      ? `DNS lookup for ${hostname} failed (${reason}). The server process cannot resolve hostnames — ` +
        `restart the dev server, and if a VPN resolver is active check that it is reachable.`
      : `Could not reach ${hostname}: ${reason}`
  );
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
    // 1. Exchange authorization code for tokens (with IPv4 fallback)
    const bodyParams = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }).toString();

    const tokenRes = await googleFetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: bodyParams,
    });

    const tokens = await tokenRes.json();
    if (!tokenRes.ok || !tokens.access_token) {
      console.error("Token exchange failed:", tokens);
      const detail = tokens.error_description || tokens.error || "token_exchange_failed";
      return NextResponse.redirect(
        new URL(`/login?error=token_exchange_failed&detail=${encodeURIComponent(detail)}`, request.url)
      );
    }

    // 2. Fetch User Profile from Google (with IPv4 fallback)
    const profileRes = await googleFetch("https://www.googleapis.com/oauth2/v2/userinfo", {
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
        new URL(`/login?error=profile_fetch_failed&detail=${encodeURIComponent(detail)}`, request.url)
      );
    }

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
    const detail = String(err?.message || "unknown error").slice(0, 200);
    return NextResponse.redirect(
      new URL(`/login?error=auth_failed&detail=${encodeURIComponent(detail)}`, request.url)
    );
  }
}
