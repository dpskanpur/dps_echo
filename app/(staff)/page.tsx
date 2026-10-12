import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { requireUser, getUserPermissions } from "@/lib/auth";
import { resolveCampusScope } from "@/lib/permissions";
import { TrendChart, TrendPoint } from "@/components/TrendChart";
import { SessionTimeoutCountdown } from "@/components/SessionTimeoutCountdown";
import { Card, Badge, Table, TableHead, TableRow, TableHeaderCell, TableBody, TableCell } from "@/components/tremor";
import { ExportCsvButton } from "@/components/ExportCsvButton";
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
            <div className="w-10 h-10 rounded bg-[#0F9D58] flex items-center justify-center font-bold text-white text-lg">
              DE
            </div>
            <div>
              <h1 className="font-bold text-white text-base">DPS Echo</h1>
              <p className="text-xs text-slate-400">Institutional Access Gateway</p>
            </div>
          </div>

          <div className="text-xs font-mono text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded border border-slate-700">
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
  /* const canViewFees = permissions.modules.fees.canView; -- Fee module temporarily disabled */
  const canViewFees = false;
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

  // Financial Metrics - TEMPORARILY DISABLED
  /*
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
  */

  // Recent Admissions
  const recentStudents = canViewStudents
    ? await prisma.student.findMany({
        where: filterCampus,
        include: { campus: true, class: true, section: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      })
    : [];

  // Twelve-month trends
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
    <div className="space-y-4">
      {/* Top Operations Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-base font-semibold text-slate-900 tracking-tight">Operations Overview</h1>
          <p className="text-xs text-slate-500">Cross-campus administration desk: Azad Nagar, Barra, Kidwai Nagar, Servodaya Nagar</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border bg-slate-50 text-slate-700 border-slate-200">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-600" />
            <span>{permissions.roleDisplayName}</span>
          </span>
          {canViewRbac && (
            <Link
              href="/admin/rbac"
              className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-medium text-slate-700 transition"
            >
              <KeyRound className="w-3 h-3 text-slate-500" />
              <span>RBAC Matrix</span>
            </Link>
          )}
        </div>
      </div>

      {/* Horizontal KPI Strip (Single Card, divide-x, high density) */}
      <Card className="p-0 rounded-md shadow-none border border-slate-200 bg-white">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-200">
          <div className="px-4 py-3 space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Active Students</span>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xl font-semibold tabular-nums text-slate-900 font-mono">{activeStudentsCount}</span>
              <Badge variant="success" dot={false} className="text-[10px] font-mono">+2.4%</Badge>
            </div>
            <div className="text-[11px] text-slate-500">Enrolled across campuses</div>
          </div>

          <div className="px-4 py-3 space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">TCs Issued</span>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xl font-semibold tabular-nums text-slate-900 font-mono">{tcIssuedCount}</span>
              <Badge variant="neutral" dot={false} className="text-[10px]">CBSE</Badge>
            </div>
            <div className="text-[11px] text-slate-500">Board clearance compliant</div>
          </div>

          <div className="px-4 py-3 space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Graduated Alumni</span>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xl font-semibold tabular-nums text-slate-900 font-mono">{alumniCount}</span>
              <Badge variant="info" dot={false} className="text-[10px]">Archived</Badge>
            </div>
            <div className="text-[11px] text-slate-500">Permanent records</div>
          </div>

          <div className="px-4 py-3 space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Authorized Campuses</span>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xl font-semibold tabular-nums text-slate-900 font-mono">{campuses.length}</span>
              <Badge variant="default" dot={false} className="text-[10px]">Active</Badge>
            </div>
            <div className="text-[11px] text-slate-500">Operational units</div>
          </div>
        </div>
      </Card>

      {/* Main Grid: Enrollment Velocity & Recent Enrolments */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Enrollment Velocity Chart Card */}
        {canViewStudents && (
          <Card className="p-4 rounded-md shadow-none border border-slate-200 bg-white space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-900">Enrollment Velocity</h2>
                <p className="text-[11px] text-slate-500">Trailing 12-month admission intake</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center border border-slate-200 rounded text-[11px] font-medium overflow-hidden">
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-900 font-semibold border-r border-slate-200">12M</span>
                  <span className="px-2 py-0.5 text-slate-500 hover:bg-slate-50 border-r border-slate-200 cursor-pointer">YTD</span>
                  <span className="px-2 py-0.5 text-slate-500 hover:bg-slate-50 cursor-pointer">QTD</span>
                </div>
                <ExportCsvButton
                  filename="enrollment-trend"
                  data={enrollmentTrend}
                  headers={[
                    { key: "label", label: "Month" },
                    { key: "primary", label: "Admissions" },
                  ]}
                />
              </div>
            </div>

            <div className="pt-1">
              <div className="flex items-baseline justify-between pb-2 text-xs">
                <span className="text-slate-500">Total Enrolled in Window</span>
                <span className="font-mono font-semibold text-slate-900">{totalAdmissionsThisWindow} students</span>
              </div>
              <TrendChart
                points={enrollmentTrend}
                primaryLabel="New admissions"
                formatValue={(v) => `${v} student${v === 1 ? "" : "s"}`}
              />
            </div>
          </Card>
        )}

        {/* Recent Enrolments Dense ERP Table */}
        {canViewStudents && (
          <Card className="p-0 rounded-md shadow-none border border-slate-200 bg-white overflow-hidden">
            <div className="px-3 py-2.5 flex items-center justify-between border-b border-slate-200 bg-slate-50/60">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-900">Recent Enrolments</h2>
                <span className="text-[11px] font-mono text-slate-500">({recentStudents.length} latest)</span>
              </div>
              <div className="flex items-center gap-2">
                <ExportCsvButton
                  filename="recent-enrolments"
                  data={recentStudents.map((s) => ({
                    scholarNo: s.scholarNo,
                    name: `${s.firstName} ${s.lastName}`,
                    class: `${s.class.name}-${s.section?.name || "A"}`,
                    campus: s.campus.name,
                    status: s.status,
                    admissionDate: s.admissionDate ? formatDate(s.admissionDate) : "",
                  }))}
                  headers={[
                    { key: "scholarNo", label: "Scholar No" },
                    { key: "name", label: "Student Name" },
                    { key: "class", label: "Class & Section" },
                    { key: "campus", label: "Campus" },
                    { key: "status", label: "Status" },
                    { key: "admissionDate", label: "Admission Date" },
                  ]}
                />
                <Link
                  href="/students"
                  className="text-xs font-medium text-slate-700 hover:text-slate-900 hover:underline flex items-center gap-1"
                >
                  <span>View Roster</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>

            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell className="py-2 px-3">Scholar ID</TableHeaderCell>
                  <TableHeaderCell className="py-2 px-3">Student Name</TableHeaderCell>
                  <TableHeaderCell className="py-2 px-3">Class</TableHeaderCell>
                  <TableHeaderCell className="py-2 px-3">Campus</TableHeaderCell>
                  <TableHeaderCell className="py-2 px-3">Status</TableHeaderCell>
                  <TableHeaderCell className="py-2 px-3 text-right">Action</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-xs text-slate-400">
                      No recent student admissions found.
                    </TableCell>
                  </TableRow>
                ) : (
                  recentStudents.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="py-2 px-3 font-mono text-xs text-slate-700">
                        {s.scholarNo}
                      </TableCell>
                      <TableCell className="py-2 px-3 font-medium text-slate-900">
                        <Link href={`/students/${s.id}`} className="hover:underline">
                          {s.firstName} {s.lastName}
                        </Link>
                      </TableCell>
                      <TableCell className="py-2 px-3 text-xs text-slate-600">
                        {s.class.name}-{s.section?.name || "A"}
                      </TableCell>
                      <TableCell className="py-2 px-3 text-xs text-slate-600 font-mono">
                        {s.campus.code}
                      </TableCell>
                      <TableCell className="py-2 px-3">
                        <Badge variant="success">Enrolled</Badge>
                      </TableCell>
                      <TableCell className="py-2 px-3 text-right">
                        <Link
                          href={`/students/${s.id}`}
                          className="text-xs text-slate-600 hover:text-slate-900 font-medium hover:underline"
                        >
                          Inspect
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </div>
  );
}
