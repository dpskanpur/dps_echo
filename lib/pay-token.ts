import { createHmac, timingSafeEqual } from "crypto";

/**
 * Short-lived proof that a visitor completed the scholar-number + date-of-birth
 * check on the public fee page.
 *
 * Without this, the order-creation endpoint would accept any invoice id from
 * anyone. The token binds a session to one student for a few minutes so the
 * identity check cannot be skipped by posting straight to the API.
 */

const TOKEN_TTL_MS = 15 * 60 * 1000;

function secret(): string {
  const configured = process.env.SESSION_SECRET || process.env.NEXTAUTH_SECRET;
  if (!configured && process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET is required to issue payment lookup tokens.");
  }
  return configured || "dps_echo_local_development_only_secret";
}

export function issuePayToken(studentId: string, now = Date.now()): string {
  const payload = `${studentId}.${now}`;
  const sig = createHmac("sha256", secret()).update(payload).digest("hex");
  return `${Buffer.from(payload).toString("base64url")}.${sig}`;
}

export function verifyPayToken(token: string | null | undefined): string | null {
  if (!token) return null;

  const lastDot = token.lastIndexOf(".");
  if (lastDot === -1) return null;

  const encoded = token.slice(0, lastDot);
  const signature = token.slice(lastDot + 1);

  let payload: string;
  try {
    payload = Buffer.from(encoded, "base64url").toString("utf8");
  } catch {
    return null;
  }

  const expected = createHmac("sha256", secret()).update(payload).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  const [studentId, issuedAtRaw] = payload.split(".");
  const issuedAt = Number(issuedAtRaw);
  if (!studentId || !Number.isFinite(issuedAt)) return null;
  if (Date.now() - issuedAt > TOKEN_TTL_MS) return null;

  return studentId;
}
