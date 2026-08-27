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
  { id: "rbac", label: "RBAC & User Access", description: "Role & Permission Management for Staff & Faculty" },
] as const;

export type AppModuleId = typeof APP_MODULES[number]["id"];

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
