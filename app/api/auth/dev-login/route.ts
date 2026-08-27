import { NextResponse } from "next/server";
import { loginOrCreateUser, isAllowedDomain, ALLOWED_DOMAIN } from "@/lib/auth";

export async function POST(request: Request) {
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

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, redirectUrl });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
