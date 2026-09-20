import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  ALLOWED_DOMAIN,
  SESSION_COOKIE_NAME,
  APP_MODULES,
  EMPTY_MODULE_MATRIX,
  AppModuleId,
  ModulePermission,
  SessionUser,
  UserPermissions,
  CampusScope,
  isAllowedDomain,
  deriveRoleFromEmail,
  resolveCampusScope,
  assertCampusAllowed,
  isSuperAdminEmail,
} from "./permissions";
import {
  decodeSessionCookie,
  encodeSessionCookie,
  isSessionIdleExpired,
  sessionCookieOptions,
  toSessionUser,
} from "./session-cookie";

export {
  ALLOWED_DOMAIN,
  SESSION_COOKIE_NAME,
  APP_MODULES,
  isAllowedDomain,
  deriveRoleFromEmail,
  resolveCampusScope,
  assertCampusAllowed,
  isSuperAdminEmail,
};
export type { AppModuleId, ModulePermission, SessionUser, UserPermissions, CampusScope };

function emptyMatrix(): Record<AppModuleId, ModulePermission> {
  return JSON.parse(JSON.stringify(EMPTY_MODULE_MATRIX));
}

function noAccess(roleDisplayName: string): UserPermissions {
  return {
    modules: emptyMatrix(),
    hasAnyAccess: false,
    isAdmin: false,
    canManageStudents: false,
    canManageFees: false,
    isViewOnlyStudents: true,
    isViewOnlyFees: true,
    roleDisplayName,
  };
}

export async function getUserPermissions(user: SessionUser | null): Promise<UserPermissions> {
  if (!user) return noAccess("Unauthenticated");

  // Account state gates everything, including administrators.
  if (user.status === "SUSPENDED") return noAccess("Suspended Account");
  if (user.status !== "ACTIVE") return noAccess("Access Pending Approval");

  // Parents never hold staff module permissions.
  if (user.role === "PARENT") return noAccess("Parent Account");

  const matrix = emptyMatrix();
  const isAdminUser = isSuperAdminEmail(user.email) || user.role === "SUPER_ADMIN";

  // Super Admin gets full wildcard access across all modules
  if (isAdminUser) {
    (Object.keys(matrix) as AppModuleId[]).forEach((mod) => {
      matrix[mod] = { module: mod, canView: true, canUpdate: true, canDelete: true };
    });

    return {
      modules: matrix,
      hasAnyAccess: true,
      isAdmin: true,
      canManageStudents: true,
      canManageFees: true,
      isViewOnlyStudents: false,
      isViewOnlyFees: false,
      roleDisplayName: "Admin",
    };
  }

  // Fetch persisted permissions from DB
  const dbPermissions = await prisma.userPermission.findMany({
    where: { userId: user.id },
  });

  dbPermissions.forEach((p) => {
    const mod = p.module as AppModuleId;
    if (matrix[mod]) {
      matrix[mod] = {
        module: mod,
        canView: p.canView,
        canUpdate: p.canUpdate,
        canDelete: p.canDelete,
      };
    }
  });

  const hasAnyAccess = Object.values(matrix).some((m) => m.canView);

  const canManageStudents = matrix.students.canUpdate;
  const canManageFees = matrix.fees.canUpdate;
  const isViewOnlyStudents = matrix.students.canView && !matrix.students.canUpdate;
  const isViewOnlyFees = matrix.fees.canView && !matrix.fees.canUpdate;

  return {
    modules: matrix,
    hasAnyAccess,
    isAdmin: false,
    canManageStudents,
    canManageFees,
    isViewOnlyStudents,
    isViewOnlyFees,
    roleDisplayName: hasAnyAccess ? (user.role || "Staff Member") : "Access Pending (No Permissions)",
  };
}

