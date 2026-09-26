import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateReceiptNumber } from "@/lib/utils";

export interface RecordPaymentInput {
  invoiceId: string;
  amountPaid: number;
  paymentMode: string; // "CASH", "CHEQUE", "ONLINE_UPI", "POS_CARD", "NEFT_RTGS"
  transactionRef?: string | null;
  bankName?: string | null;
  cashierName?: string;
  notes?: string | null;
}

export interface RecordPaymentResult {
  receiptNo: string;
  paymentId: string;
  studentId: string;
  campusId: string;
  balanceAmount: number;
  status: string;
}

const MAX_ATTEMPTS = 5;

/**
 * Records a fee payment and reconciles its invoice inside one transaction.
 *
 * Receipt numbers are derived from a per-campus count, which two concurrent
 * cashiers (or a cashier and a payment webhook) can read identically. The
 * unique constraint on `receiptNo` is the real arbiter, so a collision is
 * retried with a freshly read sequence instead of failing the payment.
 */
export async function createReceiptForPayment(
  input: RecordPaymentInput
): Promise<RecordPaymentResult> {
  const amountPaid = Number(input.amountPaid);

  if (!Number.isFinite(amountPaid) || amountPaid <= 0) {
    throw new Error("Payment amount must be greater than zero.");
  }

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const invoice = await tx.feeInvoice.findUnique({
          where: { id: input.invoiceId },
          include: { campus: { select: { id: true, code: true } } },
        });

        if (!invoice) {
          throw new Error("Invoice not found.");
        }

        const balance = invoice.netAmount - invoice.paidAmount;
        if (balance <= 0) {
          throw new Error("This invoice is already settled in full.");
        }

        // Guard against a stale form or a duplicated gateway capture
        // pushing an invoice past its own total.
        if (amountPaid - balance > 0.01) {
          throw new Error(
            `Payment of ${amountPaid} exceeds the outstanding balance of ${balance.toFixed(2)}.`
          );
        }

        const year = new Date().getFullYear();
        const paymentsThisCampusYear = await tx.feePayment.count({
          where: {
            invoice: { campusId: invoice.campusId },
            paymentDate: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) },
          },
        });

        const receiptNo = generateReceiptNumber(
          invoice.campus.code,
          year,
          paymentsThisCampusYear + 1 + attempt
        );

        const payment = await tx.feePayment.create({
          data: {
            receiptNo,
            invoiceId: invoice.id,
            studentId: invoice.studentId,
            paymentDate: new Date(),
            paymentMode: input.paymentMode,
            amountPaid,
            transactionRef: input.transactionRef || null,
            bankName: input.bankName || null,
            cashierName: input.cashierName || "Accounts Desk",
            notes: input.notes || null,
            status: "SUCCESS",
          },
        });

        const newPaidAmount = invoice.paidAmount + amountPaid;
        const newBalance = Math.max(0, invoice.netAmount - newPaidAmount);
        const newStatus =
          newBalance <= 0.009 ? "PAID" : newPaidAmount > 0 ? "PARTIALLY_PAID" : "PENDING";

        await tx.feeInvoice.update({
          where: { id: invoice.id },
          data: {
            paidAmount: newPaidAmount,
            balanceAmount: newBalance,
            status: newStatus,
          },
        });

        return {
          receiptNo,
          paymentId: payment.id,
          studentId: invoice.studentId,
          campusId: invoice.campusId,
          balanceAmount: newBalance,
          status: newStatus,
        };
      });
    } catch (err) {
      const isReceiptCollision =
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002" &&
        String(err.meta?.target || "").includes("receiptNo");

      if (isReceiptCollision && attempt < MAX_ATTEMPTS - 1) {
        continue; // another payment claimed this number; take the next one
      }
      throw err;
    }
  }

  throw new Error("Could not allocate a unique receipt number. Please retry.");
}

/**
 * Calculates late fee for an invoice based on campus late fee rules.
 *
 * Rules:
 * - If today <= dueDate + graceDays: Late Fee = 0
 * - If daysOverdue > graceDays AND daysOverdue <= tierDays (X days): Late Fee = initialAmount (Y)
 * - If daysOverdue > tierDays (X days): Late Fee = higherAmount (Z)
 */
export function calculateLateFee(
  dueDate: Date | string,
  campus: {
    lateFeeGraceDays?: number | null;
    lateFeeTierDays?: number | null;
    lateFeeInitialAmount?: number | null;
    lateFeeHigherAmount?: number | null;
  }
): number {
  const today = new Date();
  const due = new Date(dueDate);
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  const diffTime = today.getTime() - due.getTime();
  const daysOverdue = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  const graceDays = campus.lateFeeGraceDays ?? 5;
  const tierDays = campus.lateFeeTierDays ?? 15;
  const initialAmount = campus.lateFeeInitialAmount ?? 500;
  const higherAmount = campus.lateFeeHigherAmount ?? 1000;

  if (daysOverdue <= graceDays) {
    return 0;
  }

  if (daysOverdue <= tierDays) {
    return initialAmount;
  }

  return higherAmount;
}
