import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import { httpRequest } from "@/lib/http";

/**
 * Notification dispatch.
 *
 * Messages are persisted first and sent second, so a provider outage never
 * loses a reminder and the admin log always reflects what the school
 * actually attempted. Providers are selected by environment variable; when
 * none is configured the message is recorded and marked SKIPPED rather than
 * silently dropped.
 *
 * Push (FCM/APNs) is deliberately absent until the parent app exists —
 * email and SMS are the channels that reach parents today.
 */

export type NotificationChannel = "EMAIL" | "SMS";
export type NotificationCategory =
  | "FEE_DUE"
  | "FEE_OVERDUE"
  | "PAYMENT_SUCCESS"
  | "ANNOUNCEMENT"
  | "REGISTRATION";

export interface EnqueueInput {
  channel: NotificationChannel;
  category: NotificationCategory;
  recipient: string;
  recipientName?: string | null;
  subject?: string | null;
  body: string;
  studentId?: string | null;
  campusId?: string | null;
  dedupeKey?: string | null;
}

// -------------------------------------------------------------
// Recipient resolution
// -------------------------------------------------------------

export function normalizeIndianMobile(raw?: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `+91${digits.slice(1)}`;
  return null;
}

function isEmail(raw?: string | null): boolean {
  return !!raw && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.trim());
}

interface StudentContacts {
  email: { address: string; name: string } | null;
  sms: { number: string; name: string } | null;
}

interface StudentWithGuardians {
  studentEmail?: string | null;
  studentMobile?: string | null;
  guardians: Array<{
    name: string;
    email?: string | null;
    phone?: string | null;
    isPrimary: boolean;
    relation: string;
  }>;
}

/** Primary guardian first, then any guardian, then the student's own contact. */
export function resolveContacts(student: StudentWithGuardians): StudentContacts {
  const ordered = [...(student.guardians || [])].sort((a, b) => {
    if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
    const rank = (r: string) => (r === "FATHER" ? 0 : r === "MOTHER" ? 1 : 2);
    return rank(a.relation) - rank(b.relation);
  });

  let email: StudentContacts["email"] = null;
  let sms: StudentContacts["sms"] = null;

  for (const g of ordered) {
    if (!email && isEmail(g.email)) email = { address: g.email!.trim(), name: g.name };
    const mobile = normalizeIndianMobile(g.phone);
    if (!sms && mobile) sms = { number: mobile, name: g.name };
  }

  if (!email && isEmail(student.studentEmail)) {
    email = { address: student.studentEmail!.trim(), name: "Student" };
  }
  const studentMobile = normalizeIndianMobile(student.studentMobile);
  if (!sms && studentMobile) sms = { number: studentMobile, name: "Student" };

  return { email, sms };
}

// -------------------------------------------------------------
// Queueing
// -------------------------------------------------------------

export async function enqueueNotification(input: EnqueueInput): Promise<string | null> {
  try {
    const created = await prisma.notification.create({
      data: {
        channel: input.channel,
        category: input.category,
        recipient: input.recipient,
        recipientName: input.recipientName || null,
        subject: input.subject || null,
        body: input.body,
        studentId: input.studentId || null,
        campusId: input.campusId || null,
        dedupeKey: input.dedupeKey || null,
        status: "PENDING",
      },
      select: { id: true },
    });
    return created.id;
  } catch (err: any) {
    // A duplicate dedupeKey means this reminder was already queued — that is
    // the mechanism working, not a failure.
    if (err?.code === "P2002") return null;
    throw err;
  }
}

