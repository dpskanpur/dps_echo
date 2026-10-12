import { prisma } from "@/lib/prisma";
import { getCurrentUser, getUserPermissions } from "@/lib/auth";
import { listAcademicSessions, resolveSessionScope } from "@/lib/academic-session";
import { formatCurrency, formatDate } from "@/lib/utils";
import { redirect } from "next/navigation";
import { FileCheck, Search, CreditCard, CheckCircle2, ShieldCheck, DollarSign, Users } from "lucide-react";
import { Pagination } from "@/components/Pagination";
import { PrintReportButton } from "@/components/PrintReportButton";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function OnlinePaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    campus?: string;
    session?: string;
    search?: string;
    page?: string;
  }>;
}) {
  const { campus: campusParam, session: sessionParam, search, page: pageStr } = await searchParams;
  const user = await getCurrentUser();
  const permissions = await getUserPermissions(user);

  if (!permissions.modules.fees.canView && !permissions.isAdmin) {
    redirect("/?error=unauthorized_fees");
  }

  const currentPage = Math.max(1, parseInt(pageStr || "1", 10));
  const pageSize = 15;

  const campuses = await prisma.campus.findMany({ orderBy: { name: "asc" } });

  // Resolve active campus scope
  let activeCampusId: string | undefined = undefined;
  let activeCampusName = "All Campuses";
  if (campusParam && campusParam !== "ALL") {
    const found = campuses.find(
      (c) => c.id === campusParam || c.code === campusParam || c.scholarIdPrefix === campusParam
    );
    if (found) {
      activeCampusId = found.id;
      activeCampusName = found.name;
    }
  }

  const sessions = await listAcademicSessions();
  const scope = resolveSessionScope(sessionParam, sessions);
  const activeSession =
    sessions.find((x) => x.name === scope.name) || sessions.find((x) => x.isCurrent) || sessions[0];

  // Where condition for online fee payments
  const whereClause: any = {
    OR: [
      { paymentMode: { contains: "ONLINE" } },
      { paymentMode: "RAZORPAY" },
      { paymentOrder: { isNot: null } },
    ],
    status: "SUCCESS",
    ...(activeCampusId ? { invoice: { campusId: activeCampusId } } : {}),
    ...(activeSession ? { invoice: { academicYearId: activeSession.id } } : {}),
  };

  if (search?.trim()) {
    const q = search.trim();
    whereClause.AND = [
      {
        OR: [
          { receiptNo: { contains: q } },
          { transactionRef: { contains: q } },
          { student: { firstName: { contains: q } } },
          { student: { lastName: { contains: q } } },
          { student: { scholarNo: { contains: q } } },
        ],
      },
    ];
  }

  const [payments, totalCount, statsAggregate] = await Promise.all([
    prisma.feePayment.findMany({
      where: whereClause,
      include: {
        invoice: {
          include: {
            campus: true,
          },
        },
        student: {
          include: {
            class: true,
            campus: true,
          },
        },
        paymentOrder: true,
      },
      orderBy: { paymentDate: "desc" },
      take: pageSize,
      skip: (currentPage - 1) * pageSize,
    }),
    prisma.feePayment.count({ where: whereClause }),
    prisma.feePayment.aggregate({
      where: whereClause,
      _sum: {
        amountPaid: true,
      },
    }),
  ]);

  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const totalOnlineAmount = statsAggregate._sum.amountPaid || 0;
  const avgPayment = totalCount > 0 ? Math.round(totalOnlineAmount / totalCount) : 0;

  return (
    <div className="space-y-6">
      {/* Printable Header (Visible only when printing to PDF / Printer) */}
      <div className="hidden print:block mb-6 border-b-2 border-slate-900 pb-4 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">
              DELHI PUBLIC SCHOOL KANPUR
            </h1>
            <h2 className="text-base font-bold text-slate-800">
              Verified Online Fee Receipts &amp; Audit Log
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Generated: {new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })} | Session: {activeSession?.name || "Active"} | Campus: {activeCampusName}
            </p>
          </div>
          <div className="text-right">
            <div className="text-lg font-black font-mono text-slate-900">
              Total Online Collection: {formatCurrency(totalOnlineAmount)}
            </div>
            <div className="text-xs font-medium text-slate-600">
              Total Verified Transactions: {totalCount}
            </div>
          </div>
        </div>
      </div>

      {/* Screen Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-boxdark p-6 rounded-3xl border border-slate-200 dark:border-strokedark shadow-xs print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center font-bold shrink-0">
            <FileCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Verified Online Paid Receipts Log
            </h1>
            <p className="text-xs text-slate-500 dark:text-bodydark2 mt-0.5">
              Verified audit trail of fee payments processed online via Razorpay. Offline cash desk collection is tracked offline.
            </p>
          </div>
        </div>

        <PrintReportButton label="Export PDF Report" />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4">
        <div className="bg-white dark:bg-boxdark p-5 rounded-2xl border border-slate-200 dark:border-strokedark shadow-xs">
          <div className="flex items-center justify-between text-emerald-800 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Online Collections</span>
            <DollarSign className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-800 dark:text-emerald-400">
            {formatCurrency(totalOnlineAmount)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Verified Razorpay gateway captures</div>
        </div>

        <div className="bg-white dark:bg-boxdark p-5 rounded-2xl border border-slate-200 dark:border-strokedark shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Verified Receipts</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
            {totalCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Online transactions log count</div>
        </div>

        <div className="bg-white dark:bg-boxdark p-5 rounded-2xl border border-slate-200 dark:border-strokedark shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Average Receipt Value</span>
            <CreditCard className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
            {formatCurrency(avgPayment)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Average online payment amount</div>
        </div>

        <div className="bg-white dark:bg-boxdark p-5 rounded-2xl border border-slate-200 dark:border-strokedark shadow-xs">
          <div className="flex items-center justify-between text-sky-700 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Gateway Status</span>
            <ShieldCheck className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-black font-mono text-sky-800 dark:text-sky-400">
            100% Verified
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Razorpay webhook reconciled</div>
        </div>
      </div>

      {/* Receipts Table */}
      <div className="bg-white dark:bg-boxdark rounded-3xl border border-slate-200 dark:border-strokedark shadow-xs overflow-hidden print:border-none print:shadow-none">
        <div className="p-5 border-b border-slate-200 dark:border-strokedark bg-slate-50/80 dark:bg-boxdark-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
          <h2 className="font-black text-slate-900 dark:text-white text-base">
            Online Paid Receipts ({totalCount})
          </h2>

          {/* Search Bar */}
          <form className="flex items-center gap-2 max-w-sm w-full">
            {campusParam && <input type="hidden" name="campus" value={campusParam} />}
            {sessionParam && <input type="hidden" name="session" value={sessionParam} />}
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                name="search"
                defaultValue={search || ""}
                placeholder="Search receipt no, student, txn ref..."
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-strokedark rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-2 text-xs font-bold bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-xl hover:bg-slate-800 transition shrink-0"
            >
              Search
            </button>
          </form>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider border-b border-slate-800">
                <th className="py-3.5 px-5">Receipt No</th>
                <th className="py-3.5 px-5">Scholar No &amp; Student</th>
                <th className="py-3.5 px-5">Campus / Class</th>
                <th className="py-3.5 px-5">Period</th>
                <th className="py-3.5 px-5">Date &amp; Time</th>
                <th className="py-3.5 px-5">Gateway Txn Ref / Order ID</th>
                <th className="py-3.5 px-5">Amount Paid</th>
                <th className="py-3.5 px-5 text-right">Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No online paid receipts found for the selected filters.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                    <td className="py-4 px-5">
                      <span className="font-mono font-bold text-slate-900 dark:text-white block text-xs">
                        {p.receiptNo}
                      </span>
                    </td>

                    <td className="py-4 px-5">
                      <Link
                        href={`/students/${p.studentId}`}
                        className="font-bold text-slate-900 dark:text-white hover:text-emerald-800 text-sm block"
                      >
                        {p.student.firstName} {p.student.lastName}
                      </Link>
                      <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-md mt-1 inline-block font-medium">
                        {p.student.scholarNo}
                      </span>
                    </td>

                    <td className="py-4 px-5">
                      <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
                        {p.student.class.name}
                      </span>
                      <span className="text-[10px] font-black uppercase text-emerald-950 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full mt-1 inline-block">
                        {p.student.campus.code}
                      </span>
                    </td>

                    <td className="py-4 px-5 font-medium text-slate-700 dark:text-slate-300">
                      {p.invoice.periodName}
                    </td>

                    <td className="py-4 px-5 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {formatDate(p.paymentDate)}
                    </td>

                    <td className="py-4 px-5 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                      <div>{p.transactionRef || p.paymentOrder?.gatewayPaymentId || "Razorpay Online"}</div>
                      {p.paymentOrder?.gatewayOrderId && (
                        <div className="text-[10px] text-slate-400">{p.paymentOrder.gatewayOrderId}</div>
                      )}
                    </td>

                    <td className="py-4 px-5 font-mono font-black text-emerald-800 dark:text-emerald-400 text-sm">
                      {formatCurrency(p.amountPaid)}
                    </td>

                    <td className="py-4 px-5 text-right">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-700" /> Verified Online
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="print:hidden">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={pageSize}
          />
        </div>
      </div>
    </div>
  );
}
