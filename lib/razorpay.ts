import { createHmac, timingSafeEqual } from "crypto";
import { resilientFetch } from "@/lib/resilient-fetch";

/**
 * Razorpay REST helpers.
 *
 * Deliberately no SDK: order creation is one authenticated POST and
 * signature checking is an HMAC, so there is nothing to gain from an extra
 * dependency in the deployment image.
 *
 * Money is only ever considered received when a webhook signed with
 * RAZORPAY_WEBHOOK_SECRET says so. The browser callback is treated as a
 * hint for redirecting the parent, never as proof of payment.
 */

const RAZORPAY_API = "https://api.razorpay.com/v1";

export interface RazorpayConfig {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
}

export function getRazorpayConfig(): RazorpayConfig | null {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!keyId || !keySecret || !webhookSecret) return null;
  return { keyId, keySecret, webhookSecret };
}

export function isGatewayConfigured(): boolean {
  return getRazorpayConfig() !== null;
}

/** Public key id for the browser checkout. Never exposes the secret. */
export function getPublicKeyId(): string | null {
  return process.env.RAZORPAY_KEY_ID || null;
}

export function toPaise(amountInRupees: number): number {
  return Math.round(amountInRupees * 100);
}

export function fromPaise(paise: number): number {
  return Math.round(paise) / 100;
}

export interface CreatedOrder {
  id: string;
  amount: number; // paise
  currency: string;
  status: string;
}

export async function createRazorpayOrder(params: {
  amountInRupees: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<CreatedOrder> {
  const config = getRazorpayConfig();
  if (!config) {
    throw new Error("Payment gateway is not configured on this server.");
  }

  const auth = Buffer.from(`${config.keyId}:${config.keySecret}`).toString("base64");

  const res = await resilientFetch(`${RAZORPAY_API}/orders`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: toPaise(params.amountInRupees),
      currency: "INR",
      receipt: params.receipt.slice(0, 40),
      payment_capture: 1,
      notes: params.notes || {},
    }),
  });

  const json: any = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(json?.error?.description || `Gateway rejected the order (HTTP ${res.status}).`);
  }

  return { id: json.id, amount: json.amount, currency: json.currency, status: json.status };
}

function safeCompareHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** Verifies the `x-razorpay-signature` header over the exact raw request body. */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const config = getRazorpayConfig();
  if (!config || !signature) return false;

  const expected = createHmac("sha256", config.webhookSecret).update(rawBody).digest("hex");
  return safeCompareHex(expected, signature);
}

/** Verifies the checkout callback signature (UX only — not proof of payment). */
export function verifyCheckoutSignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const config = getRazorpayConfig();
  if (!config) return false;

  const expected = createHmac("sha256", config.keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return safeCompareHex(expected, signature);
}
