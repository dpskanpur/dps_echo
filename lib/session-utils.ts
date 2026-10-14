/**
 * Pure client-safe utilities for CBSE Academic Sessions (April 1 to March 31).
 */

export type SessionTemporalCategory = "CURRENT" | "UPCOMING" | "FUTURE" | "PAST";

/**
 * Returns the 4-digit start year of the ongoing CBSE academic calendar (April 1 to March 31).
 * In April-December of year Y, start year is Y.
 * In January-March of year Y+1, start year is Y.
 */
export function getCurrentAcademicStartYear(): number {
  const now = new Date();
  const calYear = now.getFullYear();
  return now.getMonth() >= 3 ? calYear : calYear - 1;
}

/**
 * Categorizes an academic session strictly based on calendar date:
 * - CURRENT: Exactly one session spanning today's date (e.g. 2026-2027)
 * - UPCOMING: Immediate next year for advance admissions (e.g. 2027-2028)
 * - FUTURE: Sessions beyond next year (e.g. 2028-2029+)
 * - PAST: Elapsed sessions (e.g. 2025-2026-)
 */
export function getSessionCategory(sessionName: string): SessionTemporalCategory {
  const match = sessionName.match(/^(\d{4})/);
  if (!match) return "PAST";
  const startYear = parseInt(match[1], 10);
  const currentStart = getCurrentAcademicStartYear();

  if (startYear === currentStart) return "CURRENT";
  if (startYear === currentStart + 1) return "UPCOMING";
  if (startYear > currentStart + 1) return "FUTURE";
  return "PAST";
}
