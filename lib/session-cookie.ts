import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  IDLE_TIMEOUT_MS,
  SessionUser,
} from "@/lib/permissions";

export type SessionPayload = SessionUser & { lastActivityAt: number };

export function encodeSessionCookie(user: SessionUser, lastActivityAt = Date.now()): string {
  const payload: SessionPayload = { ...user, lastActivityAt };
  return Buffer.from(JSON.stringify(payload), "utf-8").toString("base64");
}

export function decodeSessionCookie(value: string | undefined | null): SessionPayload | null {
  if (!value) return null;
  try {
    const raw = Buffer.from(value, "base64").toString("utf-8");
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

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_MAX_AGE_SECONDS,
};

export { SESSION_COOKIE_NAME };
