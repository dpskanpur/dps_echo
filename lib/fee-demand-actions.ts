"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { assertCampusAllowed } from "@/lib/permissions";
import { getActiveSession } from "@/lib/academic-session";
import { logAuditAction } from "@/lib/audit-log";

export interface DemandRowInput {
  scholarNo: string;
  periodName: string;
  grossAmount: number;
  discountAmount?: number;
  discountReason?: string;
  dueDate?: string;
}

export interface DemandImportResult {
  success: boolean;
  applied: number;
  errors: string[];
}

/**
 * Resolves or fetches academic year ID.
 */
async function resolveAcademicYearId(explicitSessionName?: string): Promise<string> {
  if (explicitSessionName?.trim()) {
    const session = await prisma.academicYear.findFirst({
      where: { name: explicitSessionName.trim() },
      select: { id: true },
    });
    if (session) return session.id;
  }

  const active = await getActiveSession();
  if (!active) {
    throw new Error("No active academic session found.");
  }
  return active.id;
}

/**
 * Single demand upsert via Form Data
 */
export async function upsertSingleDemandAction(formData: FormData): Promise<void> {
  const { user } = await requirePermission("fees", "update");

  const scholarNo = (formData.get("scholarNo") as string || "").trim();
  const periodName = (formData.get("periodName") as string || "Quarter 1 (Apr - Jun)").trim();
  const grossAmount = parseFloat(formData.get("grossAmount") as string || "0");
  const discountAmount = parseFloat(formData.get("discountAmount") as string || "0");
  const discountReason = (formData.get("discountReason") as string || "").trim();
  const dueDateStr = (formData.get("dueDate") as string || "").trim();

  if (!scholarNo) throw new Error("Scholar Number is required.");
  if (grossAmount <= 0) throw new Error("Gross Amount must be greater than zero.");

  const student = await prisma.student.findUnique({
    where: { scholarNo },
    include: { campus: true },
  });

  if (!student) {
    throw new Error(`Student with Scholar No. "${scholarNo}" was not found.`);
  }

  assertCampusAllowed(user, student.campusId);
  const academicYearId = await resolveAcademicYearId();

  const netAmount = Math.max(0, grossAmount - discountAmount);
  const dueDate = dueDateStr ? new Date(dueDateStr) : new Date();

  // Find existing invoice or generate a new invoice number
  const existingInvoice = await prisma.feeInvoice.findFirst({
    where: {
      studentId: student.id,
      academicYearId,
      periodName,
    },
  });

  if (existingInvoice) {
    const newPaid = existingInvoice.paidAmount;
    const newBalance = Math.max(0, netAmount - newPaid);
    const newStatus = newBalance <= 0 ? "PAID" : newPaid > 0 ? "PARTIALLY_PAID" : "PENDING";

    await prisma.feeInvoice.update({
      where: { id: existingInvoice.id },
      data: {
        grossAmount,
        discountAmount,
        netAmount,
        balanceAmount: newBalance,
        status: newStatus,
        dueDate,
      },
    });
  } else {
    const campusCode = student.campus.code;
    const count = await prisma.feeInvoice.count({ where: { campusId: student.campusId } });
    const invoiceNo = `INV-${campusCode}-${new Date().getFullYear()}-${count + 1001}`;

    await prisma.feeInvoice.create({
      data: {
        invoiceNo,
        studentId: student.id,
        campusId: student.campusId,
        academicYearId,
        periodName,
        dueDate,
        grossAmount,
        discountAmount,
        netAmount,
        paidAmount: 0,
        balanceAmount: netAmount,
        status: "PENDING",
      },
    });
  }

  // Update discount notes on student if provided
  if (discountReason || discountAmount > 0) {
    await prisma.student.update({
      where: { id: student.id },
      data: {
        isDiscountEligible: true,
        discountAmount,
        discountReason: discountReason || "Quarterly Demand Concession",
      },
    });
  }

  await logAuditAction({
    userId: user.id,
    userEmail: user.email,
    userName: user.name || undefined,
    userRole: user.role,
    campusCode: student.campus.code,
    action: "FEE_DEMAND_UPSERT",
    entityType: "FeeInvoice",
    details: { scholarNo, periodName, grossAmount, discountAmount, netAmount },
  });

  revalidatePath("/fees/demands");
}

