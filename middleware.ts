import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  SESSION_COOKIE_NAME,
  decodeSessionCookie,
  isSessionIdleExpired,
} from "@/lib/session-cookie";

const PUBLIC_PATHS = [
  "/login",
  "/pay",
  "/verify-tc",
  "/api/auth",
  "/favicon.ico",
];

function expireSession(request: NextRequest, reason = "idle_timeout") {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("error", reason);
  const response = NextResponse.redirect(loginUrl);
  response.cookies.set(SESSION_COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return response;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic =
    PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(path + "/")) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.includes(".");

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
  const payload = decodeSessionCookie(sessionCookie?.value);
  const idleExpired = !!sessionCookie?.value && isSessionIdleExpired(payload);
  const isAuthenticated = !!payload && !idleExpired;

  if (sessionCookie?.value && idleExpired && pathname !== "/login") {
    return expireSession(request);
  }

  if (isAuthenticated && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (!isAuthenticated && !isPublic) {
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("redirect", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
