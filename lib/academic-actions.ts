"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";

/**
 * Class and Section management actions for DPS Campuses.
 * Supports dynamic section allocation and capacity management per academic session.
 */

export interface CreateClassInput {
  campusId: string;
  name: string;
  numericGrade: number;
  sequence?: number;
  initialSections?: string[];
  academicYearId?: string;
}

export async function createClassAction(input: CreateClassInput) {
  await requirePermission("rbac", "update");

  const trimmedName = input.name.trim();
  if (!trimmedName) {
    throw new Error("Class name is required.");
  }

  // Ensure campus exists
  const campus = await prisma.campus.findUnique({ where: { id: input.campusId } });
  if (!campus) {
    throw new Error("Campus not found.");
  }

  // Check if class with identical name already exists in this campus
  const existing = await prisma.class.findUnique({
    where: {
      campusId_name: {
        campusId: input.campusId,
        name: trimmedName,
      },
    },
  });

  if (existing) {
    throw new Error(`A class named "${trimmedName}" already exists for ${campus.name}.`);
  }

  // Determine sequence order
  let seq = input.sequence;
  if (seq === undefined || isNaN(seq)) {
    const highestClass = await prisma.class.findFirst({
      where: { campusId: input.campusId },
      orderBy: { sequence: "desc" },
    });
    seq = (highestClass?.sequence || 0) + 1;
  }

  const newClass = await prisma.class.create({
    data: {
      campusId: input.campusId,
      name: trimmedName,
      numericGrade: Number(input.numericGrade) || 0,
      sequence: seq,
    },
  });

  // Create initial sections
  const sectionLetters = input.initialSections && input.initialSections.length > 0
    ? input.initialSections
    : ["A", "B"];

  for (const letter of sectionLetters) {
    const trimmedLetter = letter.trim().toUpperCase();
    if (trimmedLetter) {
      const sec = await prisma.section.create({
        data: {
          classId: newClass.id,
          name: trimmedLetter,
          maxCapacity: 40,
        },
      });

      // If an academic session is specified, initialize SectionSession
      if (input.academicYearId) {
        await prisma.sectionSession.create({
          data: {
            sectionId: sec.id,
            academicYearId: input.academicYearId,
            maxCapacity: 40,
            isActive: true,
          },
        });
      }
    }
  }

  revalidatePath("/admin/rbac");
  revalidatePath("/students");
  revalidatePath("/students/new");
  return { success: true, classId: newClass.id };
}

export async function updateClassAction(input: {
  classId: string;
  name: string;
  numericGrade: number;
  sequence: number;
}) {
  await requirePermission("rbac", "update");

  const trimmedName = input.name.trim();
  if (!trimmedName) {
    throw new Error("Class name is required.");
  }

  await prisma.class.update({
    where: { id: input.classId },
    data: {
      name: trimmedName,
      numericGrade: Number(input.numericGrade) || 0,
      sequence: Number(input.sequence) || 0,
    },
  });

  revalidatePath("/admin/rbac");
  revalidatePath("/students");
  return { success: true };
}

export async function deleteClassAction(classId: string) {
  await requirePermission("rbac", "update");

  // Safety check 1: Enrolled students
  const studentCount = await prisma.student.count({ where: { classId } });
  if (studentCount > 0) {
    throw new Error(
      `Cannot delete class: ${studentCount} student(s) are currently enrolled in this class. Move or reassign students first.`
    );
  }

  // Safety check 2: Fee structures
  const feeCount = await prisma.feeStructure.count({ where: { classId } });
  if (feeCount > 0) {
    throw new Error(
      `Cannot delete class: It is linked to ${feeCount} fee structure(s). Please unassign or remove those fee structures first.`
    );
  }

  await prisma.class.delete({
    where: { id: classId },
  });

  revalidatePath("/admin/rbac");
  revalidatePath("/students");
  return { success: true };
}