/**
 * Resolves the signed-in staff user, or null.
 *
 * Fails closed: a missing, tampered, idle-expired or orphaned session
 * yields null. There is no development fallback identity — anonymous
 * callers are anonymous.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (!sessionCookie?.value) return null;

  try {
    const payload = await decodeSessionCookie(sessionCookie.value);
    if (!payload || isSessionIdleExpired(payload)) return null;

    // The cookie is only a claim; the database is the source of truth for
    // role, campus and status, so a revoked user cannot ride an old cookie.
    const dbUser = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true, email: true, name: true, avatarUrl: true, role: true, status: true, campusId: true },
    });

    if (!dbUser) return null;
    if (dbUser.status === "SUSPENDED") return null;

    return {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      avatarUrl: dbUser.avatarUrl,
      role: dbUser.role,
      status: dbUser.status,
      campusId: dbUser.campusId,
    };
  } catch {
    return null;
  }
}

/** Server-side guard for pages: returns the user or redirects to /login. */
export async function requireUser(redirectTo = "/"): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(redirectTo)}`);
  }
  return user;
}

/**
 * Guard for server actions and route handlers. Throws instead of
 * redirecting so a mutation can never proceed unauthenticated.
 */
export async function requirePermission(
  module: AppModuleId,
  level: "view" | "update" | "delete" = "update"
): Promise<{ user: SessionUser; permissions: UserPermissions }> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Not authenticated. Please sign in again.");
  }

  const permissions = await getUserPermissions(user);
  const mod = permissions.modules[module];
  const allowed =
    level === "view" ? mod.canView : level === "update" ? mod.canUpdate : mod.canDelete;

  if (!allowed) {
    throw new Error(
      `Access denied: your account does not have "${level}" rights on the ${module} module.`
    );
  }

  return { user, permissions };
}

export async function setSessionCookie(user: SessionUser) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, await encodeSessionCookie(user), {
    ...sessionCookieOptions,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function loginOrCreateUser(
  email: string,
  name: string,
  avatarUrl?: string,
  role?: string,
  campusId?: string
): Promise<{ success: boolean; user?: SessionUser; error?: string }> {
  if (!isAllowedDomain(email)) {
    return {
      success: false,
      error: `Access restricted. Only Google Workspace accounts from @${ALLOWED_DOMAIN} are permitted.`,
    };
  }

  const cleanEmail = email.toLowerCase();
  const isAdmin = isSuperAdminEmail(cleanEmail);

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({ where: { email: cleanEmail } });

  const assignedRole = isAdmin ? "SUPER_ADMIN" : (existingUser?.role || role || deriveRoleFromEmail(cleanEmail));
  // New staff land in PENDING and must be granted access from the RBAC console.
  const assignedStatus = isAdmin ? "ACTIVE" : (existingUser?.status || "PENDING");

  // Create or update in database
  const dbUser = await prisma.user.upsert({
    where: { email: cleanEmail },
    update: {
      name,
      avatarUrl: avatarUrl || undefined,
      lastLoginAt: new Date(),
    },
    create: {
      email: cleanEmail,
      name,
      avatarUrl,
      role: assignedRole,
      status: assignedStatus,
      campusId,
      lastLoginAt: new Date(),
    },
  });

  if (dbUser.status === "SUSPENDED") {
    return { success: false, error: "This account has been suspended. Contact the system administrator." };
  }

  // If Admin, ensure initial full permissions are seeded
  if (isAdmin) {
    for (const mod of APP_MODULES) {
      await prisma.userPermission.upsert({
        where: {
          userId_module: { userId: dbUser.id, module: mod.id },
        },
        update: { canView: true, canUpdate: true, canDelete: true },
        create: {
          userId: dbUser.id,
          module: mod.id,
          canView: true,
          canUpdate: true,
          canDelete: true,
        },
      });
    }
  }

  const sessionUser: SessionUser = {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    avatarUrl: dbUser.avatarUrl,
    role: dbUser.role,
    status: dbUser.status,
    campusId: dbUser.campusId,
  };

  await setSessionCookie(sessionUser);

  return {
    success: true,
    user: sessionUser,
  };
}
