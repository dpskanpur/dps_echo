"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { assertCampusAllowed } from "@/lib/permissions";
import { getActiveSession } from "@/lib/academic-session";
import { logAuditAction } from "@/lib/audit-log";
import {
  FEE_FREQUENCIES,
  FeeStructureImportRow,
  FeeImportResult,
} from "@/lib/fee-constants";

/**
 * Fee structure definition — manual entry and template import.
 *
 * A structure row is one amount for one fee head, for one class, in one
 * session. The unique key is (campus, session, class, feeHead), so importing
 * the same template twice updates amounts rather than duplicating them —
 * which makes the template safe to use as the annual revision mechanism.
 */


/**
 * Resolves which session a structure edit applies to.
 *
 * An explicit id wins, so fees for a future session can be prepared while the
 * current one is still running. Falling back to the active session keeps the
 * manual form working when nothing is selected.
 */
async function resolveSessionId(explicitId?: string | null): Promise<string> {
  const wanted = (explicitId || "").trim();

  if (wanted) {
    const found = await prisma.academicYear.findUnique({
      where: { id: wanted },
      select: { id: true },
    });
    if (!found) throw new Error("That academic session no longer exists.");
    return found.id;
  }

  const session = await getActiveSession();
  if (!session) {
    throw new Error(
      "No academic session exists. Create one in Admin Settings → Academic Sessions first."
    );
  }
  return session.id;
}

/** Adds or updates a single fee structure row. */
export async function upsertFeeStructure(formData: FormData): Promise<void> {
  const { user } = await requirePermission("fees", "update");

  const campusId = (formData.get("campusId") as string) || "";
  const classId = (formData.get("classId") as string) || "";
  const feeHeadId = (formData.get("feeHeadId") as string) || "";
  const frequency = (formData.get("frequency") as string) || "QUARTERLY";
  const amount = parseFloat((formData.get("amount") as string) || "");

  assertCampusAllowed(user, campusId);

  if (!campusId || !classId || !feeHeadId) {
    throw new Error("Campus, class and fee head are all required.");
  }
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Amount must be a non-negative number.");
  }
  if (!FEE_FREQUENCIES.includes(frequency as any)) {
    throw new Error(`Frequency must be one of: ${FEE_FREQUENCIES.join(", ")}.`);
  }

  const academicYearId = await resolveSessionId(formData.get("academicYearId") as string);

  await prisma.feeStructure.upsert({
    where: {
      campusId_academicYearId_classId_feeHeadId: {
        campusId,
        academicYearId,
        classId,
        feeHeadId,
      },
    },
    update: { amount, frequency },
    create: { campusId, academicYearId, classId, feeHeadId, amount, frequency },
  });

  await logAuditAction({
    userId: user.id,
    userEmail: user.email,
    userName: user.name || undefined,
    userRole: user.role,
    campusCode: campusId,
    action: "FEE_STRUCTURE_UPSERT",
    entityType: "FeeStructure",
    details: { classId, feeHeadId, amount, frequency, academicYearId },
  });

  revalidatePath("/fees/structures");
}

export async function deleteFeeStructure(formData: FormData): Promise<void> {
  const { user } = await requirePermission("fees", "delete");

  const id = (formData.get("structureId") as string) || "";
  const existing = await prisma.feeStructure.findUnique({
    where: { id },
    select: { campusId: true },
  });
  if (!existing) return;

  assertCampusAllowed(user, existing.campusId);
  await prisma.feeStructure.delete({ where: { id } });

  await logAuditAction({
    userId: user.id,
    userEmail: user.email,
    userName: user.name || undefined,
    userRole: user.role,
    campusCode: existing.campusId,
    action: "FEE_STRUCTURE_DELETE",
    entityType: "FeeStructure",
    entityId: id,
  });

  revalidatePath("/fees/structures");
}

/**
 * Applies an uploaded fee template.
 *
 * Every row is validated against the campus's own classes and fee heads
 * before anything is written, and the whole file is applied in one
 * transaction — a template with a typo in row 40 leaves the existing
 * structure untouched rather than half-updated.
 */
