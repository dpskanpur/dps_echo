import { prisma } from "@/lib/prisma";
import { listAcademicSessions, resolveSessionScope } from "@/lib/academic-session";
import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getCurrentUser, getUserPermissions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AlertTriangle, Phone, MessageSquare, Send, CheckCircle2, Info } from "lucide-react";
import { getProviderStatus } from "@/lib/notifications";
import { sendFeeReminder, sendBulkFeeReminders } from "@/lib/notification-actions";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DefaultersPage({
  searchParams,
}: {
  searchParams: Promise<{
    campus?: string;
    session?: string;
    notice?: string;
    queued?: string;
    sent?: string;
    failed?: string;
    skipped?: string;
    invoices?: string;
  }>;
}) {
  const { campus: campusId, session, notice, queued, sent, failed, skipped } = await searchParams;
  const user = await getCurrentUser();
  const permissions = await getUserPermissions(user);

  if (!permissions.modules.fees.canView && !permissions.isAdmin) {
    redirect("/?error=unauthorized_fees");
  }

  const campuses = await prisma.campus.findMany({ orderBy: { name: "asc" } });

  // Invoices reference AcademicYear, so the session filter goes via the relation.
  const invoiceScope = resolveSessionScope(session, await listAcademicSessions());
  const sessionFilter = invoiceScope.name
    ? { academicYear: { name: invoiceScope.name } }
    : {};

  const defaulters = await prisma.feeInvoice.findMany({
    where: {
      status: { in: ["OVERDUE", "PENDING", "PARTIALLY_PAID"] },
      balanceAmount: { gt: 0 },
      ...(campusId && campusId !== "ALL" ? { campusId } : {}),
      ...sessionFilter,
    },
    include: {
      student: {
        include: {
          campus: true,
          class: true,
          guardians: { where: { isPrimary: true } },
        },
      },
    },
    orderBy: { dueDate: "asc" },
  });

  const totalOverdueAmount = defaulters.reduce((acc, inv) => acc + inv.balanceAmount, 0);

  // Messaging parents is governed by the Notifications module, not by fee
  // access, so a clerk who can read the ledger cannot necessarily send.
  const canNotify = permissions.isAdmin || permissions.modules.notifications.canUpdate;
  const providers = getProviderStatus();
  const noProviders = !providers.email && !providers.sms;

  const filterQuery = new URLSearchParams();
  if (campusId) filterQuery.set("campus", campusId);
  if (session) filterQuery.set("session", session);
  const returnUrl = `/fees/defaulters${filterQuery.toString() ? `?${filterQuery}` : ""}`;

  return (
        <main className="p-8 space-y-6 flex-1 overflow-y-auto max-w-6xl mx-auto w-full">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-700" />
                <h1 className="text-xl font-black text-slate-900">
                  Defaulters & Fee Dues Tracker
                </h1>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Real-time tracking of pending and overdue student fee balances with parent reminder dispatch.
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl text-right">
              <span className="text-[11px] font-bold text-amber-800 uppercase block">
                Total Outstanding Dues
              </span>
              <span className="text-xl font-black text-amber-900">
                {formatCurrency(totalOverdueAmount)}
              </span>
            </div>
          </div>

          {notice && (
            <div
              className={`rounded-xl border p-3 flex items-start gap-2.5 text-xs ${
                notice === "reminder_settled"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                  : "bg-sky-50 border-sky-200 text-sky-900"
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                {notice === "reminder_settled" ? (
                  <span className="font-semibold">
                    No reminder sent — that invoice is already settled.
                  </span>
                ) : (
                  <>
                    <span className="font-bold">
                      {notice === "bulk_reminders" ? "Bulk reminder dispatched." : "Reminder dispatched."}
                    </span>{" "}
                    <span className="font-medium">
                      {queued ?? 0} message(s) queued · {sent ?? 0} sent
                      {Number(failed ?? 0) > 0 ? ` · ${failed} failed` : ""}
                      {Number(skipped ?? 0) > 0 ? ` · ${skipped} skipped (channel not configured)` : ""}
                    </span>
                    {notice === "bulk_reminders" && Number(queued ?? 0) === 0 && (
                      <p className="mt-0.5 text-sky-800">
                        Every parent in this filter has already been reminded for these invoices this
                        week. Use the per-row Remind button to send again anyway.
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {noProviders && canNotify && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 flex items-start gap-2.5 text-xs text-amber-900">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">No messaging provider is configured.</span>{" "}
                <span className="font-medium">
                  Reminders will be recorded in the notification log but not actually delivered until
                  the email (RESEND_API_KEY, NOTIFY_EMAIL_FROM) or SMS (MSG91_AUTH_KEY,
                  MSG91_SENDER_ID) credentials are set.
                </span>
              </div>
            </div>
          )}

          {/* Defaulter Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">
                Students with Outstanding Dues ({defaulters.length})
              </h3>
              {canNotify && defaulters.length > 0 && (
                <form action={sendBulkFeeReminders}>
                  <input type="hidden" name="campusId" value={campusId || ""} />
                  <input type="hidden" name="sessionName" value={invoiceScope.name || ""} />
                  <input type="hidden" name="returnUrl" value={returnUrl} />
                  <button
                    type="submit"
                    className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> Remind All Parents ({defaulters.length})
                  </button>
                </form>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Student & Scholar No</th>
                    <th className="py-3 px-4">Campus / Class</th>
                    <th className="py-3 px-4">Parent Contact</th>
                    <th className="py-3 px-4">Period / Invoice</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4">Overdue Balance</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {defaulters.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No outstanding dues found! All student fees are up to date.
                      </td>
                    </tr>
                  ) : (
                    defaulters.map((inv) => {
                      const primaryGuardian = inv.student.guardians[0];
                      return (
                        <tr key={inv.id} className="hover:bg-slate-50/80">
                          <td className="py-3 px-4">
                            <Link
                              href={`/students/${inv.studentId}`}
                              className="font-bold text-slate-900 hover:text-emerald-800"
                            >
                              {inv.student.firstName} {inv.student.lastName}
                            </Link>
                            <span className="block text-[11px] font-mono text-slate-400">
                              {inv.student.scholarNo}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <span className="font-semibold text-slate-800 block">
                              {inv.student.class.name}
                            </span>
                            <span className="text-[10px] text-emerald-800 font-bold">
                              {inv.student.campus.code}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <span className="font-medium text-slate-800 block">
                              {primaryGuardian?.name || "Guardian"}
                            </span>
                            <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {primaryGuardian?.phone || inv.student.emergencyContact || "-"}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <span className="font-medium text-slate-700 block">{inv.periodName}</span>
                            <span className="text-[10px] font-mono text-slate-400">{inv.invoiceNo}</span>
                          </td>

                          <td className="py-3 px-4">
                            <span className="text-rose-700 font-bold block">{formatDate(inv.dueDate)}</span>
                            {inv.fineAmount > 0 && (
                              <span className="text-[10px] text-rose-500 font-medium">+₹{inv.fineAmount} late fine</span>
                            )}
                          </td>

                          <td className="py-3 px-4 font-mono font-black text-amber-700 text-sm">
                            {formatCurrency(inv.balanceAmount)}
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex items-center justify-end gap-3 whitespace-nowrap">
                              <Link
                                href={`/students/${inv.studentId}?tab=fees`}
                                className="text-slate-500 hover:text-slate-800 font-semibold text-[11px] underline underline-offset-2"
                              >
                                Ledger
                              </Link>
                              {canNotify && (
                                <form action={sendFeeReminder}>
                                  <input type="hidden" name="invoiceId" value={inv.id} />
                                  <input type="hidden" name="returnUrl" value={returnUrl} />
                                  <button
                                    type="submit"
                                    title={`Remind ${primaryGuardian?.name || "guardian"} about ${inv.invoiceNo}`}
                                    className="inline-flex items-center gap-1 bg-emerald-800 hover:bg-emerald-900 text-white font-bold px-2.5 py-1 rounded text-[11px] transition"
                                  >
                                    <Send className="w-3 h-3" /> Remind
                                  </button>
                                </form>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
  );
}
