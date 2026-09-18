export const ALLOWED_DOMAIN = "dpskanpur.com";
export const SESSION_COOKIE_NAME = "dps_echo_session";
export const IDLE_TIMEOUT_MS = 10 * 60 * 1000;
export const SESSION_MAX_AGE_SECONDS = 10 * 60;
export const IDLE_WARNING_MS = 2 * 60 * 1000;

export const APP_MODULES = [
  { id: "students", label: "Student Management", description: "Student Directory, Admissions, Profile Dossier" },
  { id: "fees", label: "Fee & Finance", description: "Fee Collection Desk, Structures, Invoices, Daily Cash Register" },
  { id: "tc", label: "Transfer Certificate (TC)", description: "No-Dues Verification, CBSE TC Issuance & Clearance" },
  { id: "alumni", label: "Alumni Archive", description: "Graduated Students & Alumni Records" },
  { id: "notifications", label: "Notifications", description: "Fee Reminders, Payment Receipts & Announcement Dispatch Log" },
  { id: "rbac", label: "RBAC & User Access", description: "Role & Permission Management for Staff & Faculty" },
] as const;

export type AppModuleId = typeof APP_MODULES[number]["id"];

export const EMPTY_MODULE_MATRIX: Record<AppModuleId, ModulePermission> = {
  students: { module: "students", canView: false, canUpdate: false, canDelete: false },
  fees: { module: "fees", canView: false, canUpdate: false, canDelete: false },
  tc: { module: "tc", canView: false, canUpdate: false, canDelete: false },
  alumni: { module: "alumni", canView: false, canUpdate: false, canDelete: false },
  notifications: { module: "notifications", canView: false, canUpdate: false, canDelete: false },
  rbac: { module: "rbac", canView: false, canUpdate: false, canDelete: false },
};

export interface ModulePermission {
  module: AppModuleId;
  canView: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  role: string;
  status: string;
  campusId?: string | null;
}

export interface UserPermissions {
  modules: Record<AppModuleId, ModulePermission>;
  hasAnyAccess: boolean;
  isAdmin: boolean;
  canManageStudents: boolean;
  canManageFees: boolean;
  isViewOnlyStudents: boolean;
  isViewOnlyFees: boolean;
  roleDisplayName: string;
}

/**
 * Emails treated as platform Super Admin.
 *
 * `admin@dpskanpur.com` is the built-in account. BOOTSTRAP_ADMIN_EMAIL lets a
 * deployment nominate a real person as the first administrator — without it,
 * a Workspace that has no `admin@` mailbox could never grant anyone access
 * now that the development bypass is gone.
 */
export function isSuperAdminEmail(email: string): boolean {
  const clean = (email || "").trim().toLowerCase();
  if (!clean) return false;
  if (clean === "admin@dpskanpur.com") return true;

  const bootstrap = (process.env.BOOTSTRAP_ADMIN_EMAIL || "").trim().toLowerCase();
  return !!bootstrap && bootstrap === clean && isAllowedDomain(clean);
}

export function isAllowedDomain(email: string): boolean {
  if (!email) return false;
  const parts = email.trim().toLowerCase().split("@");
  return parts.length === 2 && parts[1] === ALLOWED_DOMAIN;
}

export function deriveRoleFromEmail(email: string, defaultRole = "STAFF"): string {
  const prefix = email.split("@")[0].toLowerCase();
  if (prefix === "admin" || prefix.includes("superadmin")) return "SUPER_ADMIN";
  if (prefix.includes("principal")) return "PRINCIPAL";
  if (prefix.includes("fee") || prefix.includes("account") || prefix.includes("cashier")) return "FEES_MANAGER";
  if (prefix.includes("admission") || prefix.includes("record") || prefix.includes("tc")) return "ADMISSIONS_MANAGER";
  return defaultRole;
}

// -------------------------------------------------------------
// Campus Scoping (tenant isolation)
//
// A user carrying a campusId is bound to that campus: the campus
// picker becomes a fixed label and any ?campus= query value is
// ignored. Only unbound Super Admins may look across campuses.
// -------------------------------------------------------------

export interface CampusScope {
  /** Prisma `where` fragment to spread into any campus-owned query. */
  where: { campusId?: string };
  /** The campus actually in effect, or null when viewing all campuses. */
  campusId: string | null;
  /** True when the user cannot change campus. */
  locked: boolean;
}

export function resolveCampusScope(
  user: Pick<SessionUser, "campusId" | "role"> | null,
  requestedCampusId?: string | null
): CampusScope {
  // A campus-bound user is always pinned to their own campus.
  if (user?.campusId) {
    return { where: { campusId: user.campusId }, campusId: user.campusId, locked: true };
  }

  if (requestedCampusId && requestedCampusId !== "ALL") {
    return { where: { campusId: requestedCampusId }, campusId: requestedCampusId, locked: false };
  }

  return { where: {}, campusId: null, locked: false };
}

/** Guards a write against a campus the user is not allowed to touch. */
export function assertCampusAllowed(
  user: Pick<SessionUser, "campusId" | "role"> | null,
  targetCampusId: string | null | undefined
): void {
  if (!user) throw new Error("Not authenticated.");
  if (!user.campusId) return; // unbound admin
  if (targetCampusId && targetCampusId !== user.campusId) {
    throw new Error("You do not have access to records belonging to another campus.");
  }
}
