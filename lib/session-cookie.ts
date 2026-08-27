import crypto from "crypto";
import {
  SESSION_COOKIE_NAME,
  IDLE_TIMEOUT_MS,
  SessionUser,
} from "@/lib/permissions";

export type SessionPayload = SessionUser & { lastActivityAt: number };

const SECRET_KEY =
  process.env.SESSION_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  "dps_echo_production_hmac_secret_key_2026_safe";

function signPayload(base64Payload: string): string {
  return crypto.createHmac("sha256", SECRET_KEY).update(base64Payload).digest("hex");
}

export function encodeSessionCookie(user: SessionUser, lastActivityAt = Date.now()): string {
  const payload: SessionPayload = { ...user, lastActivityAt };
  const base64Payload = Buffer.from(JSON.stringify(payload), "utf-8").toString("base64url");
  const signature = signPayload(base64Payload);
  return `${base64Payload}.${signature}`;
}

export function decodeSessionCookie(value: string | undefined | null): SessionPayload | null {
  if (!value || typeof value !== "string") return null;
  try {
    const parts = value.split(".");
    if (parts.length !== 2) return null;
    const [base64Payload, signature] = parts;

    // Verify HMAC signature with timingSafeEqual
    const expectedSig = signPayload(base64Payload);
    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSig);
    if (
      sigBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
    ) {
      return null;
    }

    const raw = Buffer.from(base64Payload, "base64url").toString("utf-8");
    const parsed = JSON.parse(raw) as Partial<SessionPayload>;
    if (!parsed?.id || !parsed?.email) return null;

    return {
      id: parsed.id,
      email: parsed.email,
      name: parsed.name || "",
      avatarUrl: parsed.avatarUrl,
      role: parsed.role || "STAFF",
      status: parsed.status || "ACTIVE",
      campusId: parsed.campusId,
      lastActivityAt: typeof parsed.lastActivityAt === "number" ? parsed.lastActivityAt : 0,
    };
  } catch {
    return null;
  }
}

export function isSessionIdleExpired(payload: SessionPayload | null, now = Date.now()): boolean {
  if (!payload) return true;
  if (!payload.lastActivityAt) return true;
  return now - payload.lastActivityAt > IDLE_TIMEOUT_MS;
}

export function toSessionUser(payload: SessionPayload): SessionUser {
  return {
    id: payload.id,
    email: payload.email,
    name: payload.name,
    avatarUrl: payload.avatarUrl,
    role: payload.role,
    status: payload.status,
    campusId: payload.campusId,
  };
}

// Session cookie options: omitting `maxAge` creates an in-memory browser session cookie.
// Browsers clear session cookies automatically when tabs/windows are closed.
export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
};

export { SESSION_COOKIE_NAME };
