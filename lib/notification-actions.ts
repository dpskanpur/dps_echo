"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { assertCampusAllowed, resolveCampusScope } from "@/lib/permissions";
import {
  enqueueNotification,
  dispatchPendingNotifications,
  queueFeeReminder,
  resolveContacts,
} from "@/lib/notifications";

const UNSETTLED = {
  status: { in: ["PENDING", "PARTIALLY_PAID", "OVERDUE"] },
  balanceAmount: { gt: 0 },
};

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function reminderKind(dueDate: Date, today: Date): "FEE_DUE" | "FEE_OVERDUE" {
  return dueDate < today ? "FEE_OVERDUE" : "FEE_DUE";
}

/** Flushes whatever is queued, on demand from the notifications console. */
export async function dispatchQueuedNotifications(): Promise<void> {
  await requirePermission("notifications", "update");
  const result = await dispatchPendingNotifications(500);

  revalidatePath("/notifications");
  redirect(
    `/notifications?notice=dispatched&sent=${result.sent}&failed=${result.failed}&skipped=${result.skipped}`
  );
}

/** Puts failed messages back in the queue for another attempt. */
export async function retryFailedNotifications(): Promise<void> {
  await requirePermission("notifications", "update");

  await prisma.notification.updateMany({
    where: { status: "FAILED" },
    data: { status: "PENDING", attempts: 0, error: null },
  });

  revalidatePath("/notifications");
  redirect("/notifications?notice=requeued");
}

/**
 * Queues an announcement to every guardian of the students in scope.
 *
 * Announcements go to the same resolved contacts as fee reminders, so a
 * parent who cannot receive email still gets the SMS.
 */
export async function sendAnnouncement(formData: FormData): Promise<void> {
  const { user } = await requirePermission("notifications", "update");

  const subject = ((formData.get("subject") as string) || "").trim();
  const message = ((formData.get("message") as string) || "").trim();
  const requestedCampusId = (formData.get("campusId") as string) || "";
  const classId = (formData.get("classId") as string) || "";
  const sendEmail = formData.get("channelEmail") === "on";
  const sendSms = formData.get("channelSms") === "on";

  if (!subject || !message) {
    throw new Error("Both a subject and a message are required.");
  }
  if (!sendEmail && !sendSms) {
    throw new Error("Select at least one channel to send on.");
  }

  // A campus-bound user can only ever address their own campus.
  const scope = resolveCampusScope(user, requestedCampusId || null);
  if (requestedCampusId && requestedCampusId !== "ALL") {
    assertCampusAllowed(user, requestedCampusId);
  }

  const students = await prisma.student.findMany({
    where: {
      status: "ACTIVE",
      ...scope.where,
      ...(classId && classId !== "ALL" ? { classId } : {}),
    },
    select: {
      id: true,
      campusId: true,
      studentEmail: true,
      studentMobile: true,
      guardians: {
        select: { name: true, email: true, phone: true, isPrimary: true, relation: true },
      },
    },
  });

  // One dedupe namespace per announcement, so a double submit cannot
  // message every parent twice.
  const batchKey = `${Date.now().toString(36)}-${subject.slice(0, 24).replace(/\s+/g, "_")}`;

  let queued = 0;
  for (const student of students) {
    const contacts = resolveContacts(student);

    if (sendEmail && contacts.email) {
      const id = await enqueueNotification({
        channel: "EMAIL",
        category: "ANNOUNCEMENT",
        recipient: contacts.email.address,
        recipientName: contacts.email.name,
        subject,
        body: message,
        studentId: student.id,
        campusId: student.campusId,
        dedupeKey: `ANNOUNCEMENT:EMAIL:${batchKey}:${student.id}`,
      });
      if (id) queued++;
    }

    if (sendSms && contacts.sms) {
      const id = await enqueueNotification({
        channel: "SMS",
        category: "ANNOUNCEMENT",
        recipient: contacts.sms.number,
        recipientName: contacts.sms.name,
        subject: null,
        body: `DPS Kanpur: ${subject} — ${message}`.slice(0, 480),
        studentId: student.id,
        campusId: student.campusId,
        dedupeKey: `ANNOUNCEMENT:SMS:${batchKey}:${student.id}`,
      });
      if (id) queued++;
    }
  }

  const result = await dispatchPendingNotifications(500);

  revalidatePath("/notifications");
  redirect(
    `/notifications?notice=announced&queued=${queued}&sent=${result.sent}&failed=${result.failed}&skipped=${result.skipped}`
  );
}

