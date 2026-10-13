"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { assertCampusAllowed } from "@/lib/permissions";
import { logAuditAction } from "@/lib/audit-log";

// -------------------------------------------------------------
// Campus Isolation Helper for Employees
// -------------------------------------------------------------
async function assertEmployeeInScope(
  user: { campusId?: string | null },
  employeeId: string
): Promise<{ id: string; campusId: string; employeeCode: string; firstName: string; lastName: string }> {
  const record = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { id: true, campusId: true, employeeCode: true, firstName: true, lastName: true },
  });
  if (!record) {
    throw new Error("Employee record not found.");
  }
  if (user.campusId && record.campusId !== user.campusId) {
    throw new Error("Forbidden: You do not have access to employee records belonging to another campus.");
  }
  return record;
}

// -------------------------------------------------------------
// Auto-generate Sequential Employee Code per Campus
// Format: EMP-KID-0001, EMP-AZD-0001, EMP-BAR-0001, EMP-SRV-0001
// -------------------------------------------------------------
async function generateNextEmployeeCode(campusId: string): Promise<string> {
  const campus = await prisma.campus.findUnique({
    where: { id: campusId },
    select: { code: true },
  });
  const rawCode = (campus?.code || "DPS").toUpperCase().replace(/^DPS/, "") || "KNP";
  const prefix = `EMP-${rawCode}-`;

  const latest = await prisma.employee.findFirst({
    where: {
      employeeCode: { startsWith: prefix },
    },
    orderBy: { employeeCode: "desc" },
    select: { employeeCode: true },
  });

  let nextNum = 1;
  if (latest?.employeeCode) {
    const match = latest.employeeCode.match(/(\d+)$/);
    if (match) {
      nextNum = parseInt(match[1], 10) + 1;
    }
  }

  // Ensure uniqueness even if custom codes exist
  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = `${prefix}${String(nextNum + attempt).padStart(4, "0")}`;
    const existing = await prisma.employee.findUnique({
      where: { employeeCode: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
  }

  return `${prefix}${Date.now().toString().slice(-4)}`;
}

// -------------------------------------------------------------
// 1. Create New Employee
// -------------------------------------------------------------
export async function createEmployee(formData: FormData): Promise<void> {
  const { user } = await requirePermission("employees", "update");

  const requestedCampusId = (formData.get("campusId") as string)?.trim();
  const campusId = user.campusId || requestedCampusId;
  if (!campusId) {
    throw new Error("Campus selection is required.");
  }
  assertCampusAllowed(user, campusId);

  const rawCode = (formData.get("employeeCode") as string)?.trim().toUpperCase();
  const employeeCode = rawCode || (await generateNextEmployeeCode(campusId));

  // Check duplicate employeeCode
  const existingCode = await prisma.employee.findUnique({
    where: { employeeCode },
    select: { id: true },
  });
  if (existingCode) {
    throw new Error(`Employee Code "${employeeCode}" is already assigned to another staff member.`);
  }

  const firstName = (formData.get("firstName") as string)?.trim();
  const lastName = (formData.get("lastName") as string)?.trim() || "";
  if (!firstName) {
    throw new Error("First name is required.");
  }

  const gender = (formData.get("gender") as string) || "FEMALE";
  const dobRaw = (formData.get("dob") as string)?.trim();
  const dob = dobRaw ? new Date(dobRaw) : null;
  const bloodGroup = (formData.get("bloodGroup") as string)?.trim() || null;
  const photoUrl = (formData.get("photoUrl") as string)?.trim() || null;

  const phone = (formData.get("phone") as string)?.trim();
  if (!phone) {
    throw new Error("Primary contact phone number is required.");
  }
  const email = (formData.get("email") as string)?.trim() || null;
  const currentAddress =
    ((formData.get("currentAddress") || formData.get("address")) as string)?.trim() || null;
  const emergencyName = (formData.get("emergencyName") as string)?.trim() || null;
  const emergencyPhone = (formData.get("emergencyPhone") as string)?.trim() || null;

  const category = (formData.get("category") as string) || "TEACHING";
  const designation = (formData.get("designation") as string)?.trim() || "Faculty";
  const department = (formData.get("department") as string)?.trim() || null;
  const employmentType = (formData.get("employmentType") as string) || "PERMANENT";
  const joiningDateRaw = (formData.get("joiningDate") as string)?.trim();
  const joiningDate = joiningDateRaw ? new Date(joiningDateRaw) : new Date();
  const status = (formData.get("status") as string) || "ACTIVE";

  // CBSE OASIS & School Assignments
  const qualification = (formData.get("qualification") as string)?.trim() || null;
  const subjectsTaught = (formData.get("subjectsTaught") as string)?.trim() || null;
  const oasisId =
    ((formData.get("oasisId") || formData.get("cbseOasisId")) as string)?.trim() || null;
  const ctetQualified = (formData.get("ctetQualified") as string) || "NA";
  const experienceYrsRaw =
    ((formData.get("priorExperienceYrs") || formData.get("experienceYrs")) as string)?.trim();
  const priorExperienceYrs =
    experienceYrsRaw !== "" && experienceYrsRaw != null ? parseInt(experienceYrsRaw, 10) || 0 : 0;
  const assignedClass = (formData.get("assignedClass") as string)?.trim() || null;
  const assignedHouse = (formData.get("assignedHouse") as string)?.trim() || null;
  const notes =
    ((formData.get("notes") || formData.get("remarks")) as string)?.trim() || null;

  const created = await prisma.employee.create({
    data: {
      employeeCode,
      campusId,
      firstName,
      lastName,
      gender,
      dob,
      bloodGroup,
      photoUrl,
      phone,
      email,
      currentAddress,
      emergencyName,
      emergencyPhone,
      category,
      designation,
      department,
      employmentType,
      joiningDate,
      status,
      qualification,
      subjectsTaught,
      oasisId,
      ctetQualified,
      priorExperienceYrs,
      assignedClass,
      assignedHouse,
      notes,
    },
  });

  await logAuditAction({
    userId: user.id,
    userEmail: user.email,
    userName: user.name,
    userRole: user.role,
    action: "CREATE_EMPLOYEE",
    entityType: "EMPLOYEE",
    entityId: created.id,
    details: {
      employeeCode: created.employeeCode,
      name: `${created.firstName} ${created.lastName}`,
      campusId: created.campusId,
      category: created.category,
      designation: created.designation,
    },
  });

  revalidatePath("/employees");
  revalidatePath("/");
  redirect(`/employees/${created.id}`);
}

// -------------------------------------------------------------
// 2. Update Existing Employee Profile & Assignments
// -------------------------------------------------------------
export async function updateEmployee(employeeId: string, formData: FormData): Promise<void> {
  const { user } = await requirePermission("employees", "update");
  const existing = await assertEmployeeInScope(user, employeeId);

  const requestedCampusId = (formData.get("campusId") as string)?.trim() || existing.campusId;
  // If user is campus-locked, they cannot transfer an employee to another campus
  const targetCampusId = user.campusId ? existing.campusId : requestedCampusId;
  assertCampusAllowed(user, targetCampusId);

  const employeeCode = ((formData.get("employeeCode") as string)?.trim() || existing.employeeCode).toUpperCase();
  if (employeeCode !== existing.employeeCode) {
    const dup = await prisma.employee.findUnique({
      where: { employeeCode },
      select: { id: true },
    });
    if (dup && dup.id !== employeeId) {
      throw new Error(`Employee Code "${employeeCode}" is already in use.`);
    }
  }

  const firstName = (formData.get("firstName") as string)?.trim() || existing.firstName;
  const lastName = (formData.get("lastName") as string)?.trim() ?? existing.lastName;
  const gender = (formData.get("gender") as string) || "FEMALE";
  const dobRaw = (formData.get("dob") as string)?.trim();
  const dob = dobRaw ? new Date(dobRaw) : null;
  const bloodGroup = (formData.get("bloodGroup") as string)?.trim() || null;
  const photoUrl = (formData.get("photoUrl") as string)?.trim() || undefined;

  const phone = (formData.get("phone") as string)?.trim() || "";
  const email = (formData.get("email") as string)?.trim() || null;
  const currentAddress =
    ((formData.get("currentAddress") || formData.get("address")) as string)?.trim() || null;
  const emergencyName = (formData.get("emergencyName") as string)?.trim() || null;
  const emergencyPhone = (formData.get("emergencyPhone") as string)?.trim() || null;

  const category = (formData.get("category") as string) || "TEACHING";
  const designation = (formData.get("designation") as string)?.trim() || "Faculty";
  const department = (formData.get("department") as string)?.trim() || null;
  const employmentType = (formData.get("employmentType") as string) || "PERMANENT";
  const joiningDateRaw = (formData.get("joiningDate") as string)?.trim();
  const joiningDate = joiningDateRaw ? new Date(joiningDateRaw) : undefined;
  const status = (formData.get("status") as string) || "ACTIVE";

  // CBSE OASIS & School Assignments
  const qualification = (formData.get("qualification") as string)?.trim() || null;
  const subjectsTaught = (formData.get("subjectsTaught") as string)?.trim() || null;
  const oasisId =
    ((formData.get("oasisId") || formData.get("cbseOasisId")) as string)?.trim() || null;
  const ctetQualified = (formData.get("ctetQualified") as string) || "NA";
  const experienceYrsRaw =
    ((formData.get("priorExperienceYrs") || formData.get("experienceYrs")) as string)?.trim();
  const priorExperienceYrs =
    experienceYrsRaw !== "" && experienceYrsRaw != null ? parseInt(experienceYrsRaw, 10) || 0 : 0;
  const assignedClass = (formData.get("assignedClass") as string)?.trim() || null;
  const assignedHouse = (formData.get("assignedHouse") as string)?.trim() || null;
  const notes =
    ((formData.get("notes") || formData.get("remarks")) as string)?.trim() || null;

  await prisma.employee.update({
    where: { id: employeeId },
    data: {
      employeeCode,
      campusId: targetCampusId,
      firstName,
      lastName,
      gender,
      dob,
      bloodGroup,
      ...(photoUrl ? { photoUrl } : {}),
      phone,
      email,
      currentAddress,
      emergencyName,
      emergencyPhone,
      category,
      designation,
      department,
      employmentType,
      ...(joiningDate ? { joiningDate } : {}),
      status,
      qualification,
      subjectsTaught,
      oasisId,
      ctetQualified,
      priorExperienceYrs,
      assignedClass,
      assignedHouse,
      notes,
    },
  });

  await logAuditAction({
    userId: user.id,
    userEmail: user.email,
    userName: user.name,
    userRole: user.role,
    action: "UPDATE_EMPLOYEE",
    entityType: "EMPLOYEE",
    entityId: employeeId,
    details: {
      employeeCode,
      name: `${firstName} ${lastName}`,
      campusId: targetCampusId,
      status,
      designation,
      category,
    },
  });

  revalidatePath(`/employees/${employeeId}`);
  revalidatePath("/employees");
  revalidatePath("/");
  redirect(`/employees/${employeeId}`);
}

// -------------------------------------------------------------
// 3. Update Exit & Handover Clearance Checklist
// -------------------------------------------------------------
export async function updateEmployeeClearance(employeeId: string, formData: FormData): Promise<void> {
  const { user } = await requirePermission("employees", "update");
  const existing = await assertEmployeeInScope(user, employeeId);

  const status = (formData.get("status") as string) || undefined;
  const leavingDateRaw = (formData.get("leavingDate") as string)?.trim();
  const leavingDate = leavingDateRaw ? new Date(leavingDateRaw) : null;
  const exitReason = (formData.get("exitReason") as string)?.trim() || null;

  const clearanceLibrary = formData.get("clearanceLibrary") === "on" || formData.get("clearanceLibrary") === "true";
  const clearanceIdKeys = formData.get("clearanceIdKeys") === "on" || formData.get("clearanceIdKeys") === "true";
  const clearanceItAssets = formData.get("clearanceItAssets") === "on" || formData.get("clearanceItAssets") === "true";
  const relievingIssued = formData.get("relievingIssued") === "on" || formData.get("relievingIssued") === "true";

  await prisma.employee.update({
    where: { id: employeeId },
    data: {
      ...(status ? { status } : {}),
      leavingDate,
      exitReason,
      clearanceLibrary,
      clearanceIdKeys,
      clearanceItAssets,
      relievingIssued,
    },
  });

  await logAuditAction({
    userId: user.id,
    userEmail: user.email,
    userName: user.name,
    userRole: user.role,
    action: "UPDATE_EMPLOYEE_CLEARANCE",
    entityType: "EMPLOYEE",
    entityId: employeeId,
    details: {
      employeeCode: existing.employeeCode,
      status,
      leavingDate: leavingDateRaw || null,
      clearanceLibrary,
      clearanceIdKeys,
      clearanceItAssets,
      relievingIssued,
    },
  });

  revalidatePath(`/employees/${employeeId}`);
  revalidatePath("/employees");
}

// -------------------------------------------------------------
// 4. Delete Employee Record
// -------------------------------------------------------------
export async function deleteEmployee(employeeId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { user } = await requirePermission("employees", "delete");
    const existing = await assertEmployeeInScope(user, employeeId);

    await prisma.employee.delete({
      where: { id: employeeId },
    });

    await logAuditAction({
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      userRole: user.role,
      action: "DELETE_EMPLOYEE",
      entityType: "EMPLOYEE",
      entityId: employeeId,
      details: {
        employeeCode: existing.employeeCode,
        name: `${existing.firstName} ${existing.lastName}`,
        campusId: existing.campusId,
      },
    });

    revalidatePath("/employees");
    revalidatePath("/");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to delete employee record." };
  }
}

// -------------------------------------------------------------
// 5. Delete Employee Document
// -------------------------------------------------------------
export async function deleteEmployeeDocument(docId: string, employeeId: string): Promise<void> {
  const { user } = await requirePermission("employees", "update");
  await assertEmployeeInScope(user, employeeId);

  const doc = await prisma.employeeDocument.findUnique({
    where: { id: docId },
    select: { id: true, employeeId: true, title: true },
  });

  if (!doc || doc.employeeId !== employeeId) {
    throw new Error("Document not found or does not belong to this employee.");
  }

  await prisma.employeeDocument.delete({
    where: { id: docId },
  });

  revalidatePath(`/employees/${employeeId}`);
}

// -------------------------------------------------------------
// 6. Bulk CSV Import for Employees (Campus-Scoped)
// -------------------------------------------------------------
export interface BulkEmployeeRow {
  employeeCode?: string;
  campusCode?: string;
  firstName: string;
  lastName?: string;
  gender?: string;
  dob?: string;
  bloodGroup?: string;
  phone: string;
  email?: string;
  category?: string;
  designation: string;
  department?: string;
  employmentType?: string;
  joiningDate?: string;
  qualification?: string;
  subjectsTaught?: string;
  cbseOasisId?: string;
  oasisId?: string;
  ctetQualified?: string;
  experienceYrs?: string | number;
  priorExperienceYrs?: string | number;
  assignedClass?: string;
  assignedHouse?: string;
}

export async function bulkImportEmployees(
  rows: BulkEmployeeRow[],
  fallbackCampusId?: string
): Promise<{ imported: number; skipped: number; errors: string[] }> {
  const { user } = await requirePermission("employees", "update");

  if (!Array.isArray(rows) || rows.length === 0) {
    return { imported: 0, skipped: 0, errors: ["No rows provided for import."] };
  }
  if (rows.length > 500) {
    return { imported: 0, skipped: 0, errors: ["Maximum 500 employee records allowed per batch import."] };
  }

  const campuses = await prisma.campus.findMany({
    select: { id: true, code: true, name: true },
  });
  const campusByCode = new Map<string, string>();
  for (const c of campuses) {
    campusByCode.set(c.code.toUpperCase(), c.id);
    campusByCode.set(c.code.toUpperCase().replace(/^DPS/, ""), c.id);
  }

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;
    try {
      const firstName = (row.firstName || "").trim();
      const phone = (row.phone || "").trim();
      if (!firstName || !phone) {
        skipped++;
        errors.push(`Row ${rowNum}: Missing required firstName or phone.`);
        continue;
      }

      // Resolve target campus
      let targetCampusId = user.campusId || fallbackCampusId || "";
      if (!user.campusId && row.campusCode) {
        const codeKey = row.campusCode.trim().toUpperCase();
        const matched = campusByCode.get(codeKey);
        if (matched) targetCampusId = matched;
      }
      if (!targetCampusId && campuses.length > 0) {
        targetCampusId = campuses[0].id;
      }

      assertCampusAllowed(user, targetCampusId);

      const employeeCode =
        (row.employeeCode || "").trim().toUpperCase() ||
        (await generateNextEmployeeCode(targetCampusId));

      const existing = await prisma.employee.findUnique({
        where: { employeeCode },
        select: { id: true },
      });
      if (existing) {
        skipped++;
        errors.push(`Row ${rowNum}: Employee code ${employeeCode} already exists.`);
        continue;
      }

      const catUpper = (row.category || "TEACHING").trim().toUpperCase();
      const validCategory = ["TEACHING", "NON_TEACHING", "ADMIN", "SUPPORT"].includes(catUpper)
        ? catUpper
        : "TEACHING";

      const empTypeUpper = (row.employmentType || "PERMANENT").trim().toUpperCase();
      const validEmpType = ["PERMANENT", "PROBATION", "CONTRACT", "VISITING"].includes(empTypeUpper)
        ? empTypeUpper
        : "PERMANENT";

      await prisma.employee.create({
        data: {
          employeeCode,
          campusId: targetCampusId,
          firstName,
          lastName: (row.lastName || "").trim(),
          gender: (row.gender || "FEMALE").trim().toUpperCase(),
          dob: row.dob ? new Date(row.dob) : null,
          bloodGroup: (row.bloodGroup || "").trim() || null,
          phone,
          email: (row.email || "").trim() || null,
          category: validCategory,
          designation: (row.designation || "Faculty").trim(),
          department: (row.department || "").trim() || null,
          employmentType: validEmpType,
          joiningDate: row.joiningDate ? new Date(row.joiningDate) : new Date(),
          status: "ACTIVE",
          qualification: (row.qualification || "").trim() || null,
          subjectsTaught: (row.subjectsTaught || "").trim() || null,
          oasisId: (row.oasisId || row.cbseOasisId || "").trim() || null,
          ctetQualified: (row.ctetQualified || "NA").trim().toUpperCase(),
          priorExperienceYrs: Number(row.priorExperienceYrs ?? row.experienceYrs) || 0,
          assignedClass: (row.assignedClass || "").trim() || null,
          assignedHouse: (row.assignedHouse || "").trim() || null,
        },
      });
      imported++;
    } catch (err: any) {
      skipped++;
      errors.push(`Row ${rowNum}: ${err?.message || "Invalid row data"}`);
    }
  }

  if (imported > 0) {
    await logAuditAction({
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      userRole: user.role,
      action: "BULK_IMPORT_EMPLOYEES",
      entityType: "EMPLOYEE",
      details: { imported, skipped },
    });
    revalidatePath("/employees");
    revalidatePath("/");
  }

  return { imported, skipped, errors };
}
