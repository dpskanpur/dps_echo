import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createRazorpayOrder, getPublicKeyId, isGatewayConfigured } from "@/lib/razorpay";
import { verifyPayToken } from "@/lib/pay-token";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { calculateLateFee } from "@/lib/fee-payments";

export const dynamic = "force-dynamic";

/**
 * Creates a gateway order for one outstanding invoice.
 *
 * The caller must present a pay token issued by the public fee page after a
 * successful scholar-number + date-of-birth check, and the invoice must
 * belong to that same student. Nothing here marks anything as paid.
 */
export async function POST(request: Request) {
  const limited = rateLimit(`create-order:${clientIp(request)}`, 15, 60_000);
  if (!limited.allowed) {
    return NextResponse.json(
      { success: false, error: "Too many attempts. Please wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } }
    );
  }


  try {
    const body = await request.json();
    const invoiceId = String(body?.invoiceId || "");
    const studentId = verifyPayToken(body?.payToken);

    if (!studentId) {
      return NextResponse.json(
        { success: false, error: "Your session expired. Please look up the student again." },
        { status: 401 }
      );
    }

    const invoice = await prisma.feeInvoice.findUnique({
      where: { id: invoiceId },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            scholarNo: true,
            studentEmail: true,
            guardians: {
              select: { name: true, email: true, phone: true, isPrimary: true },
              orderBy: { isPrimary: "desc" },
              take: 1,
            },
          },
        },
      },
    });

    // The token proves which student the visitor verified; an invoice
    // belonging to anyone else is simply not theirs to pay.
    if (!invoice || invoice.studentId !== studentId) {
      return NextResponse.json({ success: false, error: "Invoice not found." }, { status: 404 });
    }

    // Check Campus-Specific Online Payment Switch
    const campus = await prisma.campus.findUnique({ where: { id: invoice.campusId } });
    if (campus && !campus.isOnlinePaymentEnabled) {
      const reason = campus.onlinePaymentDisabledReason
        ? `Online fee payment disabled for ${campus.name}: ${campus.onlinePaymentDisabledReason}`
        : `Online fee payment is currently disabled for ${campus.name}. Please pay at the school accounts office.`;
      return NextResponse.json({ success: false, error: reason }, { status: 503 });
    }

    let payableAmount = invoice.balanceAmount;

    if (campus && new Date() > new Date(invoice.dueDate)) {
      const calculatedLateFee = calculateLateFee(invoice.dueDate, campus);
      if (calculatedLateFee > 0 && invoice.fineAmount !== calculatedLateFee) {
        const netAmount = Math.max(0, invoice.grossAmount - invoice.discountAmount + calculatedLateFee);
        const balanceAmount = Math.max(0, netAmount - invoice.paidAmount);

        await prisma.feeInvoice.update({
          where: { id: invoice.id },
          data: {
            fineAmount: calculatedLateFee,
            netAmount,
            balanceAmount,
            status: balanceAmount > 0 ? (invoice.paidAmount > 0 ? "PARTIALLY_PAID" : "OVERDUE") : "PAID",
          },
        });
        payableAmount = balanceAmount;
      }
    }

    if (payableAmount <= 0) {
      return NextResponse.json(
        { success: false, error: "This invoice is already paid in full." },
        { status: 409 }
      );
    }

    const order = await createRazorpayOrder({
      amountInRupees: payableAmount,
      receipt: invoice.invoiceNo,
      notes: {
        invoiceId: invoice.id,
        invoiceNo: invoice.invoiceNo,
        scholarNo: invoice.student.scholarNo,
        campusId: invoice.campusId,
      },
      campus,
    });

    const guardian = invoice.student.guardians[0];

    await prisma.paymentOrder.create({
      data: {
        gatewayOrderId: order.id,
        invoiceId: invoice.id,
        studentId: invoice.studentId,
        amount: invoice.balanceAmount,
        currency: "INR",
        status: "CREATED",
        payerEmail: guardian?.email || invoice.student.studentEmail || null,
        payerContact: guardian?.phone || null,
      },
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: getPublicKeyId(campus),
      invoiceNo: invoice.invoiceNo,
      studentName: `${invoice.student.firstName} ${invoice.student.lastName}`.trim(),
      prefill: {
        name: guardian?.name || "",
        email: guardian?.email || invoice.student.studentEmail || "",
        contact: guardian?.phone || "",
      },
    });
  } catch (err: any) {
    console.error("[payments/create-order]", err?.message);
    return NextResponse.json(
      { success: false, error: "Could not start the payment. Please try again." },
      { status: 500 }
    );
  }
}
