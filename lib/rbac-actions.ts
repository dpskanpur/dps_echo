"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser, getUserPermissions, APP_MODULES, AppModuleId, isAllowedDomain } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { logAuditAction } from "@/lib/audit-log";

/**
 * Asserts that the currently logged in user has RBAC admin rights
 */
async function assertRbacAdmin() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthenticated. Please sign in.");
  }
  const perms = await getUserPermissions(user);
  if (!perms.isAdmin && !perms.modules.rbac.canUpdate) {
    throw new Error("Unauthorized. Only administrators can modify access control permissions.");
  }
  return user;
}

/**
 * Update a single module permission for a user
 */
export async function updateUserModulePermission(
  userId: string,
  module: AppModuleId,
  canView: boolean,
  canUpdate: boolean,
  canDelete: boolean
) {
  const admin = await assertRbacAdmin();

  // If canUpdate or canDelete is true, canView must automatically be true
  const effectiveView = canView || canUpdate || canDelete;

  await prisma.userPermission.upsert({
    where: {
      userId_module: { userId, module },
    },
    update: {
      canView: effectiveView,
      canUpdate,
      canDelete,
    },
    create: {
      userId,
      module,
      canView: effectiveView,
      canUpdate,
      canDelete,
    },
  });

  await logAuditAction({
    userId: admin.id,
    userEmail: admin.email,
    userName: admin.name || undefined,
    userRole: admin.role,
    campusCode: admin.campusId || undefined,
    action: "RBAC_UPDATE_PERMISSION",
    entityType: "UserPermission",
    entityId: userId,
    details: { module, canView: effectiveView, canUpdate, canDelete },
  });

  revalidatePath("/admin/rbac");
  revalidatePath("/");
  return { success: true };
}

/**
 * Apply role preset to a user (Full Admin, Fee Specialist, Admissions Specialist, or Clear All)
 */
export async function applyRolePreset(
  userId: string,
  preset: "FULL_ADMIN" | "FEES_SPECIALIST" | "ADMISSIONS_SPECIALIST" | "VIEW_ALL" | "REVOKE_ALL"
) {
  const admin = await assertRbacAdmin();

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  // Determine permissions based on preset
  for (const mod of APP_MODULES) {
    let canView = false;
    let canUpdate = false;
    let canDelete = false;

    if (preset === "FULL_ADMIN") {
      canView = true;
      canUpdate = true;
      canDelete = true;
    } else if (preset === "FEES_SPECIALIST") {
      if (mod.id === "fees") {
        canView = true;
        canUpdate = true;
        canDelete = true;
      } else if (mod.id === "students") {
        canView = true;
      }
    } else if (preset === "ADMISSIONS_SPECIALIST") {
      if (mod.id === "students" || mod.id === "tc" || mod.id === "alumni") {
        canView = true;
        canUpdate = true;
        canDelete = true;
      } else if (mod.id === "fees") {
        canView = true;
      }
    } else if (preset === "VIEW_ALL") {
      canView = true;
    } else if (preset === "REVOKE_ALL") {
      canView = false;
      canUpdate = false;
      canDelete = false;
    }

    await prisma.userPermission.upsert({
      where: {
        userId_module: { userId, module: mod.id },
      },
      update: { canView, canUpdate, canDelete },
      create: { userId, module: mod.id, canView, canUpdate, canDelete },
    });
  }

  // Update role name
  let newRole = user.role;
  if (preset === "FULL_ADMIN") newRole = "SUPER_ADMIN";
  else if (preset === "FEES_SPECIALIST") newRole = "FEES_MANAGER";
  else if (preset === "ADMISSIONS_SPECIALIST") newRole = "ADMISSIONS_MANAGER";
  else if (preset === "VIEW_ALL") newRole = "STAFF_VIEWER";

  await prisma.user.update({
    where: { id: userId },
    data: { role: newRole, status: preset === "REVOKE_ALL" ? "PENDING" : "ACTIVE" },
  });

  await logAuditAction({
    userId: admin.id,
    userEmail: admin.email,
    userName: admin.name || undefined,
    userRole: admin.role,
    campusCode: admin.campusId || undefined,
    action: "RBAC_APPLY_PRESET",
    entityType: "User",
    entityId: userId,
    details: { targetEmail: user.email, preset, newRole },
  });

  revalidatePath("/admin/rbac");
  revalidatePath("/");
  return { success: true };
}

/**
 * Add / Invite a new staff member by @dpskanpur.com email with initial preset and optional campus scope
 */
