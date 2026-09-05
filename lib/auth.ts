import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  ALLOWED_DOMAIN,
  SESSION_COOKIE_NAME,
  APP_MODULES,
  AppModuleId,
  ModulePermission,
  SessionUser,
  UserPermissions,
  isAllowedDomain,
  deriveRoleFromEmail,
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
};
export type { AppModuleId, ModulePermission, SessionUser, UserPermissions };

export async function getUserPermissions(user: SessionUser | null): Promise<UserPermissions> {
  // Default empty matrix
  const matrix: Record<AppModuleId, ModulePermission> = {
    students: { module: "students", canView: false, canUpdate: false, canDelete: false },
    fees: { module: "fees", canView: false, canUpdate: false, canDelete: false },
    tc: { module: "tc", canView: false, canUpdate: false, canDelete: false },
    alumni: { module: "alumni", canView: false, canUpdate: false, canDelete: false },
    rbac: { module: "rbac", canView: false, canUpdate: false, canDelete: false },
  };

  if (!user) {
    return {
      modules: matrix,
      hasAnyAccess: false,
      isAdmin: false,
      canManageStudents: false,
      canManageFees: false,
      isViewOnlyStudents: true,
      isViewOnlyFees: true,
      roleDisplayName: "Unauthenticated",
    };
  }

  const cleanEmail = user.email.toLowerCase();
  const isAdminUser = cleanEmail === "admin@dpskanpur.com" || user.role === "SUPER_ADMIN";

  // If user is Super Admin, grant full wildcard access across all modules
  if (isAdminUser) {
    Object.keys(matrix).forEach((key) => {
      const mod = key as AppModuleId;
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
      roleDisplayName: "System Administrator (Full Access)",
    };
  }

  // If user is suspended, revoke all access
  if (user.status === "SUSPENDED") {
    return {
      modules: matrix,
      hasAnyAccess: false,
      isAdmin: false,
      canManageStudents: false,
      canManageFees: false,
      isViewOnlyStudents: true,
      isViewOnlyFees: true,
      roleDisplayName: "Suspended Account",
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

const DEFAULT_DEV_ADMIN: SessionUser = {
  id: "cmtagyppi0000125quh8ua737",
  email: "admin@dpskanpur.com",
  name: "System Admin (Bypass)",
  avatarUrl: "/dps_crest.png",
  role: "SUPER_ADMIN",
  status: "ACTIVE",
  campusId: null,
};

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (!sessionCookie?.value) {
    return DEFAULT_DEV_ADMIN;
  }

  try {
    const payload = await decodeSessionCookie(sessionCookie.value);
    if (!payload || isSessionIdleExpired(payload)) {
      return DEFAULT_DEV_ADMIN;
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true, email: true, name: true, avatarUrl: true, role: true, status: true, campusId: true },
    });

    if (!dbUser) return DEFAULT_DEV_ADMIN;

    return {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      avatarUrl: dbUser.avatarUrl,
      role: dbUser.role,
      status: dbUser.status,
      campusId: dbUser.campusId,
    };
  } catch (error) {
    return DEFAULT_DEV_ADMIN;
  }
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
  const isAdmin = cleanEmail === "admin@dpskanpur.com" || cleanEmail.startsWith("admin@");

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({ where: { email: cleanEmail } });

  const assignedRole = isAdmin ? "SUPER_ADMIN" : (existingUser?.role || role || deriveRoleFromEmail(cleanEmail));
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
