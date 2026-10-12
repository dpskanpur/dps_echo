import { prisma } from "@/lib/prisma";
import { getCurrentUser, getUserPermissions } from "@/lib/auth";
import { listAcademicSessions, resolveSessionScope } from "@/lib/academic-session";
import { formatCurrency, formatDate } from "@/lib/utils";
import { redirect } from "next/navigation";
import { FileSpreadsheet, Search, Tag, DollarSign, Users, ShieldAlert } from "lucide-react";
import { Pagination } from "@/components/Pagination";
import { DemandImportModal } from "@/components/DemandImportModal";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DemandsPage({
  searchParams,
}: {
  searchParams: Promise<{
    campus?: string;
    session?: string;
    period?: string;
    search?: string;
    page?: string;
  }>;
}) {
  const { campus: campusParam, session: sessionParam, period, search, page: pageStr } = await searchParams;
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
  if (campusParam && campusParam !== "ALL") {
    const found = campuses.find(
      (c) => c.id === campusParam || c.code === campusParam || c.scholarIdPrefix === campusParam
    );
    if (found) activeCampusId = found.id;
  }

  const sessions = await listAcademicSessions();
  const scope = resolveSessionScope(sessionParam, sessions);
  const activeSession =
    sessions.find((x) => x.name === scope.name) || sessions.find((x) => x.isCurrent) || sessions[0];

  // Build filter clause
  const whereClause: any = {
    ...(activeCampusId ? { campusId: activeCampusId } : {}),
    ...(activeSession ? { academicYearId: activeSession.id } : {}),
    ...(period ? { periodName: { contains: period } } : {}),
  };

  if (search?.trim()) {
    const q = search.trim();
    whereClause.OR = [
      { student: { firstName: { contains: q } } },
      { student: { lastName: { contains: q } } },
      { student: { scholarNo: { contains: q } } },
      { invoiceNo: { contains: q } },
    ];
  }

  const [invoices, totalCount, statsAggregate] = await Promise.all([
    prisma.feeInvoice.findMany({
      where: whereClause,
      include: {
        student: {
          include: {
            class: true,
            campus: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: pageSize,
      skip: (currentPage - 1) * pageSize,
    }),
    prisma.feeInvoice.count({ where: whereClause }),
    prisma.feeInvoice.aggregate({
      where: whereClause,
      _sum: {
        grossAmount: true,
        discountAmount: true,
        netAmount: true,
      },
    }),
  ]);

  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const totalGross = statsAggregate._sum.grossAmount || 0;
  const totalDiscount = statsAggregate._sum.discountAmount || 0;
  const totalNet = statsAggregate._sum.netAmount || 0;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-boxdark p-6 rounded-3xl border border-slate-200 dark:border-strokedark shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center font-bold shrink-0">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Quarterly Fee Demands &amp; Discount Directory
            </h1>
            <p className="text-xs text-slate-500 dark:text-bodydark2 mt-0.5">
              Upload student quarterly fee demands (Q1-Q4) and discount logic. Offline cash desk collection is managed offline.
            </p>
          </div>
        </div>

        {permissions.modules.fees.canUpdate && (
          <DemandImportModal campuses={campuses} academicSessionName={activeSession?.name} />
        )}
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-boxdark p-5 rounded-2xl border border-slate-200 dark:border-strokedark shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Gross Demands</span>
            <DollarSign className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
            {formatCurrency(totalGross)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Pre-concession gross tuition</div>
        </div>

        <div className="bg-white dark:bg-boxdark p-5 rounded-2xl border border-slate-200 dark:border-strokedark shadow-xs">
          <div className="flex items-center justify-between text-amber-700 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Concessions Granted</span>
            <Tag className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black font-mono text-amber-950 dark:text-amber-400">
            - {formatCurrency(totalDiscount)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Staff, sibling &amp; RTE discounts</div>
        </div>

        <div className="bg-white dark:bg-boxdark p-5 rounded-2xl border border-slate-200 dark:border-strokedark shadow-xs">
          <div className="flex items-center justify-between text-emerald-800 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Net Demands Payable</span>
            <DollarSign className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-800 dark:text-emerald-400">
            {formatCurrency(totalNet)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Net receivable across parents</div>
        </div>

        <div className="bg-white dark:bg-boxdark p-5 rounded-2xl border border-slate-200 dark:border-strokedark shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Demand Rows</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
            {totalCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Student quarterly entries</div>
        </div>
      </div>

      {/* Demands Table & Search */}
      <div className="bg-white dark:bg-boxdark rounded-3xl border border-slate-200 dark:border-strokedark shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-strokedark bg-slate-50/80 dark:bg-boxdark-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="font-black text-slate-900 dark:text-white text-base">
            Quarterly Student Demands ({totalCount})
          </h2>

          {/* Search Bar */}
          <form className="flex items-center gap-2 max-w-sm w-full">
            {campusParam && <input type="hidden" name="campus" value={campusParam} />}
            {sessionParam && <input type="hidden" name="session" value={sessionParam} />}
            {period && <input type="hidden" name="period" value={period} />}
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                name="search"
                defaultValue={search || ""}
                placeholder="Search student, scholar no, invoice..."
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
              <tr className="sticky top-0 z-10 bg-slate-100/90 dark:bg-slate-900/90 backdrop-blur-xs text-slate-700 dark:text-slate-200 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <th className="py-3.5 px-5">Scholar No &amp; Student</th>
                <th className="py-3.5 px-5">Campus / Class</th>
                <th className="py-3.5 px-5">Period / Quarter</th>
                <th className="py-3.5 px-5">Due Date</th>
                <th className="py-3.5 px-5">Gross Fee</th>
                <th className="py-3.5 px-5">Concession / Reason</th>
                <th className="py-3.5 px-5">Net Payable</th>
                <th className="py-3.5 px-5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No quarterly fee demands found. Click &quot;Upload / Add Fee Demands&quot; above to add student demands.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                    <td className="py-4 px-5">
                      <Link
                        href={`/students/${inv.studentId}`}
                        className="font-bold text-slate-900 dark:text-white hover:text-emerald-800 text-sm block"
                      >
                        {inv.student.firstName} {inv.student.lastName}
                      </Link>
                      <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-md mt-1 inline-block font-medium">
                        {inv.student.scholarNo}
                      </span>
                    </td>

                    <td className="py-4 px-5">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 block text-xs">
                        {inv.student.class.name}
                      </span>
                      <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800 px-2 py-0.5 rounded-full mt-1 inline-block">
                        {inv.student.campus.code}
                      </span>
                    </td>

                    <td className="py-4 px-5 font-semibold text-slate-700 dark:text-slate-300">
                      {inv.periodName}
                    </td>

                    <td className="py-4 px-5 font-mono text-slate-600 dark:text-slate-400">
                      {formatDate(inv.dueDate)}
                    </td>

                    <td className="py-4 px-5 font-mono font-bold text-slate-900 dark:text-white">
                      {formatCurrency(inv.grossAmount)}
                    </td>

                    <td className="py-4 px-5 font-mono">
                      {inv.discountAmount > 0 ? (
                        <div>
                          <span className="font-bold text-amber-700 dark:text-amber-400">
                            - {formatCurrency(inv.discountAmount)}
                          </span>
                          {inv.student.discountReason && (
                            <span className="block text-[10px] text-slate-400 font-medium">
                              {inv.student.discountReason}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    <td className="py-4 px-5 font-mono font-bold text-emerald-700 dark:text-emerald-400 text-sm">
                      {formatCurrency(inv.netAmount)}
                    </td>

                    <td className="py-4 px-5 text-right">
                      {inv.status === "PAID" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Paid Online
                        </span>
                      ) : inv.status === "PARTIALLY_PAID" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                          Partial Online
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          Pending
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
    </div>
  );
}
