import { prisma } from "@/lib/prisma";

/**
 * Academic session resolution.
 *
 * `AcademicYear.isCurrent` is the single source of truth for which session new
 * records belong to. Before this existed, student creation stamped
 * `academicYearIn` from the server clock, so records ignored every session
 * setting in the system and a September admission silently landed in the next
 * session.
 *
 * Viewing a session and setting the active one are deliberately separate: the
 * first is a per-user filter, the second changes what new records are stamped
 * with and is gated on the `sessions` permission.
 */

export interface SessionOption {
  id: string;
  name: string;
  isCurrent: boolean;
}

/** Every session, newest first. */
export async function listAcademicSessions(): Promise<SessionOption[]> {
  const rows = await prisma.academicYear.findMany({
    orderBy: { name: "desc" },
    select: { id: true, name: true, isCurrent: true },
  });
  return rows;
}

/** Only active/enabled sessions, chronological order. */
export async function listActiveAcademicSessions(): Promise<SessionOption[]> {
  return prisma.academicYear.findMany({
    where: { isCurrent: true },
    orderBy: { startDate: "asc" },
    select: { id: true, name: true, isCurrent: true },
  });
}

/**
 * The ongoing session new records are stamped with.
 * Prefers the current calendar academic year if active, otherwise earliest active session.
 */
export async function getActiveSessionName(): Promise<string> {
  const now = new Date();
  const calYear = now.getFullYear();
  const currentAcademicStartYear = now.getMonth() >= 3 ? calYear : calYear - 1;
  const currentAcademicName = `${currentAcademicStartYear}-${currentAcademicStartYear + 1}`;

  const currentMatch = await prisma.academicYear.findFirst({
    where: { isCurrent: true, name: currentAcademicName },
    select: { name: true },
  });
  if (currentMatch) return currentMatch.name;

  const current = await prisma.academicYear.findFirst({
    where: { isCurrent: true },
    orderBy: { startDate: "asc" },
    select: { name: true },
  });
  if (current) return current.name;

  const latest = await prisma.academicYear.findFirst({
    orderBy: { name: "desc" },
    select: { name: true },
  });
  if (latest) return latest.name;

  return currentAcademicName;
}

export async function getActiveSession(): Promise<SessionOption | null> {
  const now = new Date();
  const calYear = now.getFullYear();
  const currentAcademicStartYear = now.getMonth() >= 3 ? calYear : calYear - 1;
  const currentAcademicName = `${currentAcademicStartYear}-${currentAcademicStartYear + 1}`;

  const currentMatch = await prisma.academicYear.findFirst({
    where: { isCurrent: true, name: currentAcademicName },
    select: { id: true, name: true, isCurrent: true },
  });
  if (currentMatch) return currentMatch;

  const current = await prisma.academicYear.findFirst({
    where: { isCurrent: true },
    orderBy: { startDate: "asc" },
    select: { id: true, name: true, isCurrent: true },
  });
  if (current) return current;

  return prisma.academicYear.findFirst({
    orderBy: { name: "desc" },
    select: { id: true, name: true, isCurrent: true },
  });
}

export interface SessionScope {
  /** Session being viewed, or null for all sessions. */
  name: string | null;
  /** Prisma `where` fragment for models carrying `academicYearIn`. */
  studentWhere: { academicYearIn?: string };
}

/**
 * Resolves the session the user is viewing from the `?session=` parameter.
 * Unknown or absent values mean "all sessions" rather than an error, so a
 * stale bookmark degrades to showing everything.
 */
export function resolveSessionScope(
  requested: string | null | undefined,
  available: SessionOption[]
): SessionScope {
  // Explicitly asking for everything is honoured.
  if (requested === "ALL") {
    return { name: null, studentWhere: {} };
  }

  // Find ongoing calendar academic session if active, otherwise fallback to first active
  const now = new Date();
  const calYear = now.getFullYear();
  const currentAcademicStartYear = now.getMonth() >= 3 ? calYear : calYear - 1;
  const currentAcademicName = `${currentAcademicStartYear}-${currentAcademicStartYear + 1}`;

  const defaultSession =
    available.find((s) => s.isCurrent && s.name === currentAcademicName) ||
    available.find((s) => s.isCurrent) ||
    available[0];

  const wanted = requested || defaultSession?.name;
  if (!wanted) return { name: null, studentWhere: {} };

  const match = available.find((s) => s.name === wanted);
  if (!match) return { name: null, studentWhere: {} };

  return { name: match.name, studentWhere: { academicYearIn: match.name } };
}

// -------------------------------------------------------------
// Admission rules
//
// A student can be admitted into the current session or a future one — a
// school takes next year's admissions months in advance — but never into a
// session that has already closed or is disabled.
// -------------------------------------------------------------

/** Start year of a session named like "2026-2027". */
function sessionStartYear(name: string): number {
  const match = name.match(/^(\d{4})/);
  return match ? Number(match[1]) : 0;
}

/** Sessions an admission may be recorded in: only active/enabled sessions, oldest first. */
export async function listAdmissionSessions(): Promise<SessionOption[]> {
  const active = await prisma.academicYear.findMany({
    where: { isCurrent: true },
    orderBy: { startDate: "asc" },
    select: { id: true, name: true, isCurrent: true },
  });
  if (active.length > 0) return active;
  return listAcademicSessions();
}

/**
 * Validates a requested admission session, defaulting to the active one.
 * Throws on a past or unknown session rather than falling back silently —
 * a rejected admission is recoverable, a misfiled one is not.
 */
export async function resolveAdmissionSession(requested?: string | null): Promise<string> {
  const activeName = await getActiveSessionName();
  const wanted = (requested || "").trim();

  if (!wanted) return activeName;
  if (wanted === activeName) return activeName;

  const allowed = await listAdmissionSessions();
  const match = allowed.find((s) => s.name === wanted);

  if (!match) {
    const options = allowed.map((s) => s.name).join(", ") || activeName;
    throw new Error(
      `Admissions cannot be recorded in session "${wanted}". ` +
        `The current session is ${activeName}; permitted sessions are: ${options}.`
    );
  }

  return match.name;
}

/** Alias for getActiveSessionName to support legacy/audit-log calls */
export const getCurrentAcademicSession = getActiveSessionName;
