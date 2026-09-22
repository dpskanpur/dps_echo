import { prisma } from "@/lib/prisma";
import { getCurrentAcademicSession } from "@/lib/academic-session";
import { headers } from "next/headers";

export interface LogAuditParams {
  userId?: string;
  userEmail: string;
  userName?: string;
  userRole?: string;
  academicSession?: string;
  campusCode?: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: string | Record<string, any>;
}

/**
 * Log a user action or system event to the Audit Trail.
 *
 * Safe non-blocking execution: errors during audit logging will never throw
 * or abort the main application request transaction.
 */
export async function logAuditAction(params: LogAuditParams) {
  try {
    const session = params.academicSession || (await getCurrentAcademicSession());

    let ipAddress: string | undefined;
    try {
      const headerList = await headers();
      ipAddress =
        headerList.get("x-forwarded-for")?.split(",")[0].trim() ||
        headerList.get("x-real-ip") ||
        undefined;
    } catch {
      // Non-request context fallback
    }

    const detailsStr =
      typeof params.details === "object"
        ? JSON.stringify(params.details)
        : params.details;

    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        userEmail: params.userEmail,
        userName: params.userName,
        userRole: params.userRole,
        academicSession: session,
        campusCode: params.campusCode,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        details: detailsStr ? detailsStr.slice(0, 1000) : undefined, // Storage-capped at 1,000 chars
        ipAddress,
      },
    });
  } catch (error) {
    console.error("[AuditLog Error]", error);
  }
}
