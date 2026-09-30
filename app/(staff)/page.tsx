import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";
import { formatCurrency, formatDate } from "@/lib/utils";
import { requireUser, getUserPermissions } from "@/lib/auth";
import { resolveCampusScope } from "@/lib/permissions";
import { TrendChart, TrendPoint } from "@/components/TrendChart";
import { SessionTimeoutCountdown } from "@/components/SessionTimeoutCountdown";
import {
  Users,
  CreditCard,
  AlertTriangle,
  FileCheck,
  UserPlus,
  ArrowRight,
  TrendingUp,
  Building2,
  Receipt,
  GraduationCap,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ campus?: string; error?: string }>;
}) {
  const { campus: requestedCampusId, error } = await searchParams;
  const user = await requireUser("/");
  const permissions = await getUserPermissions(user);

  // A campus-bound user cannot widen this by editing ?campus= in the URL.
  const scope = resolveCampusScope(user, requestedCampusId);
  const campusId = scope.campusId || undefined;

  const campuses = await prisma.campus.findMany({
    where: scope.locked ? { id: scope.campusId! } : {},
    orderBy: { name: "asc" },
  });

  // ZERO PERMISSIONS CASE: Render the Lock Screen with 60s Session Countdown
  if (!permissions.hasAnyAccess) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-between p-6 antialiased">
        {/* Top Minimal Brand Bar */}
        <div className="flex items-center justify-between max-w-5xl mx-auto w-full pt-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0F9D58] flex items-center justify-center font-bold text-white text-lg shadow-md">
              DE
            </div>
            <div>
              <h1 className="font-bold text-white text-base">DPS Echo</h1>
              <p className="text-xs text-slate-400">Institutional Access Gateway</p>
            </div>
          </div>

          <div className="text-xs font-mono text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700">
            {user?.email || "Unassigned"}
          </div>
        </div>

        {/* Center Countdown & Lock Box */}
        <div className="my-auto flex items-center justify-center py-12">
          <SessionTimeoutCountdown initialSeconds={60} />
        </div>

        {/* Footer */}
        <div className="max-w-5xl mx-auto w-full text-center text-xs text-slate-500 pb-4">
          © 2026 Delhi Public School Kanpur Group • Automated RBAC Enforcement
        </div>
      </div>
    );
  }

  // HAS PERMISSIONS: Render personalized dynamic dashboard
  const filterCampus = scope.where;

  // Aggregate Metrics (only query permitted domains)
  const canViewStudents = permissions.modules.students.canView;
  const canViewFees = permissions.modules.fees.canView;
  const canViewTc = permissions.modules.tc.canView;
  const canViewAlumni = permissions.modules.alumni.canView;
  const canViewRbac = permissions.modules.rbac.canView;

  const activeStudentsCount = canViewStudents
    ? await prisma.student.count({ where: { ...filterCampus, status: "ACTIVE" } })
    : 0;

  const tcIssuedCount = canViewTc
    ? await prisma.student.count({ where: { ...filterCampus, status: "TC_ISSUED" } })
    : 0;

  const alumniCount = canViewAlumni
    ? await prisma.student.count({ where: { ...filterCampus, status: "ALUMNI" } })
    : 0;

  // Financial Metrics
  const allInvoices = canViewFees
    ? await prisma.feeInvoice.findMany({ where: filterCampus })
    : [];

  const totalOutstandingDues = allInvoices.reduce(
    (acc, inv) => acc + (inv.balanceAmount || 0),
    0
  );

  const defaultersCount = allInvoices.filter(
    (inv) => inv.status === "OVERDUE" || (inv.balanceAmount > 0 && new Date(inv.dueDate) < new Date())
  ).length;

  const allPayments = canViewFees
    ? await prisma.feePayment.findMany({
        where: scope.campusId ? { invoice: { campusId: scope.campusId } } : {},
        include: {
          student: { include: { campus: true, class: true } },
          invoice: true,
        },
        orderBy: { paymentDate: "desc" },
        take: 5,
      })
    : [];

  const totalCollectedAllTime = allPayments.reduce(
    (acc, p) => acc + (p.amountPaid || 0),
    0
  );

  // Recent Admissions
  const recentStudents = canViewStudents
    ? await prisma.student.findMany({
        where: filterCampus,
        include: { campus: true, class: true, section: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      })
    : [];

  // -------------------------------------------------------------
  // Twelve-month trends
  //
  // Rows are bucketed in JS rather than with a SQL date_trunc so the same
  // code path works on both the SQLite dev database and Cloud SQL.
  // -------------------------------------------------------------

  const now = new Date();
  const windowStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  const monthBuckets = Array.from({ length: 12 }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      label: date.toLocaleDateString("en-IN", { month: "short" }),
      isYearStart: date.getMonth() === 0,
    };
  });

  const bucketKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}`;

  const admissionsInWindow = canViewStudents
    ? await prisma.student.findMany({
        where: { ...filterCampus, admissionDate: { gte: windowStart } },
        select: { admissionDate: true },
      })
    : [];

  const paymentsInWindow = canViewFees
    ? await prisma.feePayment.findMany({
        where: {
          paymentDate: { gte: windowStart },
          ...(scope.campusId ? { invoice: { campusId: scope.campusId } } : {}),
        },
        select: { paymentDate: true, amountPaid: true },
      })
    : [];

  const invoicesInWindow = canViewFees
    ? await prisma.feeInvoice.findMany({
        where: { ...filterCampus, createdAt: { gte: windowStart } },
        select: { createdAt: true, netAmount: true },
      })
    : [];

  const enrollmentTrend: TrendPoint[] = monthBuckets.map((bucket) => ({
    label: bucket.label,
    primary: admissionsInWindow.filter((a) => bucketKey(a.admissionDate) === bucket.key).length,
  }));

  const collectionTrend: TrendPoint[] = monthBuckets.map((bucket) => ({
    label: bucket.label,
    primary: paymentsInWindow
      .filter((p) => bucketKey(p.paymentDate) === bucket.key)
      .reduce((acc, p) => acc + p.amountPaid, 0),
    secondary: invoicesInWindow
      .filter((i) => bucketKey(i.createdAt) === bucket.key)
      .reduce((acc, i) => acc + i.netAmount, 0),
  }));

  const totalAdmissionsThisWindow = enrollmentTrend.reduce((acc, p) => acc + p.primary, 0);
  const collectedThisWindow = collectionTrend.reduce((acc, p) => acc + p.primary, 0);
  const invoicedThisWindow = collectionTrend.reduce((acc, p) => acc + (p.secondary || 0), 0);
  const collectionRate =
    invoicedThisWindow > 0 ? Math.round((collectedThisWindow / invoicedThisWindow) * 100) : 0;

  // Actionable defaulter list — the largest outstanding balances, not just a count.
  const topDefaulters = canViewFees
    ? await prisma.feeInvoice.findMany({
        where: {
          ...filterCampus,
          balanceAmount: { gt: 0 },
          status: { in: ["OVERDUE", "PENDING", "PARTIALLY_PAID"] },
          dueDate: { lt: now },
        },
        orderBy: { balanceAmount: "desc" },
        take: 6,
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              scholarNo: true,
              class: { select: { name: true } },
              campus: { select: { code: true } },
              guardians: {
                where: { isPrimary: true },
                select: { phone: true },
                take: 1,
              },
            },
          },
        },
      })
    : [];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 p-6 md:p-8 text-white shadow-xl shadow-emerald-950/10 border border-emerald-800/30 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-8">
          <Building2 className="w-64 h-64 text-white" />
        </div>
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-2 bg-emerald-500/15 text-emerald-300 px-3 py-1 rounded-full text-xs font-bold border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>{permissions.roleDisplayName}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Welcome, {user?.name || user?.email.split("@")[0]}
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100/70 leading-relaxed">
            DPS Echo multi-campus administration desk for Azad Nagar, Barra, Kidwai Nagar, and Servodaya Nagar.
          </p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Active Students KPI */}
        {canViewStudents && (
          <div className="rounded-3xl border border-slate-200 dark:border-strokedark bg-white dark:bg-boxdark p-6 shadow-xs hover:shadow-md transition-all duration-200 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Students</span>
              <h4 className="mt-2 text-2xl font-black font-mono text-slate-900 dark:text-white">
                {activeStudentsCount}
              </h4>
              <span className="mt-1 block text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">Enrolled Across Campuses</span>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <Users className="w-6 h-6" />
            </div>
          </div>
        )}

        {/* Outstanding Dues KPI */}
        {canViewFees && (
          <>
            <div className="rounded-3xl border border-slate-200 dark:border-strokedark bg-white dark:bg-boxdark p-6 shadow-xs hover:shadow-md transition-all duration-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Outstanding Dues</span>
                <h4 className="mt-2 text-2xl font-black font-mono text-amber-950 dark:text-amber-400">
                  {formatCurrency(totalOutstandingDues)}
                </h4>
                <span className="mt-1 block text-[11px] font-bold text-rose-600 dark:text-rose-400">{defaultersCount} Overdue Invoices</span>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                <Receipt className="w-6 h-6" />
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 dark:border-strokedark bg-white dark:bg-boxdark p-6 shadow-xs hover:shadow-md transition-all duration-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Tender Collected</span>
                <h4 className="mt-2 text-2xl font-black font-mono text-slate-900 dark:text-white">
                  {formatCurrency(totalCollectedAllTime)}
                </h4>
                <span className="mt-1 block text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">POS, UPI &amp; Receipts</span>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-400 border border-teal-200 dark:border-teal-800">
                <CreditCard className="w-6 h-6" />
              </div>
            </div>
          </>
        )}

        {/* TC Clearance KPI */}
        {canViewTc && (
          <div className="rounded-3xl border border-slate-200 dark:border-strokedark bg-white dark:bg-boxdark p-6 shadow-xs hover:shadow-md transition-all duration-200 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">TCs Issued</span>
              <h4 className="mt-2 text-2xl font-black font-mono text-slate-900 dark:text-white">
                {tcIssuedCount}
              </h4>
              <span className="mt-1 block text-[11px] font-semibold text-sky-700 dark:text-sky-400">CBSE Clearance Compliant</span>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 dark:bg-sky-950/50 text-sky-800 dark:text-sky-400 border border-sky-200 dark:border-sky-800">
              <FileCheck className="w-6 h-6" />
            </div>
          </div>
        )}

        {/* Alumni KPI */}
        {canViewAlumni && (
          <div className="rounded-3xl border border-slate-200 dark:border-strokedark bg-white dark:bg-boxdark p-6 shadow-xs hover:shadow-md transition-all duration-200 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Graduated Alumni</span>
              <h4 className="mt-2 text-2xl font-black font-mono text-slate-900 dark:text-white">
                {alumniCount}
              </h4>
              <span className="mt-1 block text-[11px] font-semibold text-purple-600 dark:text-purple-400">Permanent Records</span>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-purple-800 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
              <GraduationCap className="w-6 h-6" />
            </div>
          </div>
        )}

        {/* RBAC Quick Access */}
        {canViewRbac && (
          <Link
            href="/admin/rbac"
            className="rounded-3xl border border-slate-900 bg-slate-900 dark:bg-boxdark p-6 shadow-xs hover:bg-slate-800 transition-all duration-200 flex items-center justify-between group"
          >
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">RBAC Matrix</span>
              <h4 className="mt-1 text-base font-bold text-white flex items-center gap-1.5">
                <span>Admin &amp; Settings</span>
                <ArrowRight className="w-3.5 h-3.5 text-amber-400 group-hover:translate-x-1 transition" />
              </h4>
              <span className="mt-1 block text-[11px] font-bold text-amber-400">Configure Permissions</span>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-amber-400 border border-slate-700">
              <KeyRound className="w-6 h-6" />
            </div>
          </Link>
        )}
      </div>

      {/* Trends */}
      {(canViewStudents || canViewFees) && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {canViewStudents && (
            <div className="rounded-3xl border border-slate-200 dark:border-strokedark bg-white dark:bg-boxdark p-6 shadow-xs space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white">Enrollment Trend</h2>
                  <p className="text-xs text-slate-500 dark:text-bodydark mt-0.5">
                    New admissions over the last 12 months
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xl font-black font-mono text-slate-900 dark:text-white">{totalAdmissionsThisWindow}</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Admissions
                  </div>
                </div>
              </div>

              <TrendChart
                points={enrollmentTrend}
                primaryLabel="New admissions"
                formatValue={(v) => `${v} student${v === 1 ? "" : "s"}`}
              />
            </div>
          )}

          {canViewFees && (
            <div className="rounded-3xl border border-slate-200 dark:border-strokedark bg-white dark:bg-boxdark p-6 shadow-xs space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white">Fee Collection Trend</h2>
                  <p className="text-xs text-slate-500 dark:text-bodydark mt-0.5">
                    Collected against invoiced, last 12 months
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xl font-black font-mono text-emerald-700 dark:text-emerald-400">{collectionRate}%</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Collected
                  </div>
                </div>
              </div>

              <TrendChart
                points={collectionTrend}
                primaryLabel="Collected"
                secondaryLabel="Invoiced"
                formatValue={(v) => formatCurrency(v)}
              />
            </div>
          )}
        </div>
      )}

      {/* Defaulter Summary */}
      {canViewFees && (
        <div className="rounded-3xl border border-slate-200 dark:border-strokedark bg-white dark:bg-boxdark p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h2 className="text-base font-black text-slate-900 dark:text-white">Largest Outstanding Dues</h2>
            </div>
            <Link href="/fees/defaulters" className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline">
              Full Defaulter List →
            </Link>
          </div>

          {topDefaulters.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No overdue invoices. Everything is settled.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {topDefaulters.map((inv) => {
                const daysOverdue = Math.max(
                  0,
                  Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / 86400000)
                );
                return (
                  <Link
                    key={inv.id}
                    href={`/students/${inv.student.id}`}
                    className="py-3 px-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-2xl transition-all duration-150"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 dark:text-white text-xs truncate">
                        {inv.student.firstName} {inv.student.lastName}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono truncate">
                        {inv.student.scholarNo} • {inv.student.class.name} •{" "}
                        {inv.student.campus.code}
                        {inv.student.guardians[0]?.phone
                          ? ` • ${inv.student.guardians[0].phone}`
                          : ""}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-black font-mono text-xs text-rose-600 dark:text-rose-400">
                        {formatCurrency(inv.balanceAmount)}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">
                        {daysOverdue} day{daysOverdue === 1 ? "" : "s"} overdue
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Main Data Tables Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Admissions Section */}
        {canViewStudents && (
          <div className="rounded-3xl border border-slate-200 dark:border-strokedark bg-white dark:bg-boxdark p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-slate-900 dark:text-white">Recent Admissions</h2>
              <Link href="/students" className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline">
                View All Roster →
              </Link>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentStudents.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">No recent admissions found.</div>
              ) : (
                recentStudents.map((s) => (
                  <div key={s.id} className="py-3 px-2 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-2xl transition">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-400 flex items-center justify-center font-black text-xs border border-emerald-200/60 dark:border-emerald-800">
                        {s.firstName[0]}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white text-xs">{s.firstName} {s.lastName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {s.scholarNo} • {s.class.name}-{s.section?.name || "A"} • {s.campus.name}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-bold px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                      Enrolled
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Recent Fee Transactions */}
        {canViewFees && (
          <div className="rounded-3xl border border-slate-200 dark:border-strokedark bg-white dark:bg-boxdark p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-slate-900 dark:text-white">Recent Tender Collections</h2>
              <Link href="/fees/online-payments" className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline">
                View Ledger →
              </Link>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {allPayments.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">No payment records found.</div>
              ) : (
                allPayments.map((p) => (
                  <div key={p.id} className="py-3 px-2 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-2xl transition">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white text-xs">
                        {p.student.firstName} {p.student.lastName}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {p.receiptNo} • {p.paymentMode} • {formatDate(p.paymentDate)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-black font-mono text-xs text-emerald-700 dark:text-emerald-400">
                        +{formatCurrency(p.amountPaid)}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {p.student.campus.code}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
