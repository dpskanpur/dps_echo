import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { getSMSDeliveryStatus } from "@/lib/sms";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // Allowed in dev / internal calls if secret unconfigured

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

  // Find recent SMS notifications with SENT status that have a providerRef (msgid)
  const pendingStatusChecks = await prisma.notification.findMany({
    where: {
      channel: "SMS",
      status: "SENT",
      providerRef: { not: null },
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  let updatedDelivered = 0;
  let updatedFailed = 0;
  let unchecked = 0;

  for (const n of pendingStatusChecks) {
    if (!n.providerRef) continue;

    const report = await getSMSDeliveryStatus(n.providerRef);

    if (report.success && report.status === "DELIVERED") {
      await prisma.notification.update({
        where: { id: n.id },
        data: {
          status: "DELIVERED",
          updatedAt: new Date(),
        },
      });
      updatedDelivered++;
    } else if (report.success && report.status === "UNDELIVERED") {
      await prisma.notification.update({
        where: { id: n.id },
        data: {
          status: "FAILED",
          error: "Handset delivery failed (UNDELIV)",
          updatedAt: new Date(),
        },
      });
      updatedFailed++;
    } else {
      unchecked++;
    }
  }

  return NextResponse.json({
    success: true,
    checked: pendingStatusChecks.length,
    updatedDelivered,
    updatedFailed,
    pending: unchecked,
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: Request) {
  return run(request);
}

export async function GET(request: Request) {
  return run(request);
}
