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

async function signPayload(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(SECRET_KEY);
  const msgData = encoder.encode(data);

  let cryptoSubtle: SubtleCrypto;
  if (typeof globalThis !== "undefined" && globalThis.crypto?.subtle) {
    cryptoSubtle = globalThis.crypto.subtle;
  } else {
    const nodeCrypto = await import("crypto");
    cryptoSubtle = nodeCrypto.webcrypto.subtle as SubtleCrypto;
  }

  const key = await cryptoSubtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await cryptoSubtle.sign("HMAC", key, msgData);
  return Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function base64UrlEncode(str: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]);
  }
  const b64 = typeof btoa === "function" ? btoa(bin) : Buffer.from(str, "utf-8").toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  if (typeof atob === "function") {
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      bytes[i] = bin.charCodeAt(i);
    }
    const decoder = new TextDecoder();
    return decoder.decode(bytes);
  }
  return Buffer.from(base64, "base64").toString("utf-8");
}

export async function encodeSessionCookie(
  user: SessionUser,
  lastActivityAt = Date.now()
): Promise<string> {
  const payload: SessionPayload = { ...user, lastActivityAt };
  const json = JSON.stringify(payload);
  const base64Url = base64UrlEncode(json);
  const signature = await signPayload(base64Url);
  return `${base64Url}.${signature}`;
}

export async function decodeSessionCookie(
  value: string | undefined | null
): Promise<SessionPayload | null> {
  if (!value || typeof value !== "string") return null;
  try {
    const lastDot = value.lastIndexOf(".");
    if (lastDot === -1) return null;

    const base64UrlPayload = value.substring(0, lastDot);
    const signature = value.substring(lastDot + 1);

    if (!base64UrlPayload || !signature) return null;

    // Verify HMAC signature using Web Crypto API
    const expectedSig = await signPayload(base64UrlPayload);
    if (signature !== expectedSig) {
      console.warn("decodeSessionCookie: HMAC signature mismatch");
      return null;
    }

    const raw = base64UrlDecode(base64UrlPayload);
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