export async function importFeeStructures(
  campusId: string,
  rows: FeeStructureImportRow[],
  academicYearIdInput?: string
): Promise<FeeImportResult> {
  const { user } = await requirePermission("fees", "update");
  assertCampusAllowed(user, campusId);

  if (!rows?.length) {
    return { success: false, applied: 0, errors: ["The file contained no rows."] };
  }

  const academicYearId = await resolveSessionId(academicYearIdInput);

  const [classes, feeHeads] = await Promise.all([
    prisma.class.findMany({ where: { campusId }, select: { id: true, name: true } }),
    prisma.feeHead.findMany({ where: { campusId }, select: { id: true, code: true } }),
  ]);

  const classByName = new Map(classes.map((c) => [c.name.trim().toLowerCase(), c.id]));
  const headByCode = new Map(feeHeads.map((h) => [h.code.trim().toUpperCase(), h.id]));

  const errors: string[] = [];
  const valid: { classId: string; feeHeadId: string; amount: number; frequency: string }[] = [];

  rows.forEach((row, index) => {
    const line = index + 2; // +1 for zero-index, +1 for the header row
    const className = String(row.className || "").trim();
    const headCode = String(row.feeHeadCode || "").trim().toUpperCase();
    const frequency = String(row.frequency || "QUARTERLY").trim().toUpperCase();
    const amount = parseFloat(String(row.amount ?? "").replace(/[₹,\s]/g, ""));

    const classId = classByName.get(className.toLowerCase());
    const feeHeadId = headByCode.get(headCode);

    if (!className || !headCode) {
      errors.push(`Row ${line}: class and fee head code are required.`);
      return;
    }
    if (!classId) {
      errors.push(`Row ${line}: no class named "${className}" at this campus.`);
      return;
    }
    if (!feeHeadId) {
      errors.push(`Row ${line}: no fee head with code "${headCode}" at this campus.`);
      return;
    }
    if (!Number.isFinite(amount) || amount < 0) {
      errors.push(`Row ${line}: "${row.amount}" is not a valid amount.`);
      return;
    }
    if (!FEE_FREQUENCIES.includes(frequency as any)) {
      errors.push(`Row ${line}: frequency "${frequency}" is not one of ${FEE_FREQUENCIES.join(", ")}.`);
      return;
    }

    valid.push({ classId, feeHeadId, amount, frequency });
  });

  // All or nothing: a partially applied fee structure is worse than none.
  if (errors.length) {
    return { success: false, applied: 0, errors };
  }

  await prisma.$transaction(
    valid.map((row) =>
      prisma.feeStructure.upsert({
        where: {
          campusId_academicYearId_classId_feeHeadId: {
            campusId,
            academicYearId,
            classId: row.classId,
            feeHeadId: row.feeHeadId,
          },
        },
        update: { amount: row.amount, frequency: row.frequency },
        create: {
          campusId,
          academicYearId,
          classId: row.classId,
          feeHeadId: row.feeHeadId,
          amount: row.amount,
          frequency: row.frequency,
        },
      })
    )
  );

  await logAuditAction({
    userId: user.id,
    userEmail: user.email,
    userName: user.name || undefined,
    userRole: user.role,
    campusCode: campusId,
    action: "FEE_STRUCTURE_IMPORT",
    entityType: "FeeStructure",
    details: { appliedCount: valid.length, academicYearId },
  });

  revalidatePath("/fees/structures");
  return { success: true, applied: valid.length, errors: [] };
}

/** Creates a fee head so a structure can reference it. */
export async function createFeeHead(formData: FormData): Promise<void> {
  const { user } = await requirePermission("fees", "update");

  const campusId = (formData.get("campusId") as string) || "";
  const code = ((formData.get("code") as string) || "").trim().toUpperCase();
  const name = ((formData.get("name") as string) || "").trim();
  const isOptional = formData.get("isOptional") === "on";
  const isRefundable = formData.get("isRefundable") === "on";

  assertCampusAllowed(user, campusId);

  if (!code || !name) throw new Error("Fee head code and name are required.");
  if (!/^[A-Z0-9]{2,8}$/.test(code)) {
    throw new Error("Fee head code must be 2–8 letters or digits, e.g. TUI.");
  }

  const existing = await prisma.feeHead.findUnique({
    where: { campusId_code: { campusId, code } },
  });
  if (existing) throw new Error(`Fee head "${code}" already exists at this campus.`);

  const newHead = await prisma.feeHead.create({
    data: { campusId, code, name, isOptional, isRefundable },
  });

  await logAuditAction({
    userId: user.id,
    userEmail: user.email,
    userName: user.name || undefined,
    userRole: user.role,
    campusCode: campusId,
    action: "FEE_HEAD_CREATE",
    entityType: "FeeHead",
    entityId: newHead.id,
    details: { code, name, isOptional, isRefundable },
  });

  revalidatePath("/fees/structures");
}

