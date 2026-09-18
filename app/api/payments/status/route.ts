import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPayToken } from "@/lib/pay-token";

export const dynamic = "force-dynamic";

/**
 * Lets the fee page wait for the webhook to reconcile a payment.
 *
 * Reports only what the server has actually recorded, so a parent is never
 * shown a receipt that does not exist in the ledger.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("orderId") || "";
  const studentId = verifyPayToken(searchParams.get("payToken"));

  if (!studentId) {
    return NextResponse.json({ success: false, error: "Session expired." }, { status: 401 });
  }

  const order = await prisma.paymentOrder.findUnique({
    where: { gatewayOrderId: orderId },
    include: { feePayment: { select: { receiptNo: true, amountPaid: true } } },
  });

  if (!order || order.studentId !== studentId) {
    return NextResponse.json({ success: false, error: "Order not found." }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    status: order.status,
    receiptNo: order.feePayment?.receiptNo || null,
    amountPaid: order.feePayment?.amountPaid ?? null,
    failureReason: order.failureReason,
  });
}
