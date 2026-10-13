"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";

/**
 * Academic session administration.
 *
 * Rules enforced:
 * 1. Only future/current sessions can be made active, never past sessions.
 * 2. Past sessions remain permanently disabled once the academic year passes.
 * 3. At any time, at most two sessions can be active simultaneously (Current Year and Next Year for advance admissions).
 * 4. Future sessions beyond next year can be created, but cannot be enabled yet.
 */

const SESSION_NAME = /^(\d{4})-(\d{4})$/;

/**
 * Normalizes all Unicode dash variants (en-dash –, em-dash —, figure dash, minus sign, etc.)
 * into a standard ASCII hyphen.
 */
export async function normalizeSessionString(raw: string): Promise<string> {
  return raw.trim().replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D\s]+/g, "-");
}

function parseSessionName(raw: string): { name: string; start: number; end: number } {
  // Normalize en-dash, em-dash, non-breaking spaces to standard ASCII hyphen
  const name = raw.trim().replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D\s]+/g, "-");
  const match = name.match(SESSION_NAME);
  if (!match) {
    throw new Error('Session must be formatted as "2027-2028".');
  }
  const start = Number(match[1]);
  const end = Number(match[2]);
  if (end !== start + 1) {
    throw new Error(`"${name}" is not a consecutive year pair — expected ${start}-${start + 1}.`);
  }
  return { name, start, end };
}

/**
 * Categorizes a session relative to the current school calendar.
 * In India/CBSE, the academic year runs April 1 to March 31.
 */
export async function getSessionTemporalCategory(
  sessionName: string
): Promise<"PAST" | "CURRENT" | "NEXT" | "FAR_FUTURE"> {
  const match = sessionName.match(/^(\d{4})/);
  if (!match) return "PAST";
  const startYear = parseInt(match[1], 10);

  const now = new Date();
  const calYear = now.getFullYear();
  // Month 3 is April (0-indexed). If April-Dec, current start year is calYear. If Jan-Mar, it's calYear - 1.
  const currentAcademicStartYear = now.getMonth() >= 3 ? calYear : calYear - 1;

  if (startYear < currentAcademicStartYear) {
    return "PAST";
  } else if (startYear === currentAcademicStartYear) {
    return "CURRENT";
  } else if (startYear === currentAcademicStartYear + 1) {
    return "NEXT";
  } else {
    return "FAR_FUTURE";
  }
}

/**
 * Toggles an academic session's active status.
 * Enforces:
 * - Past sessions cannot be activated.
 * - Sessions > 1 year in future cannot be activated yet.
 * - At most 2 sessions can be active concurrently (current year and year next).
 */
export async function toggleAcademicSession(
  sessionId: string,
  makeActive: boolean
): Promise<{ success: boolean; message?: string }> {
  await requirePermission("sessions", "update");

  const target = await prisma.academicYear.findUnique({ where: { id: sessionId } });
  if (!target) {
    throw new Error("Academic session not found.");
  }

  const category = await getSessionTemporalCategory(target.name);

  if (makeActive) {
    // 1. Block past sessions
    if (category === "PAST") {
      throw new Error(
        `Cannot activate past session ${target.name}. Past academic years remain permanently closed once the year passes.`
      );
    }

    // 2. Block sessions beyond next year
    if (category === "FAR_FUTURE") {
      throw new Error(
        `Session ${target.name} cannot be activated yet. Only the current year and the immediate next year can be active for admissions.`
      );
    }

    // 3. Maximum 2 concurrent active sessions
    const otherActive = await prisma.academicYear.findMany({
      where: { isCurrent: true, id: { not: sessionId } },
    });

    if (otherActive.length >= 2) {
      throw new Error(
        `At most two academic sessions can be active simultaneously (e.g. current year and next year). Please disable another active session first.`
      );
    }

    await prisma.academicYear.update({
      where: { id: sessionId },
      data: { isCurrent: true },
    });
  } else {
    // Deactivating: Ensure at least one session remains active
    const remainingActive = await prisma.academicYear.count({
      where: { isCurrent: true, id: { not: sessionId } },
    });

    if (remainingActive === 0) {
      throw new Error("At least one academic session must remain active in the system.");
    }

    await prisma.academicYear.update({
      where: { id: sessionId },
      data: { isCurrent: false },
    });
  }

  revalidatePath("/", "layout");
  revalidatePath("/admin/rbac");
  revalidatePath("/public-registration");
  revalidatePath("/students");
  return { success: true };
}

/** Switches the single active session (Legacy compatibility). */
export async function setActiveSession(formData: FormData): Promise<void> {
  const sessionId = (formData.get("sessionId") as string) || "";
  await toggleAcademicSession(sessionId, true);
  redirect(`/admin/rbac?tab=sessions&notice=session_activated`);
}

/** Opens a new session with automatic dash normalization. */
export async function createAcademicSession(formData: FormData): Promise<void> {
  await requirePermission("sessions", "update");

  const rawName = (formData.get("name") as string) || "";
  const { name, start, end } = parseSessionName(rawName);

  const existing = await prisma.academicYear.findUnique({ where: { name } });
  if (existing) {
    throw new Error(`Session ${name} already exists.`);
  }

  // Indian academic year: April 1 to March 31.
  await prisma.academicYear.create({
    data: {
      name,
      startDate: new Date(Date.UTC(start, 3, 1)),
      endDate: new Date(Date.UTC(end, 2, 31)),
      isCurrent: false,
    },
  });

  revalidatePath("/", "layout");
  redirect(`/admin/rbac?tab=sessions&notice=session_created&name=${encodeURIComponent(name)}`);
}
