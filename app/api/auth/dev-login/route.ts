import { NextResponse } from "next/server";
import { loginOrCreateUser, isAllowedDomain, ALLOWED_DOMAIN } from "@/lib/auth";
import { SESSION_COOKIE_NAME, encodeSessionCookie, sessionCookieOptions } from "@/lib/session-cookie";

export async function POST(request: Request) {
  const host = request.headers.get("host") || "";
  const isLocalHost = host.includes("localhost") || host.includes("127.0.0.1");

  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEV_LOGIN !== "true" && !isLocalHost) {
    return NextResponse.json(
      { success: false, error: "Dev login bypass is disabled in production environment." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { email, name, role, campusId, redirectUrl = "/" } = body;

    if (!email || !isAllowedDomain(email)) {
      return NextResponse.json(
        {
          success: false,
          error: `Access Denied: Only @${ALLOWED_DOMAIN} email addresses are allowed.`,
        },
        { status: 403 }
      );
    }

    const result = await loginOrCreateUser(
      email,
      name || email.split("@")[0],
      undefined,
      role || "ADMIN",
      campusId
    );

    if (!result.success || !result.user) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    const response = NextResponse.json({ success: true, redirectUrl });
    response.cookies.set(SESSION_COOKIE_NAME, await encodeSessionCookie(result.user), {
      ...sessionCookieOptions,
      secure: process.env.NODE_ENV === "production",
    });
    return response;
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
