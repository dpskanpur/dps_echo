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
  const payload = sessionCookie?.value ? decodeSessionCookie(sessionCookie.value) : null;
  const isIdleExpired = payload ? isSessionIdleExpired(payload) : false;
  const isAuthenticated = !!payload && !isIdleExpired;

  // Only trigger idle_timeout redirect if user was logged in and payload exceeded 30 mins idle
  if (payload && isIdleExpired && pathname !== "/login") {
    return expireSession(request, "idle_timeout");
  }

  // If cookie is invalid/unparseable (e.g. old session format or untampered), clear it silently
  if (sessionCookie?.value && !payload && !isPublic) {
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("redirect", pathname);
    }
    const response = NextResponse.redirect(loginUrl);
    response.cookies.set(SESSION_COOKIE_NAME, "", { path: "/", maxAge: 0 });
    return response;
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
