import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getCurrentUser, getUserPermissions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Receipt, Search, Filter, CheckCircle2, Send } from "lucide-react";
import { sendFeeReminder } from "@/lib/notification-actions";
import { Pagination } from "@/components/Pagination";
import { RecordPaymentModal } from "@/components/RecordPaymentModal";
import { LiveSearchInput } from "@/components/LiveSearchInput";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function FeeInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{
    campus?: string;
    status?: string;
    q?: string;
    notice?: string;
    queued?: string;
    sent?: string;
    page?: string;
  }>;
}) {
  const { campus: campusId, status, q, notice, queued, sent, page: pageStr } = await searchParams;
  const user = await getCurrentUser();
  const permissions = await getUserPermissions(user);

  if (!permissions.modules.fees.canView && !permissions.isAdmin) {
    redirect("/?error=unauthorized_fees");
  }

  const currentPage = Math.max(1, parseInt(pageStr || "1", 10));
  const pageSize = 10;

  const campuses = await prisma.campus.findMany({ orderBy: { name: "asc" } });

  const selectedCampus = campusId && campusId !== "ALL"
    ? campuses.find((c) => c.id === campusId || c.code === campusId || c.scholarIdPrefix === campusId)
    : null;
  const targetCampusId = selectedCampus ? selectedCampus.id : campusId && campusId !== "ALL" ? campusId : null;

  const canNotify = permissions.isAdmin || permissions.modules.notifications.canUpdate;

  const filterQuery = new URLSearchParams();
  if (campusId) filterQuery.set("campus", campusId);
  if (status) filterQuery.set("status", status);
  if (q) filterQuery.set("q", q);
  const returnUrl = `/fees/invoices${filterQuery.toString() ? `?${filterQuery}` : ""}`;

  const whereClause: any = {
    ...(targetCampusId ? { campusId: targetCampusId } : {}),
    ...(status && status !== "ALL" ? { status } : {}),
  };

  if (q) {
    whereClause.OR = [
      { invoiceNo: { contains: q, mode: "insensitive" } },
      { student: { firstName: { contains: q, mode: "insensitive" } } },
      { student: { lastName: { contains: q, mode: "insensitive" } } },
      { student: { scholarNo: { contains: q, mode: "insensitive" } } },
    ];
  }

  const paymentWhereClause: any = {
    ...(targetCampusId ? { student: { campusId: targetCampusId } } : {}),
  };

  const [invoices, totalCount, recentPayments] = await Promise.all([
    prisma.feeInvoice.findMany({
      where: whereClause,
      include: {
        student: { include: { campus: true, class: true } },
        items: { include: { feeHead: true } },
        payments: true,
      },
      orderBy: { createdAt: "desc" },
      take: pageSize,
      skip: (currentPage - 1) * pageSize,
    }),
    prisma.feeInvoice.count({ where: whereClause }),
    prisma.feePayment.findMany({
      where: paymentWhereClause,
      include: {
        student: { include: { campus: true, class: true } },
        invoice: true,
      },
      orderBy: { paymentDate: "desc" },
      take: 10,
    }),
  ]);

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
        <main className="p-8 space-y-6 flex-1 overflow-y-auto max-w-6xl mx-auto w-full">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-800" />
                <h1 className="text-xl font-black text-slate-900">
                  Fee Invoices & Ledger
                </h1>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Complete audit trail of fee demands, payments, concessions, and outstanding balances.
              </p>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-4">
            <LiveSearchInput
              defaultValue={q}
              placeholder="Search invoice number, student name or scholar ID..."
              className="flex-1"
            />

            <form method="GET" className="flex items-center gap-2">
              {campusId && <input type="hidden" name="campus" value={campusId} />}
              <select
                name="status"
                defaultValue={status || "ALL"}
                className="bg-slate-50 border border-slate-200 text-xs rounded-lg px-3 py-2 font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="PAID">Paid</option>
                <option value="PENDING">Pending</option>
                <option value="PARTIALLY_PAID">Partially Paid</option>
                <option value="OVERDUE">Overdue</option>
              </select>
              <button
                type="submit"
                className="bg-slate-800 hover:bg-slate-900 text-white text-xs px-3 py-2 rounded-lg font-semibold transition"
              >
                Filter
              </button>
            </form>
          </div>

          {notice && (
            <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 flex items-start gap-2.5 text-xs text-sky-900">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                {notice === "reminder_settled" ? (
                  <span className="font-semibold">
                    No reminder sent — that invoice is already settled.
                  </span>
                ) : (
                  <span className="font-medium">
                    <span className="font-bold">Reminder dispatched.</span> {queued ?? 0} message(s)
                    queued · {sent ?? 0} sent.
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Invoices Table */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">
                Student Fee Demands & Invoices {selectedCampus ? `(${selectedCampus.code})` : ""}
              </h3>
              <span className="text-xs text-slate-500 font-medium">Filtered List ({totalCount})</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider border-b border-slate-800">
                    <th className="py-3.5 px-5">Student</th>
                    <th className="py-3.5 px-5">Period</th>
                    <th className="py-3.5 px-5">Gross Demand</th>
                    <th className="py-3.5 px-5">Paid</th>
                    <th className="py-3.5 px-5">Balance Due</th>
                    <th className="py-3.5 px-5">Status</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        No invoices found.
                      </td>
                    </tr>
                  ) : (
                    invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/80 transition border-b border-slate-100">
                        <td className="py-4 px-5">
                          <Link
                            href={`/students/${inv.studentId}`}
                            className="font-bold text-slate-900 hover:text-emerald-800 text-sm block"
                          >
                            {inv.student.firstName} {inv.student.lastName}
                          </Link>
                          <span className="block text-[10px] font-mono text-slate-500 mt-0.5">
                            {inv.student.scholarNo} • {inv.student.class.name} ({inv.student.campus.code})
                          </span>
                        </td>

                        <td className="py-4 px-5">
                          <span className="font-medium text-slate-900 text-xs block">{inv.periodName}</span>
                          <span className="text-[10px] text-slate-400 font-medium block mt-0.5">Due: {formatDate(inv.dueDate)}</span>
                        </td>

                        <td className="py-4 px-5 font-mono font-semibold text-slate-800 text-xs">
                          {formatCurrency(inv.netAmount)}
                        </td>

                        <td className="py-4 px-5 font-mono font-semibold text-emerald-700 text-xs">
                          {formatCurrency(inv.paidAmount)}
                        </td>

                        <td className="py-4 px-5 font-mono font-black text-sm">
                          <span className={inv.balanceAmount > 0 ? "text-amber-950" : "text-emerald-700"}>
                            {formatCurrency(inv.balanceAmount)}
                          </span>
                        </td>

                        <td className="py-4 px-5">
                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase border ${
                              inv.status === "PAID"
                                ? "bg-emerald-100 text-emerald-950 border-emerald-200"
                                : inv.status === "OVERDUE"
                                ? "bg-rose-100 text-rose-950 border-rose-200"
                                : "bg-amber-100 text-amber-950 border-amber-200"
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>

                        <td className="py-4 px-5 text-right">
                          {inv.balanceAmount > 0 ? (
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
                                    title={`Remind the parent about ${inv.invoiceNo}`}
                                    className="inline-flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold text-xs border border-emerald-200 px-3 py-1.5 rounded-xl transition cursor-pointer"
                                  >
                                    <Send className="w-3.5 h-3.5 text-emerald-700" /> Remind
                                  </button>
                                </form>
                              )}
                              <Link
                                href={`/students/${inv.studentId}?tab=fees`}
                                className="inline-flex items-center gap-1.5 text-slate-600 hover:text-slate-900 font-semibold text-xs border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-1.5 rounded-xl transition shadow-2xs"
                              >
                                Ledger
                              </Link>
                            </div>
                          ) : (
                            <span className="text-emerald-800 font-bold text-xs bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl inline-block">
                              ✓ Settled
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
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

          {/* Recent Fee Collection Receipts & Manual Payment Submissions */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm">
                    Recent Fee Collection Receipts &amp; Transactions {selectedCampus ? `(${selectedCampus.code})` : ""}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Live history of fee collection receipts (Manual Cash, UPI, Cheque, Online).
                  </p>
                </div>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                {recentPayments.length} Recent Records
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider border-b border-slate-800">
                    <th className="py-3 px-4">Receipt No</th>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Period</th>
                    <th className="py-3 px-4">Mode</th>
                    <th className="py-3 px-4">Amount Paid</th>
                    <th className="py-3 px-4">Collected By / Ref</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentPayments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No recent fee payment receipts found for this selection.
                      </td>
                    </tr>
                  ) : (
                    recentPayments.map((pmt) => (
                      <tr key={pmt.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-emerald-900 text-xs block">{pmt.receiptNo}</span>
                          <span className="text-[10px] text-slate-400 font-medium block">{formatDate(pmt.paymentDate)}</span>
                        </td>
                        <td className="py-3 px-4">
                          <Link href={`/students/${pmt.studentId}`} className="font-bold text-slate-900 hover:text-emerald-800">
                            {pmt.student.firstName} {pmt.student.lastName}
                          </Link>
                          <span className="block text-[10px] font-mono text-slate-500">
                            {pmt.student.scholarNo} • {pmt.student.class.name} ({pmt.student.campus.code})
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-700">
                          {pmt.invoice?.periodName || "Fee Settlement"}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-slate-800 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                            {pmt.paymentMode}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-black text-emerald-700 text-sm">
                          {formatCurrency(pmt.amountPaid)}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          <span className="block text-xs font-semibold">{pmt.cashierName}</span>
                          {pmt.transactionRef && (
                            <span className="text-[10px] font-mono text-slate-400 block truncate max-w-[140px]">
                              Ref: {pmt.transactionRef}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200">
                            {pmt.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
  );
}
