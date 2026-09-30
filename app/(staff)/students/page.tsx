import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { listAcademicSessions, resolveSessionScope } from "@/lib/academic-session";
import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";
import { formatDate } from "@/lib/utils";
import { getCurrentUser, getUserPermissions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { deleteStudent } from "@/lib/actions";
import { DeleteStudentButton } from "@/components/DeleteStudentButton";
import { BulkImportModal } from "@/components/BulkImportModal";
import { LiveSearchInput } from "@/components/LiveSearchInput";
import { Pagination } from "@/components/Pagination";
import {
  Users,
  UserPlus,
  Eye,
  Search,
  Filter,
  Lock,
  ArrowRight,
  ClipboardList,
  Sparkles,
  Pencil,
  Trash2,
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
    session?: string;
    page?: string;
  }>;
}) {
  const { campus: campusId, classId, status, q, session, page: pageStr } = await searchParams;
  const user = await getCurrentUser();
  const permissions = await getUserPermissions(user);

  if (!permissions.modules.students.canView && !permissions.isAdmin) {
    redirect("/?error=unauthorized_students");
  }

  const currentPage = Math.max(1, parseInt(pageStr || "1", 10));
  const pageSize = 10;

  const campuses = await prisma.campus.findMany({
    orderBy: { name: "asc" },
  });

  const classes = await prisma.class.findMany({
    where: campusId && campusId !== "ALL" ? { campusId } : {},
    orderBy: { sequence: "asc" },
  });

  // Session view filter — defaults to the current session so the list matches
  // what the navbar switcher is showing.
  const sessionScope = resolveSessionScope(session, await listAcademicSessions());

  // Build filter query
  const whereClause: any = { ...sessionScope.studentWhere };
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
      { firstName: { contains: q, mode: "insensitive" } },
      { lastName: { contains: q, mode: "insensitive" } },
      { scholarNo: { contains: q, mode: "insensitive" } },
      { admissionNo: { contains: q, mode: "insensitive" } },
      { registrationNo: { contains: q, mode: "insensitive" } },
    ];
  }

  const [students, totalCount] = await Promise.all([
    prisma.student.findMany({
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
      take: pageSize,
      skip: (currentPage - 1) * pageSize,
    }),
    prisma.student.count({ where: whereClause }),
  ]);

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  const customColumns = prisma.directoryColumn
    ? await prisma.directoryColumn.findMany({
        where: { isVisibleInDirectory: true },
        orderBy: { sequence: "asc" },
      })
    : [];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-boxdark p-5 rounded-2xl border border-slate-200/80 dark:border-strokedark shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700 flex items-center justify-center font-bold">
              <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Student Directory</h1>
              <p className="text-xs text-slate-500 dark:text-bodydark2 mt-0.5">
                Centralized registry of registered applicants and enrolled students across DPS Kanpur.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {permissions.modules.students.canUpdate ? (
            <>
              <Link
                href="/students/new"
                className="inline-flex items-center gap-2 bg-[#0F9D58] hover:bg-[#0d8a4d] text-white px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ New Student Registration</span>
              </Link>
              <BulkImportModal />
            </>
          ) : (
            <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-400 px-3 py-1.5 rounded-xl text-xs font-semibold">
              <Lock className="w-3.5 h-3.5" />
              View-Only Mode ({permissions.roleDisplayName})
            </div>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-boxdark p-4 rounded-2xl border border-slate-200/80 dark:border-strokedark shadow-xs flex flex-wrap items-center gap-4">
        {/* Live Search */}
        <LiveSearchInput
          defaultValue={q}
          placeholder="Search by student name, registration ID or scholar no..."
          className="flex-1 min-w-[240px]"
        />

        {/* Class Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <form method="GET" className="flex items-center gap-2">
            {campusId && <input type="hidden" name="campus" value={campusId} />}
            <select
              name="classId"
              defaultValue={classId || "ALL"}
              aria-label="Filter by class"
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-strokedark text-xs rounded-xl px-3 py-2 font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
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
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-strokedark text-xs rounded-xl px-3 py-2 font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="ALL">All Enrolment States</option>
              <option value="REGISTERED">Registered Applicants</option>
              <option value="ACTIVE">Active Enrolled</option>
              <option value="TC_ISSUED">TC Issued</option>
            </select>

            <button
              type="submit"
              className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs px-4 py-2 rounded-xl font-bold transition hover:bg-slate-800"
            >
              Apply
            </button>
          </form>
        </div>
      </div>

      {/* Student Table */}
      <div className="bg-white dark:bg-boxdark rounded-2xl border border-slate-200/80 dark:border-strokedark shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider border-b border-slate-800">
                    <th className="py-3.5 px-4">Registration / Scholar ID</th>
                    <th className="py-3.5 px-4">Student Name</th>
                    <th className="py-3.5 px-4">Campus & Class</th>
                    <th className="py-3.5 px-4">Parent / Contact</th>
                    {customColumns.map((col) => (
                      <th key={col.id} className="py-3.5 px-4">
                        {col.label}
                      </th>
                    ))}
                    <th className="py-3.5 px-4">Enrolment Status</th>
                    <th className="py-3.5 px-4">Fee Dues</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan={7 + customColumns.length} className="py-8 text-center text-slate-400">
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

                          {/* Dynamic Custom Columns */}
                          {customColumns.map((col) => {
                            let val = "";
                            if (s.customValuesJson) {
                              try {
                                const parsed = JSON.parse(s.customValuesJson);
                                val = parsed[col.key] || "";
                              } catch {
                                val = "";
                              }
                            }
                            if (!val && col.key in s) {
                              val = String((s as any)[col.key] || "");
                            }
                            return (
                              <td key={col.id} className="py-3.5 px-4 text-xs font-medium text-slate-700">
                                {val || "-"}
                              </td>
                            );
                          })}

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
                              {/* 1. View Student Record */}
                              <Link
                                href={`/students/${s.id}`}
                                title="View Student Record"
                                className="inline-flex items-center gap-1 p-1.5 bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 rounded-lg text-slate-600 transition"
                              >
                                <Eye className="w-4 h-4" />
                              </Link>

                              {/* 2. Edit Student Record */}
                              <Link
                                href={`/students/${s.id}?edit=true`}
                                title="Edit Student Details"
                                className="inline-flex items-center gap-1 p-1.5 bg-slate-100 hover:bg-amber-100 hover:text-amber-800 rounded-lg text-slate-600 transition"
                              >
                                <Pencil className="w-4 h-4" />
                              </Link>

                              {permissions.isAdmin && (
                                <DeleteStudentButton
                                  studentId={s.id}
                                  studentName={`${s.firstName} ${s.lastName}`}
                                  action={deleteStudent}
                                />
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
