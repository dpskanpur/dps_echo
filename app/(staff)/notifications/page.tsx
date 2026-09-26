import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";
import { formatDateTime } from "@/lib/utils";
import { getCurrentUser, getUserPermissions } from "@/lib/auth";
import { resolveCampusScope } from "@/lib/permissions";
import { getProviderStatus } from "@/lib/notifications";
import {
  dispatchQueuedNotifications,
  retryFailedNotifications,
  sendAnnouncement,
} from "@/lib/notification-actions";
import {
  Bell,
  Send,
  RefreshCw,
  Mail,
  MessageSquare,
  CheckCircle2,
  Clock,
  AlertTriangle,
  MinusCircle,
  Megaphone,
} from "lucide-react";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  SENT: "bg-emerald-100 text-emerald-800 border-emerald-200",
  PENDING: "bg-amber-100 text-amber-800 border-amber-200",
  FAILED: "bg-rose-100 text-rose-800 border-rose-200",
  SKIPPED: "bg-slate-100 text-slate-600 border-slate-200",
};

const CATEGORY_LABELS: Record<string, string> = {
  FEE_DUE: "Fee Due",
  FEE_OVERDUE: "Fee Overdue",
  PAYMENT_SUCCESS: "Payment Receipt",
  ANNOUNCEMENT: "Announcement",
  REGISTRATION: "Registration",
};