/**
 * Sends one parent a reminder for one unpaid invoice, on every channel that
 * parent can be reached on.
 *
 * Unlike the scheduled job this always goes out: a staff member clicking
 * "Remind" has decided this parent needs chasing now, so the weekly dedupe
 * window is bypassed with a per-send suffix.
 */
export async function sendFeeReminder(formData: FormData): Promise<void> {
  const { user } = await requirePermission("notifications", "update");

  const invoiceId = (formData.get("invoiceId") as string) || "";
  const returnUrl = (formData.get("returnUrl") as string) || "/fees/defaulters";

  const invoice = await prisma.feeInvoice.findUnique({
    where: { id: invoiceId },
    select: { id: true, campusId: true, dueDate: true, balanceAmount: true },
  });

  if (!invoice) throw new Error("Invoice not found.");
  assertCampusAllowed(user, invoice.campusId);

  if (invoice.balanceAmount <= 0) {
    redirect(`${returnUrl}${returnUrl.includes("?") ? "&" : "?"}notice=reminder_settled`);
  }

  const kind = reminderKind(invoice.dueDate, startOfToday());
  const queued = await queueFeeReminder(invoice.id, kind, {
    dedupeSuffix: `manual:${Date.now().toString(36)}`,
  });

  const result = await dispatchPendingNotifications(50);

  revalidatePath("/fees/defaulters");
  revalidatePath("/notifications");
  redirect(
    `${returnUrl}${returnUrl.includes("?") ? "&" : "?"}notice=reminder_sent` +
      `&queued=${queued}&sent=${result.sent}&failed=${result.failed}&skipped=${result.skipped}`
  );
}

/**
 * Reminds the parents of every student with an unpaid invoice in the current
 * campus / session filter.
 *
 * This one keeps the dedupe window. Clicking it twice in an afternoon must
 * not message the same parent twice, so a reminder already queued for an
 * invoice this week is skipped rather than repeated.
 */
export async function sendBulkFeeReminders(formData: FormData): Promise<void> {
  const { user } = await requirePermission("notifications", "update");

  const requestedCampusId = (formData.get("campusId") as string) || "";
  const sessionName = (formData.get("sessionName") as string) || "";
  const returnUrl = (formData.get("returnUrl") as string) || "/fees/defaulters";

  const scope = resolveCampusScope(user, requestedCampusId || null);
  if (requestedCampusId && requestedCampusId !== "ALL") {
    assertCampusAllowed(user, requestedCampusId);
  }

  const invoices = await prisma.feeInvoice.findMany({
    where: {
      ...UNSETTLED,
      ...scope.where,
      ...(sessionName ? { academicYear: { name: sessionName } } : {}),
    },
    select: { id: true, dueDate: true },
    orderBy: { dueDate: "asc" },
    take: 2000,
  });

  const today = startOfToday();
  let queued = 0;
  for (const invoice of invoices) {
    queued += await queueFeeReminder(invoice.id, reminderKind(invoice.dueDate, today));
  }

  const result = await dispatchPendingNotifications(500);

  revalidatePath("/fees/defaulters");
  revalidatePath("/notifications");
  redirect(
    `${returnUrl}${returnUrl.includes("?") ? "&" : "?"}notice=bulk_reminders` +
      `&invoices=${invoices.length}&queued=${queued}` +
      `&sent=${result.sent}&failed=${result.failed}&skipped=${result.skipped}`
  );
}