/** Edits a fee head in place. */
export async function updateFeeHead(formData: FormData): Promise<void> {
  const { user } = await requirePermission("fees", "update");

  const id = (formData.get("feeHeadId") as string) || "";
  const name = ((formData.get("name") as string) || "").trim();
  const code = ((formData.get("code") as string) || "").trim().toUpperCase();
  const description = ((formData.get("description") as string) || "").trim() || null;
  const isOptional = formData.get("isOptional") === "on";
  const isRefundable = formData.get("isRefundable") === "on";

  const existing = await prisma.feeHead.findUnique({
    where: { id },
    select: { campusId: true, code: true },
  });
  if (!existing) throw new Error("That fee head no longer exists.");

  assertCampusAllowed(user, existing.campusId);

  if (!name) throw new Error("Fee head name is required.");
  if (!/^[A-Z0-9]{2,8}$/.test(code)) {
    throw new Error("Fee head code must be 2–8 letters or digits, e.g. TUI.");
  }

  // The code is the key an uploaded template matches on, so renaming it
  // invalidates any saved spreadsheet that still uses the old one.
  if (code !== existing.code) {
    const clash = await prisma.feeHead.findUnique({
      where: { campusId_code: { campusId: existing.campusId, code } },
    });
    if (clash) throw new Error(`Another fee head at this campus already uses code "${code}".`);
  }

  await prisma.feeHead.update({
    where: { id },
    data: { name, code, description, isOptional, isRefundable },
  });

  await logAuditAction({
    userId: user.id,
    userEmail: user.email,
    userName: user.name || undefined,
    userRole: user.role,
    campusCode: existing.campusId,
    action: "FEE_HEAD_UPDATE",
    entityType: "FeeHead",
    entityId: id,
    details: { code, name, description, isOptional, isRefundable },
  });

  revalidatePath("/fees/structures");
}

/**
 * Removes a fee head.
 *
 * Refused if the head is in use at all — whether on an invoice (billing
 * history) or in a fee structure (an amount a class is charged). The schema
 * cascades fee structure rows, so allowing this would silently delete fee
 * amounts across every class that used the head; refusing is the safe default
 * and the user can clear the structure rows deliberately first.
 */
export async function deleteFeeHead(formData: FormData): Promise<void> {
  const { user } = await requirePermission("fees", "delete");

  const id = (formData.get("feeHeadId") as string) || "";
  const head = await prisma.feeHead.findUnique({
    where: { id },
    select: { campusId: true, code: true, name: true },
  });
  if (!head) return;

  assertCampusAllowed(user, head.campusId);

  const [invoicedCount, structureCount] = await Promise.all([
    prisma.feeInvoiceItem.count({ where: { feeHeadId: id } }),
    prisma.feeStructure.count({ where: { feeHeadId: id } }),
  ]);

  if (invoicedCount > 0) {
    throw new Error(
      `"${head.name}" appears on ${invoicedCount} invoice line(s) and cannot be deleted. ` +
        `Billing history must stay intact — mark it optional instead if it is no longer charged.`
    );
  }

  if (structureCount > 0) {
    throw new Error(
      `"${head.name}" is used in ${structureCount} fee structure row(s) and cannot be deleted. ` +
        `Remove those amounts from the fee structure first, then delete the head.`
    );
  }

  await prisma.feeHead.delete({ where: { id } });

  await logAuditAction({
    userId: user.id,
    userEmail: user.email,
    userName: user.name || undefined,
    userRole: user.role,
    campusCode: head.campusId,
    action: "FEE_HEAD_DELETE",
    entityType: "FeeHead",
    entityId: id,
    details: { code: head.code, name: head.name },
  });

  revalidatePath("/fees/structures");
  redirect(
    `/fees/structures?campus=${head.campusId}&notice=head_deleted` +
      `&name=${encodeURIComponent(head.code)}`
  );
}
