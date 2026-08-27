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

function signPayload(data: string): string {
  return crypto.createHmac("sha256", SECRET_KEY).update(data).digest("hex");
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return Buffer.from(base64, "base64").toString("utf-8");
}

export function encodeSessionCookie(user: SessionUser, lastActivityAt = Date.now()): string {
  const payload: SessionPayload = { ...user, lastActivityAt };
  const json = JSON.stringify(payload);
  const base64Url = base64UrlEncode(json);
  const signature = signPayload(base64Url);
  return `${base64Url}.${signature}`;
}

export function decodeSessionCookie(value: string | undefined | null): SessionPayload | null {
  if (!value || typeof value !== "string") return null;
  try {
    const lastDot = value.lastIndexOf(".");
    if (lastDot === -1) {
      console.warn("decodeSessionCookie: missing dot signature separator");
      return null;
    }
    const base64UrlPayload = value.substring(0, lastDot);
    const signature = value.substring(lastDot + 1);

    if (!base64UrlPayload || !signature) {
      console.warn("decodeSessionCookie: empty payload or signature");
      return null;
    }

    // Verify HMAC signature
    const expectedSig = signPayload(base64UrlPayload);
    if (signature.length !== expectedSig.length) {
      console.warn("decodeSessionCookie: signature length mismatch");
      return null;
    }

    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSig);
    if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      console.warn("decodeSessionCookie: HMAC signature mismatch");
      return null;
    }

    const raw = base64UrlDecode(base64UrlPayload);
    const parsed = JSON.parse(raw) as Partial<SessionPayload>;
    if (!parsed?.id || !parsed?.email) {
      console.warn("decodeSessionCookie: payload missing id or email");
      return null;
    }

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
  } catch (err: any) {
    console.error("decodeSessionCookie exception:", err.message);
    return null;
  }
}

export function isSessionIdleExpired(payload: SessionPayload | null, now = Date.now()): boolean {
  if (!payload || !payload.lastActivityAt) return true;
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

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
};

export { SESSION_COOKIE_NAME };