function isoWeekStamp(d: Date): string {
  const copy = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = copy.getUTCDay() || 7;
  copy.setUTCDate(copy.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(copy.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((copy.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${copy.getUTCFullYear()}W${String(week).padStart(2, "0")}`;
}

/**
 * Queues a due / overdue reminder for one invoice on every channel we can
 * reach. Returns how many messages were newly queued.
 */
export async function queueFeeReminder(
  invoiceId: string,
  kind: "FEE_DUE" | "FEE_OVERDUE",
  options: { dedupeSuffix?: string } = {}
): Promise<number> {
  const invoice = await prisma.feeInvoice.findUnique({
    where: { id: invoiceId },
    include: {
      campus: { select: { id: true, name: true, phone: true } },
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          scholarNo: true,
          studentEmail: true,
          studentMobile: true,
          guardians: {
            select: { name: true, email: true, phone: true, isPrimary: true, relation: true },
          },
        },
      },
    },
  });

  if (!invoice || invoice.balanceAmount <= 0) return 0;

  const student = invoice.student;
  const contacts = resolveContacts(student);
  const childName = `${student.firstName} ${student.lastName}`.trim();
  const amount = formatCurrency(invoice.balanceAmount);
  const due = formatDate(invoice.dueDate);
  const payUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://echo.dpskanpur.com"}/pay`;

  const overdue = kind === "FEE_OVERDUE";

  // The stamp is what stops the scheduled job messaging the same parent twice
  // for one invoice: weekly while overdue, once per due date otherwise. A
  // staff member sending a reminder by hand passes a suffix so their send is
  // never silently swallowed by that window.
  const baseStamp = overdue ? isoWeekStamp(new Date()) : invoice.dueDate.toISOString().slice(0, 10);
  const stamp = options.dedupeSuffix ? `${baseStamp}:${options.dedupeSuffix}` : baseStamp;

  const subject = overdue
    ? `Overdue school fees for ${childName} — ${invoice.invoiceNo}`
    : `School fees due for ${childName} — ${invoice.invoiceNo}`;

  const emailBody = [
    `Dear Parent / Guardian,`,
    ``,
    overdue
      ? `The fee payment for ${childName} (Scholar No. ${student.scholarNo}) is overdue.`
      : `This is a reminder that the fee payment for ${childName} (Scholar No. ${student.scholarNo}) is due shortly.`,
    ``,
    `Invoice     : ${invoice.invoiceNo}`,
    `Period      : ${invoice.periodName}`,
    `Amount due  : ${amount}`,
    `Due date    : ${due}`,
    ``,
    `You can pay online using the student's Scholar Number and date of birth at:`,
    payUrl,
    ``,
    `If you have already paid, kindly ignore this message.`,
    ``,
    `${invoice.campus.name}`,
    invoice.campus.phone ? `Accounts Office: ${invoice.campus.phone}` : ``,
  ]
    .filter(Boolean)
    .join("\n");

  const smsBody = overdue
    ? `DPS Kanpur: Fees of ${amount} for ${childName} (${student.scholarNo}) are OVERDUE (due ${due}). Pay at ${payUrl}`
    : `DPS Kanpur: Fees of ${amount} for ${childName} (${student.scholarNo}) are due by ${due}. Pay at ${payUrl}`;

  let queued = 0;

  if (contacts.email) {
    const id = await enqueueNotification({
      channel: "EMAIL",
      category: kind,
      recipient: contacts.email.address,
      recipientName: contacts.email.name,
      subject,
      body: emailBody,
      studentId: student.id,
      campusId: invoice.campusId,
      dedupeKey: `${kind}:EMAIL:${invoice.id}:${stamp}`,
    });
    if (id) queued++;
  }

  if (contacts.sms) {
    const id = await enqueueNotification({
      channel: "SMS",
      category: kind,
      recipient: contacts.sms.number,
      recipientName: contacts.sms.name,
      subject: null,
      body: smsBody,
      studentId: student.id,
      campusId: invoice.campusId,
      dedupeKey: `${kind}:SMS:${invoice.id}:${stamp}`,
    });
    if (id) queued++;
  }

  return queued;
}

/** Payment confirmation, queued after a counter receipt or a verified capture. */
export async function queuePaymentReceiptNotification(paymentId: string): Promise<number> {
  const payment = await prisma.feePayment.findUnique({
    where: { id: paymentId },
    include: {
      invoice: {
        include: { campus: { select: { id: true, name: true } } },
      },
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          scholarNo: true,
          studentEmail: true,
          studentMobile: true,
          guardians: {
            select: { name: true, email: true, phone: true, isPrimary: true, relation: true },
          },
        },
      },
    },
  });

  if (!payment) return 0;

  const student = payment.student;
  const contacts = resolveContacts(student);
  const childName = `${student.firstName} ${student.lastName}`.trim();
  const amount = formatCurrency(payment.amountPaid);
  const balance = payment.invoice.balanceAmount;

  const subject = `Payment received — receipt ${payment.receiptNo}`;
  const emailBody = [
    `Dear Parent / Guardian,`,
    ``,
    `We have received a fee payment for ${childName} (Scholar No. ${student.scholarNo}).`,
    ``,
    `Receipt No. : ${payment.receiptNo}`,
    `Invoice     : ${payment.invoice.invoiceNo}`,
    `Amount paid : ${amount}`,
    `Mode        : ${payment.paymentMode.replace(/_/g, " ")}`,
    `Date        : ${formatDate(payment.paymentDate)}`,
    balance > 0 ? `Balance due : ${formatCurrency(balance)}` : `Status      : Paid in full. Thank you.`,
    ``,
    `${payment.invoice.campus.name}`,
  ].join("\n");

  const smsBody =
    `DPS Kanpur: Received ${amount} for ${childName} (${student.scholarNo}). Receipt ${payment.receiptNo}.` +
    (balance > 0 ? ` Balance ${formatCurrency(balance)}.` : ` Paid in full. Thank you.`);

  let queued = 0;

  if (contacts.email) {
    const id = await enqueueNotification({
      channel: "EMAIL",
      category: "PAYMENT_SUCCESS",
      recipient: contacts.email.address,
      recipientName: contacts.email.name,
      subject,
      body: emailBody,
      studentId: student.id,
      campusId: payment.invoice.campusId,
      dedupeKey: `PAYMENT_SUCCESS:EMAIL:${payment.id}`,
    });
    if (id) queued++;
  }

  if (contacts.sms) {
    const id = await enqueueNotification({
      channel: "SMS",
      category: "PAYMENT_SUCCESS",
      recipient: contacts.sms.number,
      recipientName: contacts.sms.name,
      subject: null,
      body: smsBody,
      studentId: student.id,
      campusId: payment.invoice.campusId,
      dedupeKey: `PAYMENT_SUCCESS:SMS:${payment.id}`,
    });
    if (id) queued++;
  }

  return queued;
}

// -------------------------------------------------------------
// Providers
// -------------------------------------------------------------

interface SendOutcome {
  ok: boolean;
  provider: string;
  providerRef?: string;
  error?: string;
  skipped?: boolean;
}

async function sendEmail(to: string, subject: string, body: string): Promise<SendOutcome> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFY_EMAIL_FROM;

  if (!apiKey || !from) {
    return { ok: false, skipped: true, provider: "CONSOLE", error: "Email provider not configured." };
  }

  try {
    const res = await httpRequest("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [to], subject, text: body }),
    });

    const json: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, provider: "RESEND", error: json?.message || `HTTP ${res.status}` };
    }
    return { ok: true, provider: "RESEND", providerRef: json?.id };
  } catch (err: any) {
    return { ok: false, provider: "RESEND", error: err?.message || "Network error" };
  }
}