export async function createSectionAction(input: {
  classId: string;
  name: string;
  maxCapacity?: number;
  roomNo?: string;
  academicYearId?: string;
}) {
  await requirePermission("rbac", "update");

  const trimmedLetter = input.name.trim().toUpperCase();
  if (!trimmedLetter) {
    throw new Error("Section name (e.g. A, B, C, D) is required.");
  }

  const cls = await prisma.class.findUnique({
    where: { id: input.classId },
    include: { campus: true },
  });

  if (!cls) {
    throw new Error("Target class not found.");
  }

  // Upsert base Section
  const capacity = input.maxCapacity && input.maxCapacity > 0 ? Number(input.maxCapacity) : 40;
  const section = await prisma.section.upsert({
    where: {
      classId_name: {
        classId: input.classId,
        name: trimmedLetter,
      },
    },
    update: {
      maxCapacity: capacity,
      roomNo: input.roomNo?.trim() || null,
    },
    create: {
      classId: input.classId,
      name: trimmedLetter,
      maxCapacity: capacity,
      roomNo: input.roomNo?.trim() || null,
    },
  });

  // If session specified, link SectionSession
  if (input.academicYearId) {
    await prisma.sectionSession.upsert({
      where: {
        sectionId_academicYearId: {
          sectionId: section.id,
          academicYearId: input.academicYearId,
        },
      },
      update: {
        isActive: true,
        maxCapacity: capacity,
        roomNo: input.roomNo?.trim() || null,
      },
      create: {
        sectionId: section.id,
        academicYearId: input.academicYearId,
        isActive: true,
        maxCapacity: capacity,
        roomNo: input.roomNo?.trim() || null,
      },
    });
  }

  revalidatePath("/admin/rbac");
  revalidatePath("/students");
  revalidatePath("/students/new");
  return { success: true, sectionId: section.id };
}

export async function toggleSectionSessionAction(input: {
  sectionId: string;
  academicYearId: string;
  isActive: boolean;
}) {
  await requirePermission("rbac", "update");

  const section = await prisma.section.findUnique({
    where: { id: input.sectionId },
  });

  if (!section) {
    throw new Error("Section not found.");
  }

  await prisma.sectionSession.upsert({
    where: {
      sectionId_academicYearId: {
        sectionId: input.sectionId,
        academicYearId: input.academicYearId,
      },
    },
    update: {
      isActive: input.isActive,
    },
    create: {
      sectionId: input.sectionId,
      academicYearId: input.academicYearId,
      isActive: input.isActive,
      maxCapacity: section.maxCapacity || 40,
      roomNo: section.roomNo || null,
    },
  });

  revalidatePath("/admin/rbac");
  revalidatePath("/students");
  revalidatePath("/students/new");
  return { success: true };
}

export async function updateSectionSessionAction(input: {
  sectionId: string;
  academicYearId: string;
  maxCapacity: number;
  roomNo?: string | null;
  isActive?: boolean;
}) {
  await requirePermission("rbac", "update");

  const capacity = input.maxCapacity > 0 ? Number(input.maxCapacity) : 40;

  await prisma.sectionSession.upsert({
    where: {
      sectionId_academicYearId: {
        sectionId: input.sectionId,
        academicYearId: input.academicYearId,
      },
    },
    update: {
      maxCapacity: capacity,
      roomNo: input.roomNo?.trim() || null,
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
    create: {
      sectionId: input.sectionId,
      academicYearId: input.academicYearId,
      maxCapacity: capacity,
      roomNo: input.roomNo?.trim() || null,
      isActive: input.isActive !== undefined ? input.isActive : true,
    },
  });

  // Also keep base Section maxCapacity updated for fallback
  await prisma.section.update({
    where: { id: input.sectionId },
    data: {
      maxCapacity: capacity,
      roomNo: input.roomNo?.trim() || null,
    },
  });

  revalidatePath("/admin/rbac");
  revalidatePath("/students");
  revalidatePath("/students/new");
  return { success: true };
}

export async function deleteSectionAction(sectionId: string) {
  await requirePermission("rbac", "update");

  // Safety check: are any students enrolled in this section?
  const studentCount = await prisma.student.count({ where: { sectionId } });
  if (studentCount > 0) {
    throw new Error(
      `Cannot delete section: ${studentCount} student(s) are currently enrolled in this section. Deactivate it for specific sessions instead of deleting.`
    );
  }

  await prisma.section.delete({
    where: { id: sectionId },
  });

  revalidatePath("/admin/rbac");
  revalidatePath("/students");
  revalidatePath("/students/new");
  return { success: true };
}
