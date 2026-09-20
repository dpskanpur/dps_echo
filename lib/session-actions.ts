"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";

/**
 * Academic session administration.
 *
 * Gated on the `sessions` module so the head of admissions can hold it
 * without also holding full RBAC rights. Switching the active session changes
 * what every new admission and invoice is stamped with, which is why it lives
 * here rather than on the navbar switcher (that one only filters a view).
 */

const SESSION_NAME = /^(\d{4})-(\d{4})$/;

function parseSessionName(raw: string): { name: string; start: number; end: number } {
  const name = raw.trim();
  const match = name.match(SESSION_NAME);
  if (!match) {
    throw new Error('Session must be formatted as "2026-2027".');
  }
  const start = Number(match[1]);
  const end = Number(match[2]);
  if (end !== start + 1) {
    throw new Error(`"${name}" is not a consecutive year pair — expected ${start}-${start + 1}.`);
  }
  return { name, start, end };
}

/** Switches the session new records are stamped with. */
export async function setActiveSession(formData: FormData): Promise<void> {
  await requirePermission("sessions", "update");

  const sessionId = (formData.get("sessionId") as string) || "";
  const target = await prisma.academicYear.findUnique({ where: { id: sessionId } });
  if (!target) {
    throw new Error("That academic session no longer exists.");
  }

  // Exactly one session is current; clearing and setting in one transaction
  // avoids a window where none or two are.
  await prisma.$transaction([
    prisma.academicYear.updateMany({
      where: { isCurrent: true },
      data: { isCurrent: false },
    }),
    prisma.academicYear.update({
      where: { id: target.id },
      data: { isCurrent: true },
    }),
  ]);

  revalidatePath("/", "layout");
  redirect(`/admin/rbac?tab=sessions&notice=session_activated&name=${encodeURIComponent(target.name)}`);
}

/** Opens a new session. Does not activate it — that is a separate, deliberate step. */
export async function createAcademicSession(formData: FormData): Promise<void> {
  await requirePermission("sessions", "update");

  const { name, start, end } = parseSessionName((formData.get("name") as string) || "");

  const existing = await prisma.academicYear.findUnique({ where: { name } });
  if (existing) {
    throw new Error(`Session ${name} already exists.`);
  }

  // Indian academic year: April to March.
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