export async function addUserWithPermissions(
  email: string,
  name: string,
  role: string,
  preset: "FULL_ADMIN" | "FEES_SPECIALIST" | "ADMISSIONS_SPECIALIST" | "VIEW_ALL" | "NONE",
  campusId?: string | null
) {
  const admin = await assertRbacAdmin();

  const cleanEmail = email.trim().toLowerCase();
  if (!isAllowedDomain(cleanEmail)) {
    throw new Error("Invalid domain. User email must end with @dpskanpur.com");
  }

  const targetCampusId = !campusId || campusId === "ALL" ? null : campusId;

  const user = await prisma.user.upsert({
    where: { email: cleanEmail },
    update: {
      name: name.trim() || cleanEmail.split("@")[0],
      role,
      status: preset === "NONE" ? "PENDING" : "ACTIVE",
      campusId: targetCampusId,
    },
    create: {
      email: cleanEmail,
      name: name.trim() || cleanEmail.split("@")[0],
      role,
      status: preset === "NONE" ? "PENDING" : "ACTIVE",
      campusId: targetCampusId,
    },
  });

  if (preset !== "NONE") {
    await applyRolePreset(user.id, preset);
  }

  await logAuditAction({
    userId: admin.id,
    userEmail: admin.email,
    userName: admin.name || undefined,
    userRole: admin.role,
    campusCode: admin.campusId || undefined,
    action: "USER_INVITE",
    entityType: "User",
    entityId: user.id,
    details: { invitedEmail: cleanEmail, role, preset, campusId: targetCampusId },
  });

  revalidatePath("/admin/rbac");
  return { success: true, userId: user.id };
}

/**
 * Assign / Update a user's campus scope dynamically from the RBAC console
 */
export async function updateUserCampusAssignment(userId: string, campusId: string | null) {
  const admin = await assertRbacAdmin();

  const targetCampusId = !campusId || campusId === "ALL" ? null : campusId;

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { campusId: targetCampusId },
    include: { campus: true },
  });

  await logAuditAction({
    userId: admin.id,
    userEmail: admin.email,
    userName: admin.name || undefined,
    userRole: admin.role,
    campusCode: admin.campusId || undefined,
    action: "USER_CAMPUS_ASSIGNMENT_UPDATE",
    entityType: "User",
    entityId: userId,
    details: {
      targetEmail: updatedUser.email,
      assignedCampus: updatedUser.campus ? updatedUser.campus.name : "All Campuses (Unbound)",
    },
  });

  revalidatePath("/admin/rbac");
  revalidatePath("/");
  return { success: true };
}

/**
 * Toggle user status (ACTIVE / SUSPENDED)
 */
export async function toggleUserStatus(userId: string, newStatus: "ACTIVE" | "SUSPENDED") {
  const admin = await assertRbacAdmin();

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { status: newStatus },
  });

  await logAuditAction({
    userId: admin.id,
    userEmail: admin.email,
    userName: admin.name || undefined,
    userRole: admin.role,
    campusCode: admin.campusId || undefined,
    action: newStatus === "SUSPENDED" ? "USER_SUSPEND" : "USER_ACTIVATE",
    entityType: "User",
    entityId: userId,
    details: { targetEmail: updatedUser.email, newStatus },
  });

  revalidatePath("/admin/rbac");
  return { success: true };
}

/**
 * Delete a user and their permissions
 */
export async function deleteUser(userId: string) {
  const admin = await assertRbacAdmin();

  const userToDelete = await prisma.user.findUnique({ where: { id: userId } });

  await prisma.user.delete({
    where: { id: userId },
  });

  await logAuditAction({
    userId: admin.id,
    userEmail: admin.email,
    userName: admin.name || undefined,
    userRole: admin.role,
    campusCode: admin.campusId || undefined,
    action: "USER_DELETE",
    entityType: "User",
    entityId: userId,
    details: { deletedEmail: userToDelete?.email },
  });

  revalidatePath("/admin/rbac");
  return { success: true };
}

/**
 * Approve a pending user request and assign preset permissions
 */
export async function approveUserAccess(
  userId: string,
  preset: "FULL_ADMIN" | "FEES_SPECIALIST" | "ADMISSIONS_SPECIALIST" | "VIEW_ALL"
) {
  const admin = await assertRbacAdmin();
  await applyRolePreset(userId, preset);
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { status: "ACTIVE" },
  });

  await logAuditAction({
    userId: admin.id,
    userEmail: admin.email,
    userName: admin.name || undefined,
    userRole: admin.role,
    campusCode: admin.campusId || undefined,
    action: "USER_APPROVE",
    entityType: "User",
    entityId: userId,
    details: { targetEmail: updatedUser.email, preset },
  });

  revalidatePath("/admin/rbac");
  revalidatePath("/");
  return { success: true };
}

/**
 * Deny and delete a pending user access request
 */
export async function denyAndDeleteUserRequest(userId: string) {
  const admin = await assertRbacAdmin();
  const userToDelete = await prisma.user.findUnique({ where: { id: userId } });
  await prisma.user.delete({
    where: { id: userId },
  });

  await logAuditAction({
    userId: admin.id,
    userEmail: admin.email,
    userName: admin.name || undefined,
    userRole: admin.role,
    campusCode: admin.campusId || undefined,
    action: "USER_DENY",
    entityType: "User",
    entityId: userId,
    details: { deniedEmail: userToDelete?.email },
  });

  revalidatePath("/admin/rbac");
  revalidatePath("/");
  return { success: true };
}
