"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser, getUserPermissions, requirePermission } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { logAuditAction } from "@/lib/audit-log";

export interface PromotionItemInput {
  studentId: string;
  action: "PROMOTE" | "BRANCH_TRANSFER" | "RETAIN" | "GRADUATED";
  targetCampusId: string;
  targetClassId: string;
  targetSectionId?: string | null;
  targetSession: string; // e.g. "2026-2027"
}

/**
 * Execute batch promotion and inter-campus branch transfers
 */
export async function executeBatchPromotion(items: PromotionItemInput[]) {
  const { user } = await requirePermission("students", "update");

  if (!items || items.length === 0) {
    throw new Error("No students selected for promotion.");
  }

  let successCount = 0;
  let transferCount = 0;

  for (const item of items) {
    const student = await prisma.student.findUnique({
      where: { id: item.studentId },
      include: { campus: true, class: true },
    });

    if (!student) continue;

    const targetCampus = await prisma.campus.findUnique({ where: { id: item.targetCampusId } });
    const targetClass = await prisma.class.findUnique({ where: { id: item.targetClassId } });

    if (!targetCampus || !targetClass) continue;

    const isBranchTransfer = student.campusId !== item.targetCampusId;

    let historyAction = "PROMOTED";
    if (item.action === "RETAIN") historyAction = "RETAINED";
    else if (item.action === "GRADUATED") historyAction = "GRADUATED";
    else if (isBranchTransfer) historyAction = "BRANCH_TRANSFER";

    // 1. Log historical record
    await prisma.studentPromotionHistory.create({
      data: {
        studentId: student.id,
        fromSession: student.academicYearIn || "2025-2026",
        toSession: item.targetSession,
        fromCampusId: student.campusId,
        toCampusId: item.targetCampusId,
        fromClassName: student.class.name,
        toClassName: targetClass.name,
        action: historyAction,
        promotedBy: user.email,
      },
    });

    // 2. Update Student Record
    let newStatus = student.status;
    if (item.action === "GRADUATED") {
      newStatus = "ALUMNI";
    }

    await prisma.student.update({
      where: { id: student.id },
      data: {
        academicYearIn: item.targetSession,
        campusId: item.targetCampusId,
        classId: item.targetClassId,
        sectionId: item.targetSectionId || null,
        status: newStatus,
      },
    });

    // 3. Generate Fee Invoices for the new academic session if active fee structure exists
    if (item.action !== "GRADUATED") {
      const activeAcademicYear = await prisma.academicYear.findFirst({
        where: { name: item.targetSession },
      });

      if (activeAcademicYear) {
        const feeStructure = await prisma.feeStructure.findFirst({
          where: {
            campusId: item.targetCampusId,
            classId: item.targetClassId,
            academicYearId: activeAcademicYear.id,
          },
          include: { feeHead: true },
        });

        if (feeStructure) {
          const existingInvoice = await prisma.feeInvoice.findFirst({
            where: {
              studentId: student.id,
              academicYearId: activeAcademicYear.id,
              periodName: `Quarter 1 (${item.targetSession})`,
            },
          });

          if (!existingInvoice) {
            const invoiceNo = `INV-${targetCampus.code}-${activeAcademicYear.name.split("-")[0]}-Q1-${String(Date.now()).slice(-4)}`;
            const dueDate = new Date(`${activeAcademicYear.name.split("-")[0]}-04-20`);

            await prisma.feeInvoice.create({
              data: {
                invoiceNo,
                studentId: student.id,
                campusId: item.targetCampusId,
                academicYearId: activeAcademicYear.id,
                periodName: `Quarter 1 (${item.targetSession})`,
                dueDate,
                grossAmount: feeStructure.amount,
                netAmount: feeStructure.amount,
                balanceAmount: feeStructure.amount,
                status: "PENDING",
              },
            });
          }
        }
      }
    }

    await logAuditAction({
      userId: user.id,
      userEmail: user.email,
      userName: user.name || undefined,
      userRole: user.role,
      campusCode: targetCampus.code,
      action: isBranchTransfer ? "STUDENT_BRANCH_TRANSFER" : "STUDENT_PROMOTION",
      entityType: "Student",
      entityId: student.id,
      details: {
        fromCampus: student.campus.name,
        toCampus: targetCampus.name,
        fromClass: student.class.name,
        toClass: targetClass.name,
        targetSession: item.targetSession,
      },
    });

    successCount++;
    if (isBranchTransfer) transferCount++;
  }

  revalidatePath("/students/promotion");
  revalidatePath("/students");
  revalidatePath("/fees/invoices");
  revalidatePath("/");

  return {
    success: true,
    message: `Successfully processed ${successCount} student(s)${
      transferCount > 0 ? ` (${transferCount} inter-branch campus transfers)` : ""
    }!`,
  };
}

