"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { logAuditAction } from "@/lib/audit-log";

export async function getOnlinePaymentSettings() {
  let settings = await prisma.systemSettings.findUnique({
    where: { id: "global" },
  });
  if (!settings) {
    settings = await prisma.systemSettings.create({
      data: { id: "global" },
    });
  }

  const campuses = await prisma.campus.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
      isOnlinePaymentEnabled: true,
      onlinePaymentDisabledReason: true,
      razorpayKeyId: true,
      razorpayKeySecret: true,
      isSmsEnabled: true,
      smsDisabledReason: true,
      isEmailEnabled: true,
      emailDisabledReason: true,
    },
  });

  return {
    masterIsOnlinePaymentEnabled: settings.isOnlinePaymentEnabled ?? true,
    masterOnlinePaymentDisabledReason: settings.onlinePaymentDisabledReason || "",
    campuses,
  };
}

/** Master Overall Online Payment Toggle */
export async function updateMasterOnlinePaymentAction(formData: FormData): Promise<void> {
  const { user } = await requirePermission("fees", "update");

  const isOnlinePaymentEnabled = formData.get("isOnlinePaymentEnabled") === "true";
  const onlinePaymentDisabledReason = isOnlinePaymentEnabled ? "" : "Disabled";
  const returnUrl = ((formData.get("returnUrl") as string) || "/admin/rbac?tab=system").trim();

  await prisma.systemSettings.upsert({
    where: { id: "global" },
    create: {
      id: "global",
      isOnlinePaymentEnabled,
      onlinePaymentDisabledReason,
    },
    update: {
      isOnlinePaymentEnabled,
      onlinePaymentDisabledReason,
    },
  });

  // If disabled at master level, automatically cascade disablement to all schools
  if (!isOnlinePaymentEnabled) {
    await prisma.campus.updateMany({
      data: {
        isOnlinePaymentEnabled: false,
        onlinePaymentDisabledReason: "Disabled",
      },
    });
  }

  await logAuditAction({
    userId: user.id,
    userEmail: user.email,
    userName: user.name,
    userRole: user.role,
    action: "MASTER_ONLINE_PAYMENT_UPDATE",
    entityType: "SystemSettings",
    entityId: "global",
    details: {
      isOnlinePaymentEnabled,
      onlinePaymentDisabledReason,
      cascadedToCampuses: !isOnlinePaymentEnabled,
    },
  });

  revalidatePath("/admin/rbac");
  revalidatePath("/fees/razorpay");
  revalidatePath("/pay");
  redirect(`${returnUrl}${returnUrl.includes("?") ? "&" : "?"}notice=master_payment_updated`);
}

/** School-Wise / Campus-Wise Online Payment Status Toggle */
export async function updateCampusOnlinePaymentAction(formData: FormData): Promise<void> {
  const { user } = await requirePermission("fees", "update");

  const campusId = ((formData.get("campusId") as string) || "").trim();
  const isOnlinePaymentEnabled = formData.get("isOnlinePaymentEnabled") === "true";
  const onlinePaymentDisabledReason = isOnlinePaymentEnabled ? "" : "Disabled";
  const returnUrl = ((formData.get("returnUrl") as string) || "/admin/rbac?tab=system").trim();

  if (!campusId) {
    throw new Error("Campus ID is required.");
  }

  const updated = await prisma.campus.update({
    where: { id: campusId },
    data: {
      isOnlinePaymentEnabled,
      onlinePaymentDisabledReason,
    },
  });

  await logAuditAction({
    userId: user.id,
    userEmail: user.email,
    userName: user.name,
    userRole: user.role,
    campusCode: updated.code,
    action: "CAMPUS_ONLINE_PAYMENT_UPDATE",
    entityType: "Campus",
    entityId: updated.id,
    details: {
      campusName: updated.name,
      isOnlinePaymentEnabled,
      onlinePaymentDisabledReason,
    },
  });

  revalidatePath("/admin/rbac");
  revalidatePath("/fees/razorpay");
  revalidatePath("/pay");
  redirect(`${returnUrl}${returnUrl.includes("?") ? "&" : "?"}notice=campus_payment_updated&campus=${encodeURIComponent(updated.name)}`);
}

/** School-Wise Razorpay API Key Credentials Only */
export async function updateCampusCredentialsAction(formData: FormData): Promise<void> {
  const { user } = await requirePermission("fees", "update");

  const campusId = ((formData.get("campusId") as string) || "").trim();
  const razorpayKeyId = ((formData.get("razorpayKeyId") as string) || "").trim();
  const razorpayKeySecret = ((formData.get("razorpayKeySecret") as string) || "").trim();

  if (!campusId) {
    throw new Error("Campus ID is required.");
  }

  const updated = await prisma.campus.update({
    where: { id: campusId },
    data: {
      ...(razorpayKeyId ? { razorpayKeyId } : {}),
      ...(razorpayKeySecret ? { razorpayKeySecret } : {}),
    },
  });

  await logAuditAction({
    userId: user.id,
    userEmail: user.email,
    userName: user.name,
    userRole: user.role,
    campusCode: updated.code,
    action: "CAMPUS_RAZORPAY_KEYS_UPDATE",
    entityType: "Campus",
    entityId: updated.id,
    details: {
      campusName: updated.name,
      hasCustomKey: !!updated.razorpayKeyId,
    },
  });

  revalidatePath("/fees/razorpay");
  redirect(`/fees/razorpay?notice=credentials_updated&campus=${encodeURIComponent(updated.name)}`);
}

/** Campus-Wise SMS & Email Toggles */
export async function updateCampusChannelAction(formData: FormData): Promise<void> {
  const { user } = await requirePermission("notifications", "update");

  const campusId = ((formData.get("campusId") as string) || "").trim();
  const isSmsEnabled = formData.get("isSmsEnabled") === "true";
  const smsDisabledReason = isSmsEnabled ? "" : "Disabled";
  const isEmailEnabled = formData.get("isEmailEnabled") === "true";
  const emailDisabledReason = isEmailEnabled ? "" : "Disabled";
  const returnUrl = ((formData.get("returnUrl") as string) || "/admin/rbac?tab=system").trim();

  if (!campusId) {
    throw new Error("Campus ID is required.");
  }

  const updated = await prisma.campus.update({
    where: { id: campusId },
    data: {
      isSmsEnabled,
      smsDisabledReason,
      isEmailEnabled,
      emailDisabledReason,
    },
  });

  await logAuditAction({
    userId: user.id,
    userEmail: user.email,
    userName: user.name,
    userRole: user.role,
    campusCode: updated.code,
    action: "CAMPUS_CHANNEL_UPDATE",
    entityType: "Campus",
    entityId: updated.id,
    details: {
      campusName: updated.name,
      isSmsEnabled,
      smsDisabledReason,
      isEmailEnabled,
      emailDisabledReason,
    },
  });

  revalidatePath("/notifications");
  revalidatePath("/admin/rbac");
  revalidatePath("/fees/razorpay");
  redirect(`${returnUrl}${returnUrl.includes("?") ? "&" : "?"}notice=campus_channel_updated&campus=${encodeURIComponent(updated.name)}`);
}
