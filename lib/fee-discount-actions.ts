"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requirePermission, getUserPermissions } from "@/lib/auth";
import { assertCampusAllowed } from "@/lib/permissions";
import { logAuditAction } from "@/lib/audit-log";
import { createReceiptForPayment } from "@/lib/fee-payments";

/**
 * Recalculates invoice balances for a student given their current discount configuration.
 */
export async function recalculateStudentInvoices(studentId: string): Promise<void> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      isDiscountEligible: true,
      discountPercent: true,
      discountAmount: true,
    },
  });

  if (!student) return;

  const invoices = await prisma.feeInvoice.findMany({
    where: { studentId },
  });

  for (const inv of invoices) {
    let invoiceDiscount = 0;
    if (student.isDiscountEligible) {
      const pctDisc = inv.grossAmount * (student.discountPercent / 100);
      const totalDisc = pctDisc + student.discountAmount;
      invoiceDiscount = Math.min(inv.grossAmount, Math.max(0, totalDisc));
    }

    const newNet = Math.max(0, inv.grossAmount - invoiceDiscount + inv.fineAmount);
    const newBalance = Math.max(0, newNet - inv.paidAmount);
    const newStatus =
      newBalance <= 0.009 ? "PAID" : inv.paidAmount > 0 ? "PARTIALLY_PAID" : "PENDING";

    await prisma.feeInvoice.update({
      where: { id: inv.id },
      data: {
        discountAmount: invoiceDiscount,
        netAmount: newNet,
        balanceAmount: newBalance,
        status: newStatus,
      },
    });
  }
}

/**
 * Toggle Admin approval for a student's fee discount eligibility.
 * Admin users only.
 */
export async function toggleStudentDiscountEligibility(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated. Please sign in again.");

  const permissions = await getUserPermissions(user);
  if (!permissions.isAdmin) {
    throw new Error("Access denied: Only system administrators can approve or revoke discount eligibility.");
  }

  const studentId = (formData.get("studentId") as string) || "";
  const isEligible = formData.get("isEligible") === "true" || formData.get("isEligible") === "on";

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { campusId: true, firstName: true, lastName: true },
  });

  if (!student) throw new Error("Student not found.");
  assertCampusAllowed(user, student.campusId);

  await prisma.student.update({
    where: { id: studentId },
    data: {
      isDiscountEligible: isEligible,
      discountApprovedBy: isEligible ? user.name || user.email : null,
      ...(!isEligible
        ? {
            discountPercent: 0,
            discountAmount: 0,
            discountReason: null,
          }
        : {}),
    },
  });

  await recalculateStudentInvoices(studentId);

  await logAuditAction({
    userId: user.id,
    userEmail: user.email,
    userName: user.name || undefined,
    userRole: user.role,
    campusCode: student.campusId,
    action: isEligible ? "DISCOUNT_ELIGIBILITY_APPROVED" : "DISCOUNT_ELIGIBILITY_REVOKED",
    entityType: "Student",
    entityId: studentId,
    details: {
      studentName: `${student.firstName} ${student.lastName}`,
      isEligible,
      approvedBy: user.email,
    },
  });

  revalidatePath(`/students/${studentId}`);
  revalidatePath("/fees/invoices");
  revalidatePath("/fees/defaulters");
}

/**
 * Update discount values (percentage or amount) for an approved student.
 * Fee Managers / Sub-Admins.
 */
export async function updateStudentDiscount(formData: FormData): Promise<void> {
  const { user } = await requirePermission("fees", "update");

  const studentId = (formData.get("studentId") as string) || "";
  const discountPercentInput = parseFloat((formData.get("discountPercent") as string) || "0");
  const discountAmountInput = parseFloat((formData.get("discountAmount") as string) || "0");
  const discountReason = ((formData.get("discountReason") as string) || "").trim();

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { campusId: true, isDiscountEligible: true, firstName: true, lastName: true },
  });

  if (!student) throw new Error("Student not found.");
  assertCampusAllowed(user, student.campusId);

  if (!student.isDiscountEligible) {
    throw new Error(
      "This student is not marked eligible for fee discount. Discount eligibility must first be approved by an Admin user."
    );
  }

  const discountPercent = Math.min(100, Math.max(0, isNaN(discountPercentInput) ? 0 : discountPercentInput));
  const discountAmount = Math.max(0, isNaN(discountAmountInput) ? 0 : discountAmountInput);

  await prisma.student.update({
    where: { id: studentId },
    data: {
      discountPercent,
      discountAmount,
      discountReason: discountReason || null,
    },
  });

  await recalculateStudentInvoices(studentId);

  await logAuditAction({
    userId: user.id,
    userEmail: user.email,
    userName: user.name || undefined,
    userRole: user.role,
    campusCode: student.campusId,
    action: "STUDENT_DISCOUNT_UPDATE",
    entityType: "Student",
    entityId: studentId,
    details: {
      studentName: `${student.firstName} ${student.lastName}`,
      discountPercent,
      discountAmount,
      discountReason,
    },
  });

  revalidatePath(`/students/${studentId}`);
  revalidatePath("/fees/invoices");
  revalidatePath("/fees/defaulters");
}

/**
 * Record an offline payment (Cash, UPI, Cheque, Bank Transfer) against an invoice.
 * Fee Managers / Sub-Admins.
 */
export async function recordOfflineFeePayment(formData: FormData): Promise<void> {
  const { user } = await requirePermission("fees", "update");

  const invoiceId = (formData.get("invoiceId") as string) || "";
  const amountPaid = parseFloat((formData.get("amountPaid") as string) || "0");
  const paymentMode = (formData.get("paymentMode") as string) || "CASH";
  const transactionRef = ((formData.get("transactionRef") as string) || "").trim();
  const bankName = ((formData.get("bankName") as string) || "").trim();
  const notes = ((formData.get("notes") as string) || "").trim();

  if (!invoiceId) throw new Error("Invoice ID is required.");
  if (isNaN(amountPaid) || amountPaid <= 0) throw new Error("Payment amount must be greater than zero.");

  const invoice = await prisma.feeInvoice.findUnique({
    where: { id: invoiceId },
    select: { campusId: true, studentId: true, invoiceNo: true, balanceAmount: true },
  });

  if (!invoice) throw new Error("Invoice not found.");
  assertCampusAllowed(user, invoice.campusId);

  const paymentResult = await createReceiptForPayment({
    invoiceId,
    amountPaid,
    paymentMode,
    transactionRef: transactionRef || null,
    bankName: bankName || null,
    cashierName: user.name || user.email,
    notes: notes || `Offline collection via ${paymentMode}`,
  });

  await logAuditAction({
    userId: user.id,
    userEmail: user.email,
    userName: user.name || undefined,
    userRole: user.role,
    campusCode: invoice.campusId,
    action: "FEE_PAYMENT_RECORD_OFFLINE",
    entityType: "FeePayment",
    entityId: paymentResult.paymentId,
    details: {
      invoiceNo: invoice.invoiceNo,
      receiptNo: paymentResult.receiptNo,
      amountPaid,
      paymentMode,
      transactionRef,
      remainingBalance: paymentResult.balanceAmount,
    },
  });

  revalidatePath(`/students/${invoice.studentId}`);
  revalidatePath("/fees/invoices");
  revalidatePath("/fees/defaulters");
}