/**
 * Link two students as siblings under a shared Family ID
 */
export async function linkSiblings(studentId1: string, studentId2: string) {
  const { user } = await requirePermission("students", "update");

  if (studentId1 === studentId2) {
    throw new Error("Cannot link a student to themselves.");
  }

  const [student1, student2] = await Promise.all([
    prisma.student.findUnique({ where: { id: studentId1 }, include: { guardians: true, campus: true } }),
    prisma.student.findUnique({ where: { id: studentId2 }, include: { guardians: true, campus: true } }),
  ]);

  if (!student1 || !student2) {
    throw new Error("One or both student records were not found.");
  }

  // Derive or use existing Family ID
  let targetFamilyId = student1.familyId || student2.familyId;
  if (!targetFamilyId) {
    targetFamilyId = `FAM-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`;
  }

  // Assign familyId to both students
  await Promise.all([
    prisma.student.update({ where: { id: student1.id }, data: { familyId: targetFamilyId } }),
    prisma.student.update({ where: { id: student2.id }, data: { familyId: targetFamilyId } }),
  ]);

  await logAuditAction({
    userId: user.id,
    userEmail: user.email,
    userName: user.name || undefined,
    userRole: user.role,
    campusCode: student1.campus.code,
    action: "STUDENT_SIBLING_LINK",
    entityType: "Student",
    entityId: student1.id,
    details: {
      familyId: targetFamilyId,
      student1: `${student1.firstName} ${student1.lastName} (${student1.campus.code})`,
      student2: `${student2.firstName} ${student2.lastName} (${student2.campus.code})`,
    },
  });

  revalidatePath(`/students/${studentId1}`);
  revalidatePath(`/students/${studentId2}`);
  return { success: true, familyId: targetFamilyId };
}

/**
 * Unlink a student from their family group
 */
export async function unlinkSibling(studentId: string) {
  const { user } = await requirePermission("students", "update");

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { campus: true },
  });

  if (!student) throw new Error("Student not found.");

  await prisma.student.update({
    where: { id: studentId },
    data: { familyId: null },
  });

  await logAuditAction({
    userId: user.id,
    userEmail: user.email,
    userName: user.name || undefined,
    userRole: user.role,
    campusCode: student.campus.code,
    action: "STUDENT_SIBLING_UNLINK",
    entityType: "Student",
    entityId: studentId,
    details: { unlinkedScholarNo: student.scholarNo },
  });

  revalidatePath(`/students/${studentId}`);
  return { success: true };
}

/**
 * Search students to link as siblings across ALL campuses
 */
export async function searchSiblingsToLink(query: string, currentStudentId: string) {
  if (!query || query.trim().length < 2) return [];

  const cleanQuery = query.trim().toLowerCase();

  const students = await prisma.student.findMany({
    where: {
      id: { not: currentStudentId },
      OR: [
        { scholarNo: { contains: cleanQuery, mode: "insensitive" } },
        { registrationNo: { contains: cleanQuery, mode: "insensitive" } },
        { firstName: { contains: cleanQuery, mode: "insensitive" } },
        { lastName: { contains: cleanQuery, mode: "insensitive" } },
      ],
    },
    include: {
      campus: true,
      class: true,
      guardians: { where: { isPrimary: true } },
    },
    take: 8,
  });

  return students.map((s) => ({
    id: s.id,
    name: `${s.firstName} ${s.lastName}`,
    scholarNo: s.scholarNo,
    campusName: s.campus.name,
    campusCode: s.campus.code,
    className: s.class.name,
    parentName: s.guardians[0]?.name || "N/A",
    parentPhone: s.guardians[0]?.phone || "N/A",
    avatarUrl: s.photoUrl,
  }));
}

/**
 * Get all linked siblings for a student across all campuses
 */
export async function getLinkedSiblings(studentId: string) {
  const currentStudent = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      guardians: { where: { isPrimary: true } },
    },
  });

  if (!currentStudent) return [];

  const primaryGuardianPhone = currentStudent.guardians[0]?.phone;

  const OR_CONDITIONS: any[] = [];
  if (currentStudent.familyId) {
    OR_CONDITIONS.push({ familyId: currentStudent.familyId });
  }
  if (primaryGuardianPhone) {
    OR_CONDITIONS.push({
      guardians: {
        some: { phone: primaryGuardianPhone },
      },
    });
  }

  if (OR_CONDITIONS.length === 0) return [];

  const siblings = await prisma.student.findMany({
    where: {
      id: { not: studentId },
      OR: OR_CONDITIONS,
    },
    include: {
      campus: true,
      class: true,
      section: true,
      guardians: { where: { isPrimary: true } },
    },
  });

  return siblings;
}