import { SmsBalanceCard } from "@/components/SmsBalanceCard";
import { SmsAnnouncementComposer } from "@/components/SmsAnnouncementComposer";
import { DeliveryStatusBadge } from "@/components/DeliveryStatusBadge";

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    campus?: string;
    status?: string;
    category?: string;
    notice?: string;
    sent?: string;
    failed?: string;
    skipped?: string;
    queued?: string;
  }>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const permissions = await getUserPermissions(user);

  if (!permissions.modules.notifications.canView && !permissions.isAdmin) {
    redirect("/?error=unauthorized_notifications");
  }

  const canSend = permissions.modules.notifications.canUpdate || permissions.isAdmin;
  const scope = resolveCampusScope(user, params.campus);
  const providers = getProviderStatus();

  const campuses = await prisma.campus.findMany({
    where: scope.locked ? { id: scope.campusId! } : {},
    orderBy: { name: "asc" },
  });

  const classes = await prisma.class.findMany({
    where: scope.where,
    orderBy: { sequence: "asc" },
    select: { id: true, name: true },
  });

  const listFilter = {
    ...scope.where,
    ...(params.status && params.status !== "ALL" ? { status: params.status } : {}),
    ...(params.category && params.category !== "ALL" ? { category: params.category } : {}),
  };

  const [notifications, counts] = await Promise.all([
    prisma.notification.findMany({
      where: listFilter,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        student: { select: { firstName: true, lastName: true, scholarNo: true } },
        campus: { select: { name: true } },
      },
    }),
    prisma.notification.groupBy({
      by: ["status"],
      where: scope.where,
      _count: { _all: true },
    }),
  ]);

  const countFor = (status: string) =>
    counts.find((c) => c.status === status)?._count._all ?? 0;

  const tiles = [
    { label: "Sent / Delivered", value: countFor("SENT") + countFor("DELIVERED"), icon: CheckCircle2, tone: "text-emerald-700", bg: "bg-emerald-50 border-emerald-100" },
    { label: "Queued", value: countFor("PENDING"), icon: Clock, tone: "text-amber-700", bg: "bg-amber-50 border-amber-100" },
    { label: "Failed", value: countFor("FAILED") + countFor("UNDELIVERED"), icon: AlertTriangle, tone: "text-rose-700", bg: "bg-rose-50 border-rose-100" },
    { label: "Skipped", value: countFor("SKIPPED"), icon: MinusCircle, tone: "text-slate-600", bg: "bg-slate-50 border-slate-200" },
  ];

  return (
    <main className="p-8 space-y-6 flex-1 overflow-y-auto max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#0F9D58]" />
            <h1 className="text-xl font-black text-slate-900">Notifications Console</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Transaction SMS Gateway, DLT Template Dispatch &amp; Parent Delivery Reports.
          </p>
        </div>

        {canSend && (
          <div className="flex items-center gap-2">
            <form action={retryFailedNotifications}>
              <button
                type="submit"
                className="flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Retry Failed
              </button>
            </form>
            <form action={dispatchQueuedNotifications}>
              <button
                type="submit"
                className="flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg bg-[#0F9D58] text-white hover:bg-emerald-700 transition shadow-sm"
              >
                <Send className="w-3.5 h-3.5" /> Send Queued Now
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Live SMS Gateway Balance Card */}
      <SmsBalanceCard />

      {/* Result notice */}
      {params.notice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-medium">
          {params.notice === "announced" && (
            <span>
              Announcement queued for <strong>{params.queued || 0}</strong> recipients —{" "}
              {params.sent || 0} sent, {params.failed || 0} failed, {params.skipped || 0} skipped.
            </span>
          )}
          {params.notice === "dispatched" && (
            <span>
              Queue flushed — {params.sent || 0} sent, {params.failed || 0} failed,{" "}
              {params.skipped || 0} skipped.
            </span>
          )}
          {params.notice === "requeued" && <span>Failed messages put back in queue.</span>}
        </div>
      )}

      {/* Provider configuration warning if unconfigured */}
      {(!providers.email || !providers.sms) && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900">
            <strong className="block font-bold">
              {!providers.email && !providers.sms
                ? "No delivery channel is configured"
                : `${!providers.email ? "Email" : "SMS"} delivery is not configured`}
            </strong>
            <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
              Messages are recorded and marked <strong>Skipped</strong>. Set{" "}
              {!providers.sms && <code className="font-mono">SMS_USERNAME + SMS_PASSWORD</code>}{" "}
              in <code className="font-mono">.env</code> to deliver live SMS messages.
            </p>
          </div>
        </div>
      )}

      {/* Stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {tiles.map((tile) => (
          <div key={tile.label} className={`rounded-2xl border p-4 ${tile.bg}`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {tile.label}
              </span>
              <tile.icon className={`w-4 h-4 ${tile.tone}`} />
            </div>
            <div className={`text-2xl font-black mt-1 ${tile.tone}`}>{tile.value}</div>
          </div>
        ))}
      </div>

      {/* Announcement composer with Live SMS Credit Estimator */}
      {canSend && (
        <SmsAnnouncementComposer
          campuses={campuses}
          classes={classes}
          scopeCampusId={scope.campusId}
          lockedCampus={scope.locked}
        />
      )}

      {/* Filters */}
      <form method="GET" className="flex flex-wrap items-end gap-3">
        {scope.campusId && <input type="hidden" name="campus" value={scope.campusId} />}
        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1">Status</label>
          <select
            name="status"
            defaultValue={params.status || "ALL"}
            className="bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-800"
          >
            <option value="ALL">All Statuses</option>
            <option value="DELIVERED">Delivered (✓✓)</option>
            <option value="SENT">Sent (✓)</option>
            <option value="PENDING">Queued</option>
            <option value="FAILED">Failed / Undelivered (✗)</option>
            <option value="SKIPPED">Skipped</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1">Type</label>
          <select
            name="category"
            defaultValue={params.category || "ALL"}
            className="bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-800"
          >
            <option value="ALL">All Types</option>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="px-3 py-2 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition"
        >
          Apply Filters
        </button>
      </form>

      {/* Log table with Single / Double Tick Delivery Badges */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <th className="p-3">When</th>
              <th className="p-3">Type</th>
              <th className="p-3">Channel</th>
              <th className="p-3">Recipient</th>
              <th className="p-3">Student</th>
              <th className="p-3">Delivery Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-12 text-center text-slate-400">
                  No notifications recorded yet.
                </td>
              </tr>
            ) : (
              notifications.map((n) => (
                <tr key={n.id} className="hover:bg-slate-50/60">
                  <td className="p-3 text-slate-500 whitespace-nowrap">
                    {formatDateTime(n.createdAt)}
                  </td>
                  <td className="p-3 font-semibold text-slate-800">
                    {CATEGORY_LABELS[n.category] || n.category}
                  </td>
                  <td className="p-3">
                    <span className="inline-flex items-center gap-1.5 text-slate-600 font-semibold">
                      {n.channel === "EMAIL" ? (
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                      ) : (
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                      )}
                      {n.channel}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-[11px] text-slate-700 max-w-[200px] truncate">
                    {n.recipient}
                  </td>
                  <td className="p-3 text-slate-600 font-medium">
                    {n.student
                      ? `${n.student.firstName} ${n.student.lastName}`
                      : "—"}
                  </td>
                  <td className="p-3">
                    <DeliveryStatusBadge
                      status={n.status}
                      channel={n.channel}
                      error={n.error}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
