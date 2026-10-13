import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser, getUserPermissions } from "@/lib/auth";
import { resolveCampusScope } from "@/lib/permissions";
import { TrendChart, TrendPoint } from "@/components/TrendChart";
import { SessionTimeoutCountdown } from "@/components/SessionTimeoutCountdown";
import { getPublicSystemSettings } from "@/lib/public-data";
import { getActiveSessionName } from "@/lib/academic-session";
import { OnlineRegistrationToggle } from "@/components/OnlineRegistrationToggle";
import {
  Users,
  FileCheck,
  ArrowRight,
  GraduationCap,
  KeyRound,
  ShieldCheck,
  Briefcase,
  Building2,
  Globe,
  Plus,
  UserPlus,
  Calendar,
  ChevronRight,
  Activity,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ campus?: string; error?: string }>;
}) {
  const { campus: requestedCampusId } = await searchParams;
  const user = await requireUser("/");
  const permissions = await getUserPermissions(user);

  // A campus-bound user cannot widen this by editing ?campus= in the URL.
  const scope = resolveCampusScope(user, requestedCampusId);

  // ZERO PERMISSIONS CASE: Render the Lock Screen with 60s Session Countdown
  if (!permissions.hasAnyAccess) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-between p-6 antialiased">
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

        <div className="my-auto flex items-center justify-center py-12">
          <SessionTimeoutCountdown initialSeconds={60} />
        </div>

        <div className="max-w-5xl mx-auto w-full text-center text-xs text-slate-500 pb-4">
          © 2026 Delhi Public School Kanpur Group • Automated RBAC Enforcement
        </div>
      </div>
    );
  }

  // HAS PERMISSIONS: Render personalized dynamic dashboard
  const filterCampus = scope.where;

  const canViewStudents = permissions.modules.students.canView;
  const canViewEmployees = permissions.modules.employees?.canView ?? false;
  const canViewTc = permissions.modules.tc.canView;
  const canViewAlumni = permissions.modules.alumni.canView;
  const canViewRbac = permissions.modules.rbac.canView;

  // Key System Totals
  const [
    activeStudentsCount,
    activeEmployeesCount,
    tcIssuedCount,
    alumniCount,
    systemSettings,
    activeSessionName,
  ] = await Promise.all([
    canViewStudents
      ? prisma.student.count({ where: { ...filterCampus, status: "ACTIVE" } })
      : 0,
    canViewEmployees
      ? prisma.employee.count({ where: { ...filterCampus, status: "ACTIVE" } })
      : 0,
    canViewTc
      ? prisma.student.count({ where: { ...filterCampus, status: "TC_ISSUED" } })
      : 0,
    canViewAlumni
      ? prisma.student.count({ where: { ...filterCampus, status: "ALUMNI" } })
      : 0,
    getPublicSystemSettings(),
    getActiveSessionName(),
  ]);

  // Institutional Multi-Campus Distribution
  const campusBreakdown = await prisma.campus.findMany({
    where: scope.locked ? { id: scope.campusId! } : {},
    include: {
      _count: {
        select: {
          students: { where: { status: "ACTIVE" } },
          employees: { where: { status: "ACTIVE" } },
          classes: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  // Staff category breakdown (Teaching vs Administrative/Support)
  const staffCategories = canViewEmployees
    ? await prisma.employee.groupBy({
        by: ["category"],
        where: { ...filterCampus, status: "ACTIVE" },
        _count: { id: true },
      })
    : [];

  const teachingStaffCount = staffCategories.find((c) => c.category === "TEACHING")?._count.id || 0;
  const nonTeachingStaffCount = staffCategories
    .filter((c) => c.category !== "TEACHING")
    .reduce((sum, c) => sum + c._count.id, 0);

  // Recent Admissions (Brief list of 5)
  const recentStudents = canViewStudents
    ? await prisma.student.findMany({
        where: filterCampus,
        include: { campus: true, class: true, section: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      })
    : [];

  // Twelve-Month Admissions Velocity Trend
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

  const enrollmentTrend: TrendPoint[] = monthBuckets.map((bucket) => ({
    label: bucket.label,
    primary: admissionsInWindow.filter((a) => bucketKey(a.admissionDate) === bucket.key).length,
  }));

  const totalAdmissionsThisWindow = enrollmentTrend.reduce((acc, p) => acc + p.primary, 0);

  return (
    <div className="space-y-6">
      {/* 1. Welcome & Institution Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-boxdark p-6 rounded-2xl border border-slate-200/80 dark:border-strokedark shadow-xs">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-2.5 py-0.5 rounded-full text-xs font-semibold border border-emerald-200/60 dark:border-emerald-800">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{permissions.roleDisplayName}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Welcome back, {user?.name || user?.email.split("@")[0]}
          </h1>
          <p className="text-xs text-slate-500 dark:text-bodydark2">
            DPS Echo multi-campus administration desk for Azad Nagar, Barra, Kidwai Nagar, and Servodaya Nagar.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-xs flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">Session:</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">{activeSessionName}</span>
          </div>
        </div>
      </div>

      {/* 2. Top Balanced KPI Cards (5 Cards Aligned in 1 Responsive Row) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Active Students KPI */}
        {canViewStudents && (
          <Link
            href="/students"
            className="rounded-2xl border border-slate-200/80 dark:border-strokedark bg-white dark:bg-boxdark p-4 shadow-xs hover:border-emerald-500/40 transition-all flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Active Students
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/60 dark:border-emerald-800 group-hover:scale-105 transition">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <h4 className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
                {activeStudentsCount}
              </h4>
              <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400 block mt-0.5">
                Enrolled Students
              </span>
            </div>
          </Link>
        )}

        {/* Active Faculty & Staff KPI */}
        {canViewEmployees && (
          <Link
            href="/employees"
            className="rounded-2xl border border-slate-200/80 dark:border-strokedark bg-white dark:bg-boxdark p-4 shadow-xs hover:border-emerald-500/40 transition-all flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Faculty &amp; Staff
              </span>
              <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 flex items-center justify-center border border-sky-200/60 dark:border-sky-800 group-hover:scale-105 transition">
                <Briefcase className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <h4 className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
                {activeEmployeesCount}
              </h4>
              <span className="text-[10px] font-medium text-sky-700 dark:text-sky-400 block mt-0.5">
                Staff Directory
              </span>
            </div>
          </Link>
        )}

        {/* TC Clearance KPI */}
        {canViewTc && (
          <Link
            href="/tc"
            className="rounded-2xl border border-slate-200/80 dark:border-strokedark bg-white dark:bg-boxdark p-4 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                TCs Issued
              </span>
              <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center border border-slate-200/60 dark:border-slate-700 group-hover:scale-105 transition">
                <FileCheck className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              </div>
            </div>
            <div className="mt-2">
              <h4 className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
                {tcIssuedCount}
              </h4>
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block mt-0.5">
                CBSE Clearance
              </span>
            </div>
          </Link>
        )}

        {/* Alumni KPI */}
        {canViewAlumni && (
          <Link
            href="/alumni"
            className="rounded-2xl border border-slate-200/80 dark:border-strokedark bg-white dark:bg-boxdark p-4 shadow-xs hover:border-purple-300 transition-all flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Alumni
              </span>
              <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-200/60 dark:border-purple-800 group-hover:scale-105 transition">
                <GraduationCap className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <h4 className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
                {alumniCount}
              </h4>
              <span className="text-[10px] font-medium text-purple-700 dark:text-purple-400 block mt-0.5">
                Graduated Records
              </span>
            </div>
          </Link>
        )}

        {/* RBAC Quick Access */}
        {canViewRbac && (
          <Link
            href="/admin/rbac"
            className="rounded-2xl border border-slate-200/80 dark:border-strokedark bg-white dark:bg-boxdark p-4 shadow-xs hover:border-emerald-500/40 transition-all flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                RBAC Matrix
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/60 dark:border-emerald-800 group-hover:scale-105 transition">
                <KeyRound className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1">
                <span>Access Hub</span>
                <ArrowRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 group-hover:translate-x-1 transition" />
              </h4>
              <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400 block mt-0.5">
                Staff Permissions
              </span>
            </div>
          </Link>
        )}
      </div>

      {/* 3. Middle Section: Multi-Campus Distribution & Operational Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Multi-Campus Breakdown Table */}
        <div className="lg:col-span-2 bg-white dark:bg-boxdark rounded-2xl border border-slate-200/80 dark:border-strokedark p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Institutional Campus Breakdown
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Distribution of enrolled students, faculty, and academic classes across all 4 school campuses
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-lg shrink-0">
              {campusBreakdown.length} Campuses Connected
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {campusBreakdown.map((c) => {
              const isSelected = scope.campusId === c.id;
              const pct = activeStudentsCount > 0 ? Math.round((c._count.students / activeStudentsCount) * 100) : 0;
              return (
                <Link
                  key={c.id}
                  href={isSelected ? "/" : `/?campus=${c.id}`}
                  className={`p-4 rounded-xl border transition-all flex flex-col justify-between space-y-3 group ${
                    isSelected
                      ? "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-500 shadow-xs"
                      : "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/70"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 uppercase">
                          {c.code}
                        </span>
                        {isSelected && (
                          <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                            Active Filter
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-xs text-slate-900 dark:text-white mt-1 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition">
                        {c.name}
                      </h3>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition shrink-0" />
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-center">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Students</span>
                      <span className="font-bold font-mono text-xs text-slate-900 dark:text-white">
                        {c._count.students}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Staff</span>
                      <span className="font-bold font-mono text-xs text-slate-900 dark:text-white">
                        {c._count.employees}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Classes</span>
                      <span className="font-bold font-mono text-xs text-slate-900 dark:text-white">
                        {c._count.classes}
                      </span>
                    </div>
                  </div>

                  {/* Visual Enrollment Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                      <span>Share</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${Math.max(pct, c._count.students > 0 ? 6 : 0)}%` }}
                      />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right Column (1 Col): Portal Operations & System Vital Signs */}
        <div className="bg-white dark:bg-boxdark rounded-2xl border border-slate-200/80 dark:border-strokedark p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Operations &amp; Vitals
                </h2>
              </div>
              <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
                Live
              </span>
            </div>

            <div className="space-y-2.5 mt-3">
              {/* Online Registration Portal Status */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      systemSettings.isRegistrationOpen ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
                    }`}
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      Public Registration Desk
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      {systemSettings.isRegistrationOpen ? "Online applications OPEN" : "Online applications CLOSED"}
                    </span>
                  </div>
                </div>
                {canViewRbac ? (
                  <OnlineRegistrationToggle initialIsOpen={systemSettings.isRegistrationOpen} compact />
                ) : (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      systemSettings.isRegistrationOpen
                        ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300"
                        : "bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300"
                    }`}
                  >
                    {systemSettings.isRegistrationOpen ? "OPEN" : "CLOSED"}
                  </span>
                )}
              </div>

              {/* Staff Roster Composition */}
              {canViewEmployees && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <Briefcase className="w-4 h-4 text-sky-700 dark:text-sky-400 shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                        Workforce Composition
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        {teachingStaffCount} Teaching • {nonTeachingStaffCount} Admin / Support
                      </span>
                    </div>
                  </div>
                  <Link
                    href="/employees"
                    className="text-[10px] font-bold text-sky-700 dark:text-sky-400 hover:underline shrink-0"
                  >
                    View →
                  </Link>
                </div>
              )}

              {/* TC & Retention Status */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <Activity className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      Student Retention Rate
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      {activeStudentsCount > 0
                        ? `${((activeStudentsCount / (activeStudentsCount + tcIssuedCount)) * 100).toFixed(1)}% active enrollment`
                        : "100% stable"}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-bold font-mono text-slate-600 dark:text-slate-300">
                  {tcIssuedCount} TCs
                </span>
              </div>
            </div>
          </div>

          {/* Quick Shortcuts Command Hub */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Quick Shortcuts
            </span>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/students/new"
                className="flex items-center gap-1.5 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition border border-emerald-200/60 dark:border-emerald-800"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="truncate">New Student</span>
              </Link>
              <Link
                href="/employees/new"
                className="flex items-center gap-1.5 p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition border border-slate-200 dark:border-slate-700"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span className="truncate">Add Staff</span>
              </Link>
              <Link
                href="/tc"
                className="flex items-center gap-1.5 p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition border border-slate-200 dark:border-slate-700"
              >
                <FileCheck className="w-3.5 h-3.5" />
                <span className="truncate">Issue TC</span>
              </Link>
              <Link
                href="/admin/rbac"
                className="flex items-center gap-1.5 p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition border border-slate-200 dark:border-slate-700"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span className="truncate">RBAC Hub</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Lower Section: Brief Recent Admissions & Compact Trend Velocity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Brief Recent Admissions Activity List */}
        {canViewStudents && (
          <div className="rounded-2xl border border-slate-200/80 dark:border-strokedark bg-white dark:bg-boxdark p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Recent Admissions</h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Latest enrolled students across campuses
                </p>
              </div>
              <Link
                href="/students"
                className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                <span>View Full Roster ({activeStudentsCount})</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentStudents.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">No recent admissions found.</div>
              ) : (
                recentStudents.map((s) => (
                  <div
                    key={s.id}
                    className="py-2.5 px-2 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-400 flex items-center justify-center font-black text-xs border border-emerald-200/60 dark:border-emerald-800 shrink-0">
                        {s.firstName[0]}
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/students/${s.id}`}
                          className="font-bold text-slate-900 dark:text-white text-xs truncate hover:text-emerald-700 dark:hover:text-emerald-400 block"
                        >
                          {s.firstName} {s.lastName}
                        </Link>
                        <div className="text-[10px] text-slate-500 font-mono truncate">
                          {s.scholarNo} • {s.class.name}-{s.section?.name || "A"} • {s.campus.name}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 shrink-0">
                      Enrolled
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Compact Enrollment Trend Chart */}
        {canViewStudents && (
          <div className="rounded-2xl border border-slate-200/80 dark:border-strokedark bg-white dark:bg-boxdark p-5 shadow-xs space-y-4">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Enrollment Trend (12 Months)</h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Monthly admission volume influx
                </p>
              </div>
              <div className="text-right shrink-0">
                <div className="text-lg font-bold font-mono text-slate-900 dark:text-white">
                  {totalAdmissionsThisWindow}
                </div>
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
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
      </div>
    </div>
  );
}