async function sendSms(to: string, body: string): Promise<SendOutcome> {
  const authKey = process.env.MSG91_AUTH_KEY;
  const senderId = process.env.MSG91_SENDER_ID;

  if (!authKey || !senderId) {
    return { ok: false, skipped: true, provider: "CONSOLE", error: "SMS provider not configured." };
  }

  try {
    const res = await httpRequest("https://api.msg91.com/api/v2/sendsms", {
      method: "POST",
      headers: { authkey: authKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        sender: senderId,
        route: "4",
        country: "91",
        sms: [{ message: body, to: [to.replace("+", "")] }],
      }),
    });

    const json: any = await res.json().catch(() => ({}));
    if (!res.ok || json?.type === "error") {
      return { ok: false, provider: "MSG91", error: json?.message || `HTTP ${res.status}` };
    }
    return { ok: true, provider: "MSG91", providerRef: json?.message };
  } catch (err: any) {
    return { ok: false, provider: "MSG91", error: err?.message || "Network error" };
  }
}

/**
 * Sends queued messages. Safe to call repeatedly: only PENDING rows are
 * claimed, and each row records its own outcome.
 */
export async function dispatchPendingNotifications(limit = 100): Promise<{
  sent: number;
  failed: number;
  skipped: number;
}> {
  const pending = await prisma.notification.findMany({
    where: { status: "PENDING", attempts: { lt: 3 } },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const n of pending) {
    const outcome =
      n.channel === "EMAIL"
        ? await sendEmail(n.recipient, n.subject || "DPS Kanpur", n.body)
        : await sendSms(n.recipient, n.body);

    if (outcome.skipped) {
      skipped++;
      console.warn(`[notifications] ${n.channel} not configured — ${n.category} to ${n.recipient}`);
    } else if (outcome.ok) {
      sent++;
    } else {
      failed++;
    }

    await prisma.notification.update({
      where: { id: n.id },
      data: {
        status: outcome.skipped ? "SKIPPED" : outcome.ok ? "SENT" : "FAILED",
        provider: outcome.provider,
        providerRef: outcome.providerRef || null,
        error: outcome.error || null,
        attempts: { increment: 1 },
        sentAt: outcome.ok ? new Date() : null,
      },
    });
  }

  return { sent, failed, skipped };
}

/** Which channels are actually wired up, for the admin console banner. */
export function getProviderStatus(): { email: boolean; sms: boolean } {
  return {
    email: !!(process.env.RESEND_API_KEY && process.env.NOTIFY_EMAIL_FROM),
    sms: !!(process.env.MSG91_AUTH_KEY && process.env.MSG91_SENDER_ID),
  };
}
