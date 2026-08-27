import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";

export async function GET(request: Request) {
  await clearSessionCookie();
  const { searchParams } = new URL(request.url);
  const reason = searchParams.get("reason");
  const loginUrl = new URL("/login", request.url);
  if (reason === "idle_timeout" || reason === "session_expired_unauthorized") {
    loginUrl.searchParams.set("error", reason);
  }
  return NextResponse.redirect(loginUrl);
}

export async function POST(request: Request) {
  await clearSessionCookie();
  return NextResponse.json({ success: true });
}
