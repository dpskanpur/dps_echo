import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/permissions";
import { decodeSessionCookie, isSessionIdleExpired } from "@/lib/session-cookie";

/**
 * Routes reachable without a staff session.
 *
 * Everything not listed here requires a valid, non-idle session cookie.
 * Server actions post back to their own page path, so they are covered by
 * the same check (the actions themselves re-verify permissions server-side).
 */
const PUBLIC_EXACT = new Set(["/login", "/pay", "/verify-tc", "/public-registration"]);

const PUBLIC_PREFIXES = [
  "/public-registration/",
  "/api/auth/",      // Google OAuth handshake, logout, activity ping
  "/api/payments/",  // Gateway order creation + signed webhook callbacks
  "/api/cron/",      // Scheduled jobs, guarded by their own shared secret
  "/api/debug/",     // Development-only diagnostics; refuses to run in production
  "/_next/",
];

const PUBLIC_FILES = ["/favicon.ico", "/icon.png", "/robots.txt", "/sitemap.xml", "/manifest.json"];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true;
  if (PUBLIC_FILES.includes(pathname)) return true;
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return true;
  // Static assets served out of /public (logos, crests, fonts)
  if (/\.(png|jpg|jpeg|svg|gif|webp|ico|css|js|woff2?|ttf|map)$/i.test(pathname)) return true;
  return false;
}

function denyApi(reason: string) {
  return NextResponse.json({ success: false, error: reason }, { status: 401 });
}

function redirectToLogin(request: NextRequest, error?: string) {
  const url = new URL("/login", request.url);
  const target = request.nextUrl.pathname + request.nextUrl.search;
  if (target && target !== "/") url.searchParams.set("redirect", target);
  if (error) url.searchParams.set("error", error);

  const response = NextResponse.redirect(url);
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const isApi = pathname.startsWith("/api/");

  // The /api/v1 surface also accepts a service token for MCP and
  // server-to-server callers. The route handler verifies the token itself;
  // here we only let a token-bearing request through to be checked.
  if (pathname.startsWith("/api/v1/") && request.headers.get("authorization")) {
    return NextResponse.next();
  }

  const rawCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!rawCookie) {
    return isApi ? denyApi("Authentication required.") : redirectToLogin(request);
  }

  // Verifies the HMAC signature; a tampered or forged cookie decodes to null.
  const payload = await decodeSessionCookie(rawCookie);

  if (!payload) {
    return isApi ? denyApi("Invalid session.") : redirectToLogin(request, "auth_failed");
  }

  if (isSessionIdleExpired(payload)) {
    return isApi ? denyApi("Session expired.") : redirectToLogin(request, "idle_timeout");
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
