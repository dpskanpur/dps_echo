import { prisma } from "@/lib/prisma";
import { listAcademicSessions, resolveSessionScope } from "@/lib/academic-session";
import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getCurrentUser, getUserPermissions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AlertTriangle, Phone, MessageSquare, Send, CheckCircle2, Info, FileText } from "lucide-react";
import { getProviderStatus } from "@/lib/notifications";
import { sendFeeReminder, sendBulkFeeReminders } from "@/lib/notification-actions";
import { Pagination } from "@/components/Pagination";
import { RecordPaymentModal } from "@/components/RecordPaymentModal";
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
    page?: string;
  }>;
}) {
  const { campus: campusId, session, notice, queued, sent, failed, skipped, page: pageStr } = await searchParams;
  const user = await getCurrentUser();
  const permissions = await getUserPermissions(user);

  if (!permissions.modules.fees.canView && !permissions.isAdmin) {
    redirect("/?error=unauthorized_fees");
  }

  const currentPage = Math.max(1, parseInt(pageStr || "1", 10));
  const pageSize = 10;

  const campuses = await prisma.campus.findMany({ orderBy: { name: "asc" } });

  // Invoices reference AcademicYear, so the session filter goes via the relation.
  const invoiceScope = resolveSessionScope(session, await listAcademicSessions());
  const sessionFilter = invoiceScope.name
    ? { academicYear: { name: invoiceScope.name } }
    : {};

  const whereClause = {
    status: { in: ["OVERDUE", "PENDING", "PARTIALLY_PAID"] },
    balanceAmount: { gt: 0 },
    ...(campusId && campusId !== "ALL" ? { campusId } : {}),
    ...sessionFilter,
  };

  const [defaulters, totalCount, aggregateResult] = await Promise.all([
    prisma.feeInvoice.findMany({
      where: whereClause,
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
      take: pageSize,
      skip: (currentPage - 1) * pageSize,
    }),
    prisma.feeInvoice.count({ where: whereClause }),
    prisma.feeInvoice.aggregate({
      where: whereClause,
      _sum: { balanceAmount: true },
    }),
  ]);

  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const totalOverdueAmount = aggregateResult._sum.balanceAmount || 0;

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
    <main className="p-6 sm:p-8 space-y-6 flex-1 overflow-y-auto max-w-7xl mx-auto w-full">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 border border-amber-300 flex items-center justify-center font-bold shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Defaulters & Fee Dues Tracker
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time tracking of pending and overdue student fee balances with parent reminder dispatch.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200/90 px-5 py-3 rounded-2xl text-right shrink-0">
          <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
            Total Outstanding Dues
          </span>
          <span className="text-xl font-black text-amber-950 font-mono">
            {formatCurrency(totalOverdueAmount)}
          </span>
        </div>
      </div>

      {notice && (
        <div
          className={`rounded-2xl border p-4 flex items-start gap-3 text-xs ${
            notice === "reminder_settled"
              ? "bg-emerald-50 border-emerald-200 text-emerald-950"
              : "bg-sky-50 border-sky-200 text-sky-950"
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-700" />
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
        <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-4 flex items-start gap-3 text-xs text-amber-950">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
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
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-200 bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-black text-slate-900 text-base">
              Students with Outstanding Dues ({defaulters.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Review overdue balances, collect offline fee payments, or send payment reminders to guardians.
            </p>
          </div>

          {canNotify && defaulters.length > 0 && (
            <form action={sendBulkFeeReminders}>
              <input type="hidden" name="campusId" value={campusId || ""} />
              <input type="hidden" name="sessionName" value={invoiceScope.name || ""} />
              <input type="hidden" name="returnUrl" value={returnUrl} />
              <button
                type="submit"
                className="bg-[#0F9D58] hover:bg-[#0d8a4d] active:scale-95 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-xs flex items-center gap-2 whitespace-nowrap cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" /> Remind All Parents ({defaulters.length})
              </button>
            </form>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider border-b border-slate-800">
                <th className="py-3.5 px-5">Student & Scholar No</th>
                <th className="py-3.5 px-5">Campus / Class</th>
                <th className="py-3.5 px-5">Parent Contact</th>
                <th className="py-3.5 px-5">Period / Invoice</th>
                <th className="py-3.5 px-5">Due Date</th>
                <th className="py-3.5 px-5">Overdue Balance</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {defaulters.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No outstanding dues found! All student fees are up to date.
                  </td>
                </tr>
              ) : (
                defaulters.map((inv) => {
                  const primaryGuardian = inv.student.guardians[0];
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition border-b border-slate-100">
                      {/* Student & Scholar No */}
                      <td className="py-4 px-5">
                        <Link
                          href={`/students/${inv.studentId}`}
                          className="font-bold text-slate-900 hover:text-emerald-800 text-sm block"
                        >
                          {inv.student.firstName} {inv.student.lastName}
                        </Link>
                        <span className="font-mono text-[10px] bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-md mt-1 inline-block font-medium">
                          {inv.student.scholarNo}
                        </span>
                      </td>

                      {/* Campus / Class */}
                      <td className="py-4 px-5">
                        <span className="font-bold text-slate-800 block text-xs">
                          {inv.student.class.name}
                        </span>
                        <span className="text-[10px] font-black uppercase text-emerald-950 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full mt-1 inline-block">
                          {inv.student.campus.code}
                        </span>
                      </td>

                      {/* Parent Contact */}
                      <td className="py-4 px-5">
                        <span className="font-semibold text-slate-800 block text-xs">
                          {primaryGuardian?.name || "Guardian"}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1.5 mt-1 font-medium">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {primaryGuardian?.phone || inv.student.emergencyContact || "-"}
                        </span>
                      </td>

                      {/* Period / Invoice */}
                      <td className="py-4 px-5">
                        <span className="font-medium text-slate-700 block text-xs">{inv.periodName}</span>
                        <span className="text-[10px] font-mono text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md mt-1 inline-block">
                          {inv.invoiceNo}
                        </span>
                      </td>

                      {/* Due Date */}
                      <td className="py-4 px-5">
                        <span className="text-rose-700 font-bold block text-xs">{formatDate(inv.dueDate)}</span>
                        {inv.fineAmount > 0 && (
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md mt-1 inline-block">
                            +₹{inv.fineAmount} late fine
                          </span>
                        )}
                      </td>

                      {/* Overdue Balance */}
                      <td className="py-4 px-5 font-mono font-black text-amber-950 text-base">
                        {formatCurrency(inv.balanceAmount)}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                          {(permissions.modules.fees.canUpdate || permissions.isAdmin) && (
                            <RecordPaymentModal
                              invoiceId={inv.id}
                              invoiceNo={inv.invoiceNo}
                              studentName={`${inv.student.firstName} ${inv.student.lastName}`}
                              balanceAmount={inv.balanceAmount}
                              buttonSize="sm"
                              buttonText="Collect Payment"
                            />
                          )}

                          {canNotify && (
                            <form action={sendFeeReminder}>
                              <input type="hidden" name="invoiceId" value={inv.id} />
                              <input type="hidden" name="returnUrl" value={returnUrl} />
                              <button
                                type="submit"
                                title={`Remind ${primaryGuardian?.name || "guardian"} about ${inv.invoiceNo}`}
                                className="inline-flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold text-xs border border-emerald-200 px-3 py-1.5 rounded-xl transition cursor-pointer"
                              >
                                <Send className="w-3.5 h-3.5 text-emerald-700" /> Remind
                              </button>
                            </form>
                          )}

                          <Link
                            href={`/students/${inv.studentId}?tab=fees`}
                            className="inline-flex items-center gap-1.5 text-slate-600 hover:text-slate-900 font-semibold text-xs border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-1.5 rounded-xl transition shadow-2xs"
                            title="View Student Ledger"
                          >
                            <FileText className="w-3.5 h-3.5 text-slate-500" />
                            <span>Ledger</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
        />
      </div>
    </main>
  );
}
