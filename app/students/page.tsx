import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";
import { formatDate } from "@/lib/utils";
import { getCurrentUser, getUserPermissions } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  Users,
  UserPlus,
  Eye,
  CreditCard,
  FileText,
  Search,
  Filter,
  Lock,
  ArrowRight,
  ClipboardList,
  Sparkles,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    campus?: string;
    classId?: string;
    status?: string;
    q?: string;
  }>;
}) {
  const { campus: campusId, classId, status, q } = await searchParams;
  const user = await getCurrentUser();
  const permissions = await getUserPermissions(user);

  if (!permissions.modules.students.canView && !permissions.isAdmin) {
    redirect("/?error=unauthorized_students");
  }

  const campuses = await prisma.campus.findMany({
    orderBy: { name: "asc" },
  });

  const classes = await prisma.class.findMany({
    where: campusId && campusId !== "ALL" ? { campusId } : {},
    orderBy: { sequence: "asc" },
  });

  // Build filter query
  const whereClause: any = {};
  if (campusId && campusId !== "ALL") {
    whereClause.campusId = campusId;
  }
  if (classId && classId !== "ALL") {
    whereClause.classId = classId;
  }
  if (status && status !== "ALL") {
    whereClause.status = status;
  } else {
    // Default to active and registered unless specified
    whereClause.status = { not: "ALUMNI" };
  }

  if (q) {
    whereClause.OR = [
      { firstName: { contains: q } },
      { lastName: { contains: q } },
      { scholarNo: { contains: q } },
      { admissionNo: { contains: q } },
      { registrationNo: { contains: q } },
    ];
  }

  const students = await prisma.student.findMany({
    where: whereClause,
    include: {
      campus: true,
      class: true,
      section: true,
      guardians: { where: { isPrimary: true } },
      invoices: {
        where: { status: { in: ["PENDING", "PARTIALLY_PAID", "OVERDUE"] } },
      },
    },
    orderBy: [{ class: { sequence: "asc" } }, { firstName: "asc" }],
  });

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar userEmail={user?.email} userRole={user?.role} permissions={permissions} />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar campuses={campuses} selectedCampusId={campusId} user={user || undefined} permissions={permissions} />

        <main className="p-8 space-y-6 flex-1 overflow-y-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-800" />
                <h1 className="text-xl font-black text-slate-900">Student Directory</h1>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Centralized registry of registered applicants and enrolled students across DPS Kanpur.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {permissions.modules.students.canUpdate ? (
                <Link
                  href="/students/new"
                  className="inline-flex items-center gap-2 bg-emerald-800 hover:bg-emerald-900 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-sm"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>+ New Student Registration</span>
                </Link>
              ) : (
                <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1.5 rounded-lg text-xs font-medium">
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                  View-Only Mode ({permissions.roleDisplayName})
                </div>
              )}
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-4">
            {/* Search */}
            <form method="GET" className="flex-1 min-w-[240px] relative">
              {campusId && <input type="hidden" name="campus" value={campusId} />}
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                name="q"
                defaultValue={q || ""}
                placeholder="Search by student name, registration ID or scholar no..."
                className="w-full bg-slate-50 text-xs border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </form>

            {/* Class Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <form method="GET" className="flex items-center gap-2">
                {campusId && <input type="hidden" name="campus" value={campusId} />}
                <select
                  name="classId"
                  defaultValue={classId || "ALL"}
                  aria-label="Filter by class"
                  className="bg-slate-50 border border-slate-200 text-xs rounded-lg px-2.5 py-2 font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="ALL">All Classes</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>

                <select
                  name="status"
                  defaultValue={status || "ALL"}
                  aria-label="Filter by status"
                  className="bg-slate-50 border border-slate-200 text-xs rounded-lg px-2.5 py-2 font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="ALL">All Enrolment States</option>
                  <option value="REGISTERED">Registered Applicants</option>
                  <option value="ACTIVE">Active Enrolled</option>
                  <option value="TC_ISSUED">TC Issued</option>
                </select>

                <button
                  type="submit"
                  className="bg-slate-800 hover:bg-slate-900 text-white text-xs px-3 py-2 rounded-lg font-semibold transition"
                >
                  Apply
                </button>
              </form>
            </div>
          </div>

          {/* Student Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 px-4">Registration / Scholar ID</th>
                    <th className="py-3.5 px-4">Student Name</th>
                    <th className="py-3.5 px-4">Campus & Class</th>
                    <th className="py-3.5 px-4">Parent / Contact</th>
                    <th className="py-3.5 px-4">Enrolment Status</th>
                    <th className="py-3.5 px-4">Fee Dues</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No students found matching the selected criteria.
                      </td>
                    </tr>
                  ) : (
                    students.map((s) => {
                      const primaryGuardian = s.guardians[0];
                      const pendingInvoices = s.invoices.length;
                      const hasDues = pendingInvoices > 0;
                      const isRegisteredOnly = s.status === "REGISTERED";

                      return (
                        <tr key={s.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3.5 px-4">
                            {isRegisteredOnly ? (
                              <div>
                                <span className="font-mono font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-xs inline-block">
                                  {s.registrationNo || s.scholarNo}
                                </span>
                                <span className="text-[10px] text-slate-400 block mt-0.5">
                                  Reg: {s.registrationDate ? formatDate(s.registrationDate) : "Recent"}
                                </span>
                              </div>
                            ) : (
                              <div>
                                <span className="font-mono font-bold text-slate-900 block">
                                  {s.scholarNo}
                                </span>
                                {s.registrationNo && (
                                  <span className="font-mono text-[10px] text-emerald-700 block font-semibold">
                                    Reg ID: {s.registrationNo}
                                  </span>
                                )}
                                <span className="text-[10px] text-slate-400 block">
                                  Adm: {formatDate(s.admissionDate)}
                                </span>
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-8 h-8 rounded-full border font-bold text-xs flex items-center justify-center shrink-0 ${
                                  isRegisteredOnly
                                    ? "bg-amber-50 border-amber-200 text-amber-800"
                                    : "bg-emerald-50 border-emerald-200 text-emerald-800"
                                }`}
                              >
                                {s.firstName[0]}
                                {s.lastName[0]}
                              </div>
                              <div>
                                <Link
                                  href={`/students/${s.id}`}
                                  className="font-bold text-slate-900 hover:text-emerald-800 transition"
                                >
                                  {s.firstName} {s.lastName}
                                </Link>
                                <span className="block text-[11px] text-slate-400">
                                  DOB: {formatDate(s.dob)} • {s.gender}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="font-bold text-slate-800 block">
                              {s.class.name} {s.section ? `(${s.section.name})` : ""}
                            </span>
                            <span className="text-[10px] font-semibold text-emerald-700">
                              {s.campus.name}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="font-medium text-slate-800 block">
                              {primaryGuardian?.name || "N/A"}
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono">
                              {primaryGuardian?.phone || s.emergencyContact || "-"}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                                isRegisteredOnly
                                  ? "bg-amber-100 text-amber-900 border border-amber-200"
                                  : s.status === "ACTIVE"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : s.status === "TC_ISSUED"
                                  ? "bg-purple-100 text-purple-800"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {isRegisteredOnly ? "REGISTERED (PENDING ADMISSION)" : s.status}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            {isRegisteredOnly ? (
                              <span className="text-[11px] text-amber-700 font-medium italic">
                                Pending Admission
                              </span>
                            ) : hasDues ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                                {pendingInvoices} Pending
                              </span>
                            ) : (
                              <span className="text-[11px] text-emerald-700 font-medium">
                                ✓ Cleared
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isRegisteredOnly ? (
                                <Link
                                  href={`/students/new?promoteStudentId=${s.id}`}
                                  title="Promote to Full Admission"
                                  className="inline-flex items-center gap-1 bg-emerald-800 hover:bg-emerald-900 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition shadow-xs"
                                >
                                  <span>Promote to Admission</span>
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </Link>
                              ) : (
                                <>
                                  <Link
                                    href={`/students/${s.id}`}
                                    title="View Dossier"
                                    className="p-1.5 bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 rounded-md text-slate-600 transition"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Link>
                                  {s.status === "ACTIVE" && (
                                    <>
                                      <Link
                                        href={`/fees/collect?studentId=${s.id}`}
                                        title="Collect Fees"
                                        className="p-1.5 bg-slate-100 hover:bg-teal-100 hover:text-teal-800 rounded-md text-slate-600 transition"
                                      >
                                        <CreditCard className="w-4 h-4" />
                                      </Link>
                                      <Link
                                        href={`/tc?studentId=${s.id}`}
                                        title="Issue TC"
                                        className="p-1.5 bg-slate-100 hover:bg-purple-100 hover:text-purple-800 rounded-md text-slate-600 transition"
                                      >
                                        <FileText className="w-4 h-4" />
                                      </Link>
                                    </>
                                  )}
                                </>
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
      </div>
    </div>
  );
}
