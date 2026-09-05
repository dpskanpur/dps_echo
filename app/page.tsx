import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getCurrentUser, getUserPermissions } from "@/lib/auth";
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
  const { campus: campusId, error } = await searchParams;
  const user = await getCurrentUser();
  const permissions = await getUserPermissions(user);

  const campuses = await prisma.campus.findMany({
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
  const filterCampus = campusId && campusId !== "ALL" ? { campusId } : {};

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
        where: campusId && campusId !== "ALL" ? { invoice: { campusId } } : {},
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

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar userEmail={user?.email} userRole={user?.role} permissions={permissions} />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar campuses={campuses} selectedCampusId={campusId} user={user || undefined} permissions={permissions} />

        <main className="p-8 space-y-8 flex-1 overflow-y-auto">
          {/* Welcome Banner */}
          <div className="bg-gradient-to-r from-emerald-950 via-[#064e3b] to-slate-900 rounded-3xl p-7 text-white shadow-lg relative overflow-hidden">
            <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-8">
              <Building2 className="w-64 h-64 text-white" />
            </div>
            <div className="relative z-10 max-w-2xl space-y-2">
              <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full text-xs font-semibold border border-emerald-400/30">
                <ShieldCheck className="w-3.5 h-3.5 text-[#34A853]" />
                <span>{permissions.roleDisplayName}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Welcome, {user?.name || user?.email.split("@")[0]}
              </h1>
              <p className="text-xs sm:text-sm text-emerald-100/80 leading-relaxed">
                DPS Echo multi-campus administration desk for Azad Nagar, Barra, Kidwai Nagar, and Servodaya Nagar.
              </p>
            </div>
          </div>

          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Active Students KPI */}
            {canViewStudents && (
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#0F9D58] flex items-center justify-center shrink-0">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900">{activeStudentsCount}</div>
                  <div className="text-xs font-semibold text-slate-500">Active Students</div>
                  <div className="text-[11px] text-emerald-600 font-medium mt-0.5">Enrolled Across Campuses</div>
                </div>
              </div>
            )}

            {/* Total Collected / Dues KPI */}
            {canViewFees && (
              <>
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Receipt className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-2xl font-black text-slate-900">{formatCurrency(totalOutstandingDues)}</div>
                    <div className="text-xs font-semibold text-slate-500">Outstanding Dues</div>
                    <div className="text-[11px] text-rose-500 font-medium mt-0.5">{defaultersCount} Overdue Invoices</div>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-2xl font-black text-slate-900">{formatCurrency(totalCollectedAllTime)}</div>
                    <div className="text-xs font-semibold text-slate-500">Total Tender Collected</div>
                    <div className="text-[11px] text-teal-600 font-medium mt-0.5">POS, UPI & Bank Receipts</div>
                  </div>
                </div>
              </>
            )}

            {/* TC Clearance KPI */}
            {canViewTc && (
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <FileCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900">{tcIssuedCount}</div>
                  <div className="text-xs font-semibold text-slate-500">TCs Issued</div>
                  <div className="text-[11px] text-amber-600 font-medium mt-0.5">CBSE Clearance Compliant</div>
                </div>
              </div>
            )}

            {/* Alumni KPI */}
            {canViewAlumni && (
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900">{alumniCount}</div>
                  <div className="text-xs font-semibold text-slate-500">Graduated Alumni</div>
                  <div className="text-[11px] text-purple-600 font-medium mt-0.5">Permanent Records</div>
                </div>
              </div>
            )}

            {/* RBAC Quick Access */}
            {canViewRbac && (
              <Link
                href="/admin/rbac"
                className="bg-slate-900 hover:bg-slate-800 text-white p-5 rounded-2xl border border-slate-800 shadow-xs flex items-center gap-4 transition group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-2xl bg-slate-800 text-[#34A853] flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                  <KeyRound className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-sm font-black text-white flex items-center gap-1.5">
                    <span>RBAC Matrix</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#34A853] transition" />
                  </div>
                  <div className="text-xs text-slate-400">Configure Staff Permissions</div>
                  <div className="text-[10px] text-[#34A853] font-medium mt-0.5">View / Update / Delete</div>
                </div>
              </Link>
            )}
          </div>

          {/* Main Data Tables Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Admissions Section */}
            {canViewStudents && (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-slate-900">Recent Admissions</h2>
                  <Link href="/students" className="text-xs font-bold text-[#0F9D58] hover:underline">
                    View All Roster →
                  </Link>
                </div>

                <div className="divide-y divide-slate-100">
                  {recentStudents.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">No recent admissions found.</div>
                  ) : (
                    recentStudents.map((s) => (
                      <div key={s.id} className="py-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#0F9D58] flex items-center justify-center font-bold text-xs">
                            {s.firstName[0]}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-xs">{s.firstName} {s.lastName}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {s.scholarNo} • {s.class.name}-{s.section?.name || "A"} • {s.campus.name}
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] bg-emerald-50 text-[#0F9D58] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
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
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-slate-900">Recent Tender Collections</h2>
                  <Link href="/fees/invoices" className="text-xs font-bold text-[#0F9D58] hover:underline">
                    View Ledger →
                  </Link>
                </div>

                <div className="divide-y divide-slate-100">
                  {allPayments.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">No payment records found.</div>
                  ) : (
                    allPayments.map((p) => (
                      <div key={p.id} className="py-3 flex items-center justify-between gap-3">
                        <div>
                          <div className="font-bold text-slate-900 text-xs">
                            {p.student.firstName} {p.student.lastName}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {p.receiptNo} • {p.paymentMode} • {formatDate(p.paymentDate)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-black text-slate-900 text-xs text-emerald-600">
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
        </main>
      </div>
    </div>
  );
}
