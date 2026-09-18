import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWebhookSignature, fromPaise } from "@/lib/razorpay";
import { createReceiptForPayment } from "@/lib/fee-payments";
import { queuePaymentReceiptNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";

/**
 * Razorpay webhook — the only place a fee is marked as paid online.
 *
 * Contract:
 *   1. The raw body must carry a valid HMAC signature. Anything else is
 *      discarded without touching a record.
 *   2. Every delivery is recorded by its event id, so a retried or replayed
 *      event cannot create a second receipt.
 *   3. The amount credited comes from the gateway payload, not the browser.
 *
 * Configure in the Razorpay dashboard for: payment.captured, payment.failed.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    console.warn("[payments/webhook] rejected: bad or missing signature");
    return NextResponse.json({ success: false, error: "Invalid signature." }, { status: 400 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ success: false, error: "Malformed payload." }, { status: 400 });
  }

  const eventType: string = event?.event || "unknown";
  const eventId =
    request.headers.get("x-razorpay-event-id") ||
    `${eventType}:${event?.payload?.payment?.entity?.id || Date.now()}`;

  // Idempotency gate: the unique constraint makes a duplicate delivery a no-op.
  try {
    await prisma.webhookEvent.create({
      data: {
        gateway: "RAZORPAY",
        eventId,
        eventType,
        payloadJson: rawBody.slice(0, 20000),
        status: "PROCESSED",
      },
    });
  } catch (err: any) {
    if (err?.code === "P2002") {
      return NextResponse.json({ success: true, duplicate: true });
    }
    throw err;
  }

  try {
    const entity = event?.payload?.payment?.entity;

    if (eventType === "payment.captured" && entity) {
      await handleCapture(entity);
    } else if (eventType === "payment.failed" && entity) {
      await handleFailure(entity);
    } else {
      await prisma.webhookEvent.update({
        where: { eventId },
        data: { status: "IGNORED" },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[payments/webhook]", eventType, err?.message);
    await prisma.webhookEvent.update({
      where: { eventId },
      data: { status: "ERROR", error: String(err?.message).slice(0, 500) },
    });
    // 200 keeps Razorpay from hammering a retry loop over a bug on our side;
    // the row above is the record that this event needs attention.
    return NextResponse.json({ success: false, recorded: true });
  }
}

async function handleCapture(entity: any) {
  const orderId: string | undefined = entity.order_id;
  const paymentId: string = entity.id;
  const amount = fromPaise(Number(entity.amount || 0));

  if (!orderId) throw new Error("Capture event carried no order id.");

  const order = await prisma.paymentOrder.findUnique({
    where: { gatewayOrderId: orderId },
    include: { invoice: { select: { id: true, balanceAmount: true, status: true } } },
  });

  if (!order) throw new Error(`No local order for gateway order ${orderId}.`);
  if (order.status === "PAID") return; // already reconciled

  // Never credit more than the invoice still owes, even if the gateway
  // reports a larger capture — the surplus is reconciled by the accounts desk.
  const creditable = Math.min(amount, order.invoice.balanceAmount);

  if (creditable <= 0) {
    await prisma.paymentOrder.update({
      where: { id: order.id },
      data: {
        status: "PAID",
        gatewayPaymentId: paymentId,
        amountPaid: amount,
        paidAt: new Date(),
        failureReason: "Invoice already settled; no amount credited.",
      },
    });
    return;
  }

  const receipt = await createReceiptForPayment({
    invoiceId: order.invoiceId,
    amountPaid: creditable,
    paymentMode: "ONLINE_UPI",
    transactionRef: paymentId,
    cashierName: "Online Payment Gateway",
    notes: `Razorpay order ${orderId}`,
  });

  await prisma.paymentOrder.update({
    where: { id: order.id },
    data: {
      status: "PAID",
      gatewayPaymentId: paymentId,
      amountPaid: amount,
      paidAt: new Date(),
      feePaymentId: receipt.paymentId,
      payerEmail: entity.email || undefined,
      payerContact: entity.contact || undefined,
    },
  });

  await queuePaymentReceiptNotification(receipt.paymentId);
}

async function handleFailure(entity: any) {
  const orderId: string | undefined = entity.order_id;
  if (!orderId) return;

  await prisma.paymentOrder.updateMany({
    where: { gatewayOrderId: orderId, status: "CREATED" },
    data: {
      status: "FAILED",
      gatewayPaymentId: entity.id || null,
      failureReason: String(entity.error_description || entity.error_reason || "Payment failed").slice(0, 300),
    },
  });
}