/**
 * Bulk Import Quarterly Demands from JSON array / CSV rows
 */
export async function importQuarterlyDemandsAction(
  rows: DemandRowInput[],
  academicSessionName?: string
): Promise<DemandImportResult> {
  const { user } = await requirePermission("fees", "update");

  if (!rows || rows.length === 0) {
    return { success: false, applied: 0, errors: ["No rows provided in import."] };
  }

  const academicYearId = await resolveAcademicYearId(academicSessionName);

  // Fetch all students for matching
  const scholarNos = rows.map((r) => r.scholarNo?.trim()).filter(Boolean);
  const students = await prisma.student.findMany({
    where: { scholarNo: { in: scholarNos } },
    include: { campus: true },
  });

  const studentByScholarNo = new Map(students.map((s) => [s.scholarNo, s]));

  const errors: string[] = [];
  let appliedCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const lineNum = i + 1;

    if (!row.scholarNo?.trim()) {
      errors.push(`Row ${lineNum}: Missing Scholar Number.`);
      continue;
    }

    const student = studentByScholarNo.get(row.scholarNo.trim());
    if (!student) {
      errors.push(`Row ${lineNum}: Student with Scholar No "${row.scholarNo}" not found.`);
      continue;
    }

    try {
      assertCampusAllowed(user, student.campusId);

      const periodName = (row.periodName || "Quarter 1 (Apr - Jun)").trim();
      const grossAmount = Number(row.grossAmount) || 0;
      const discountAmount = Number(row.discountAmount) || 0;
      const discountReason = row.discountReason?.trim() || "";
      const netAmount = Math.max(0, grossAmount - discountAmount);
      const dueDate = row.dueDate ? new Date(row.dueDate) : new Date();

      if (grossAmount <= 0) {
        errors.push(`Row ${lineNum} (${row.scholarNo}): Gross Amount must be > 0.`);
        continue;
      }

      const existingInvoice = await prisma.feeInvoice.findFirst({
        where: {
          studentId: student.id,
          academicYearId,
          periodName,
        },
      });

      if (existingInvoice) {
        const newPaid = existingInvoice.paidAmount;
        const newBalance = Math.max(0, netAmount - newPaid);
        const newStatus = newBalance <= 0 ? "PAID" : newPaid > 0 ? "PARTIALLY_PAID" : "PENDING";

        await prisma.feeInvoice.update({
          where: { id: existingInvoice.id },
          data: {
            grossAmount,
            discountAmount,
            netAmount,
            balanceAmount: newBalance,
            status: newStatus,
            dueDate,
          },
        });
      } else {
        const campusCode = student.campus.code;
        const count = await prisma.feeInvoice.count({ where: { campusId: student.campusId } });
        const invoiceNo = `INV-${campusCode}-${new Date().getFullYear()}-${count + 1001 + i}`;

        await prisma.feeInvoice.create({
          data: {
            invoiceNo,
            studentId: student.id,
            campusId: student.campusId,
            academicYearId,
            periodName,
            dueDate,
            grossAmount,
            discountAmount,
            netAmount,
            paidAmount: 0,
            balanceAmount: netAmount,
            status: "PENDING",
          },
        });
      }

      if (discountReason || discountAmount > 0) {
        await prisma.student.update({
          where: { id: student.id },
          data: {
            isDiscountEligible: true,
            discountAmount,
            discountReason: discountReason || "Imported Concession",
          },
        });
      }

      appliedCount++;
    } catch (err: any) {
      errors.push(`Row ${lineNum} (${row.scholarNo}): ${err.message || "Failed to process."}`);
    }
  }

  await logAuditAction({
    userId: user.id,
    userEmail: user.email,
    userName: user.name || undefined,
    userRole: user.role,
    campusCode: user.campusId || "ALL",
    action: "FEE_DEMANDS_BULK_IMPORT",
    entityType: "FeeInvoice",
    details: { appliedCount, totalRows: rows.length, errorCount: errors.length },
  });

  revalidatePath("/fees/demands");

  return {
    success: appliedCount > 0,
    applied: appliedCount,
    errors,
  };
}
