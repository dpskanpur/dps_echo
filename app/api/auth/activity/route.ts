import { NextResponse } from "next/server";
import { getCurrentUser, setSessionCookie } from "@/lib/auth";
import { IDLE_TIMEOUT_MS } from "@/lib/permissions";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  await setSessionCookie(user);
  return NextResponse.json({ ok: true, idleTimeoutMs: IDLE_TIMEOUT_MS });
}
