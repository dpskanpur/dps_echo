import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { queueFeeReminder, dispatchPendingNotifications } from "@/lib/notifications";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Scheduled fee reminder job.
 *
 * Invoked by Cloud Scheduler with the shared secret:
 *   curl -X POST https://echo.dpskanpur.com/api/cron/fee-reminders \
 *        -H "x-cron-secret: $CRON_SECRET"
 *
 * Marks past-due invoices OVERDUE, queues due/overdue reminders on every
 * channel a parent can be reached on, then flushes the queue. Re-running it
 * on the same day is harmless: the dedupe key stops a parent being messaged
 * twice for the same invoice in the same window.
 */

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const provided = request.headers.get("x-cron-secret") || "";
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

async function run(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized. A valid x-cron-secret header is required." },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const dueWindowDays = Math.min(parseInt(searchParams.get("dueInDays") || "7", 10) || 7, 45);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const windowEnd = new Date(today);
  windowEnd.setDate(windowEnd.getDate() + dueWindowDays);

  const unsettled = { status: { in: ["PENDING", "PARTIALLY_PAID", "OVERDUE"] }, balanceAmount: { gt: 0 } };

  // 1. Flip anything past its due date to OVERDUE so the dashboards agree
  //    with what parents are being told.
  const flipped = await prisma.feeInvoice.updateMany({
    where: {
      balanceAmount: { gt: 0 },
      dueDate: { lt: today },
      status: { in: ["PENDING", "PARTIALLY_PAID"] },
    },
    data: { status: "OVERDUE" },
  });

  // 2. Upcoming dues
  const upcoming = await prisma.feeInvoice.findMany({
    where: { ...unsettled, dueDate: { gte: today, lte: windowEnd } },
    select: { id: true },
  });

  // 3. Already overdue
  const overdue = await prisma.feeInvoice.findMany({
    where: { ...unsettled, dueDate: { lt: today } },
    select: { id: true },
    take: 2000,
  });

  let queued = 0;
  for (const inv of upcoming) queued += await queueFeeReminder(inv.id, "FEE_DUE");
  for (const inv of overdue) queued += await queueFeeReminder(inv.id, "FEE_OVERDUE");

  // 4. Flush the queue
  const dispatch = await dispatchPendingNotifications(500);

  return NextResponse.json({
    success: true,
    ranAt: now.toISOString(),
    markedOverdue: flipped.count,
    invoicesDueSoon: upcoming.length,
    invoicesOverdue: overdue.length,
    messagesQueued: queued,
    dispatch,
  });
}

export async function POST(request: Request) {
  return run(request);
}

// Cloud Scheduler can be configured for either verb.
export async function GET(request: Request) {
  return run(request);
}
