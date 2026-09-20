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

/**
 * The session new records are stamped with. Falls back to the most recent
 * session, then to a clock-derived name if the table is empty — a fresh
 * database should still accept an admission.
 */
export async function getActiveSessionName(): Promise<string> {
  const current = await prisma.academicYear.findFirst({
    where: { isCurrent: true },
    select: { name: true },
  });
  if (current) return current.name;

  const latest = await prisma.academicYear.findFirst({
    orderBy: { name: "desc" },
    select: { name: true },
  });
  if (latest) return latest.name;

  const year = new Date().getFullYear();
  return `${year}-${year + 1}`;
}

export async function getActiveSession(): Promise<SessionOption | null> {
  const current = await prisma.academicYear.findFirst({
    where: { isCurrent: true },
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

  // Otherwise fall back to the current session, so a page opened without a
  // ?session= parameter shows the session the school is actually working in
  // and matches what the navbar switcher displays.
  const wanted = requested || available.find((s) => s.isCurrent)?.name;
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
// session that has already closed. Backdating an admission would silently
// change historical roll strength and fee liability, so it is refused rather
// than quietly accepted.
// -------------------------------------------------------------

/** Start year of a session named like "2026-2027". */
function sessionStartYear(name: string): number {
  const match = name.match(/^(\d{4})/);
  return match ? Number(match[1]) : 0;
}

/** Sessions an admission may be recorded in: the current one and later, oldest first. */
export async function listAdmissionSessions(): Promise<SessionOption[]> {
  const all = await listAcademicSessions();
  const active = await getActiveSession();
  if (!active) return all;

  const floor = sessionStartYear(active.name);
  return all
    .filter((s) => sessionStartYear(s.name) >= floor)
    .sort((a, b) => sessionStartYear(a.name) - sessionStartYear(b.name));
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
