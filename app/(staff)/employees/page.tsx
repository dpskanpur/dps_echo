import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { getCurrentUser, getUserPermissions } from "@/lib/auth";
import { resolveCampusScope } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { deleteEmployee } from "@/lib/employee-actions";
import { DeleteEmployeeButton } from "@/components/DeleteEmployeeButton";
import { EmployeeBulkImportModal } from "@/components/EmployeeBulkImportModal";
import { LiveSearchInput } from "@/components/LiveSearchInput";
import { Pagination } from "@/components/Pagination";
import {
  Briefcase,
  UserPlus,
  Eye,
  Filter,
  Lock,
  Pencil,
  GraduationCap,
  Building2,
  UserCheck,
  Clock,
  ShieldCheck,
  Phone,
} from "lucide-react";

export const dynamic = "force-dynamic";

const CATEGORY_BADGES: Record<string, { label: string; className: string }> = {
  TEACHING: {
    label: "Teaching Faculty",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800",
  },
  NON_TEACHING: {
    label: "Non-Teaching",
    className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800",
  },
  ADMIN: {
    label: "Administration",
    className: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800",
  },
  SUPPORT: {
    label: "Support Staff",
    className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
  },
};

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  ACTIVE: {
    label: "Active",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800",
  },
  ON_LEAVE: {
    label: "On Leave",
    className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800",
  },
  RESIGNED: {
    label: "Resigned",
    className: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-800",
  },
  RETIRED: {
    label: "Retired",
    className: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  },
  TRANSFERRED: {
    label: "Transferred",
    className: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800",
  },
};

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{
    campus?: string;
    category?: string;
    status?: string;
    q?: string;
    page?: string;
  }>;
}) {
  const { campus: rawCampusId, category, status, q, page: pageStr } = await searchParams;
  const user = await getCurrentUser();
  const permissions = await getUserPermissions(user);

  if (!permissions.modules.employees?.canView && !permissions.isAdmin) {
    redirect("/?error=unauthorized_employees");
  }

  const campusScope = resolveCampusScope(user, rawCampusId);
  const currentPage = Math.max(1, parseInt(pageStr || "1", 10));
  const pageSize = 12;

  const campuses = await prisma.campus.findMany({
    where: campusScope.locked && campusScope.campusId ? { id: campusScope.campusId } : {},
    orderBy: { name: "asc" },
  });

  // Base campus filter for KPIs
  const baseCampusWhere: any = { ...campusScope.where };

  // Build filter query for table
  const whereClause: any = { ...campusScope.where };
  if (category && category !== "ALL") {
    whereClause.category = category;
  }
  if (status && status !== "ALL") {
    whereClause.status = status;
  } else {
    // Show active & on-leave by default unless ALL or specific exited status chosen
    whereClause.status = { in: ["ACTIVE", "ON_LEAVE"] };
  }

  if (q) {
    whereClause.OR = [
      { firstName: { contains: q, mode: "insensitive" } },
      { lastName: { contains: q, mode: "insensitive" } },
      { employeeCode: { contains: q, mode: "insensitive" } },
      { designation: { contains: q, mode: "insensitive" } },
      { department: { contains: q, mode: "insensitive" } },
      { subjectsTaught: { contains: q, mode: "insensitive" } },
      { oasisId: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
    ];
  }

  const [
    employees,
    totalCount,
    activeCount,
    teachingCount,
    adminSupportCount,
    onLeaveCount,
  ] = await Promise.all([
    prisma.employee.findMany({
      where: whereClause,
      include: {
        campus: true,
        _count: { select: { documents: true } },
      },
      orderBy: [{ status: "asc" }, { firstName: "asc" }],
      take: pageSize,
      skip: (currentPage - 1) * pageSize,
    }),
    prisma.employee.count({ where: whereClause }),
    prisma.employee.count({ where: { ...baseCampusWhere, status: "ACTIVE" } }),
    prisma.employee.count({ where: { ...baseCampusWhere, status: "ACTIVE", category: "TEACHING" } }),
    prisma.employee.count({
      where: { ...baseCampusWhere, status: "ACTIVE", category: { in: ["NON_TEACHING", "ADMIN", "SUPPORT"] } },
    }),
    prisma.employee.count({ where: { ...baseCampusWhere, status: "ON_LEAVE" } }),
  ]);

  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const canUpdate = permissions.modules.employees?.canUpdate || permissions.isAdmin;
  const canDelete = permissions.modules.employees?.canDelete || permissions.isAdmin;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-boxdark p-5 rounded-2xl border border-slate-200/80 dark:border-strokedark shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700 flex items-center justify-center font-bold">
            <Briefcase className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                Faculty &amp; Staff Directory
              </h1>
              {campusScope.locked && campuses[0] && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 rounded-full">
                  <Building2 className="w-3 h-3" />
                  {campuses[0].name} Scope
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-bodydark2 mt-0.5">
              Zero-payroll HR records, CBSE OASIS credentials, academic assignments, and document vault.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {canUpdate ? (
            <>
              <Link
                href="/employees/new"
                className="inline-flex items-center gap-2 bg-[#0F9D58] hover:bg-[#0d8a4d] text-white px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Add Employee</span>
              </Link>
              <EmployeeBulkImportModal defaultCampusId={campusScope.campusId || undefined} />
            </>
          ) : (
            <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-400 px-3 py-1.5 rounded-xl text-xs font-semibold">
              <Lock className="w-3.5 h-3.5" />
              View-Only Mode ({permissions.roleDisplayName})
            </div>
          )}
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-boxdark p-4 rounded-2xl border border-slate-200/80 dark:border-strokedark shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Staff</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{activeCount}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Currently on rolls</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-boxdark p-4 rounded-2xl border border-slate-200/80 dark:border-strokedark shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Teaching Faculty</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{teachingCount}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">PGT / TGT / PRT / Pre-Primary</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <GraduationCap className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-boxdark p-4 rounded-2xl border border-slate-200/80 dark:border-strokedark shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Admin &amp; Support</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{adminSupportCount}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Office, Lab, Library &amp; Support</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-boxdark p-4 rounded-2xl border border-slate-200/80 dark:border-strokedark shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">On Leave</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{onLeaveCount}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Approved leave / sabbatical</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-boxdark p-4 rounded-2xl border border-slate-200/80 dark:border-strokedark shadow-xs flex flex-wrap items-center gap-4">
        <LiveSearchInput
          defaultValue={q}
          placeholder="Search by employee name, EMP code, designation, subject, or OASIS ID..."
          className="flex-1 min-w-[240px]"
        />

        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-slate-400" />
          <form method="GET" className="flex items-center gap-2 flex-wrap">
            {q && <input type="hidden" name="q" value={q} />}

            {!campusScope.locked && (
              <select
                name="campus"
                defaultValue={campusScope.campusId || "ALL"}
                aria-label="Filter by campus"
                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-strokedark text-xs rounded-xl px-3 py-2 font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="ALL">All Campuses</option>
                {campuses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}

            <select
              name="category"
              defaultValue={category || "ALL"}
              aria-label="Filter by category"
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-strokedark text-xs rounded-xl px-3 py-2 font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="ALL">All Categories</option>
              <option value="TEACHING">Teaching Faculty</option>
              <option value="NON_TEACHING">Non-Teaching</option>
              <option value="ADMIN">Administration</option>
              <option value="SUPPORT">Support Staff</option>
            </select>

            <select
              name="status"
              defaultValue={status || "ALL"}
              aria-label="Filter by status"
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-strokedark text-xs rounded-xl px-3 py-2 font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="ALL">Active &amp; On Leave</option>
              <option value="ACTIVE">Active Only</option>
              <option value="ON_LEAVE">On Leave</option>
              <option value="RESIGNED">Resigned</option>
              <option value="RETIRED">Retired</option>
              <option value="TRANSFERRED">Transferred</option>
            </select>

            <button
              type="submit"
              className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs px-4 py-2 rounded-xl font-bold transition hover:bg-slate-800 cursor-pointer"
            >
              Apply
            </button>
          </form>
        </div>
      </div>

      {/* Employee Directory Table */}
      <div className="bg-white dark:bg-boxdark rounded-2xl border border-slate-200/80 dark:border-strokedark shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="sticky top-0 z-10 bg-slate-100/90 dark:bg-slate-900/90 backdrop-blur-xs text-slate-700 dark:text-slate-200 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <th className="py-3.5 px-4">Employee ID</th>
                <th className="py-3.5 px-4">Staff Member</th>
                <th className="py-3.5 px-4">Campus &amp; Category</th>
                <th className="py-3.5 px-4">Designation &amp; Dept</th>
                <th className="py-3.5 px-4">CBSE OASIS &amp; Assignments</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="space-y-2">
                      <Briefcase className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                      <p className="font-medium">No employees found matching the selected criteria.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                employees.map((emp) => {
                  const catBadge = CATEGORY_BADGES[emp.category] || CATEGORY_BADGES.TEACHING;
                  const statusBadge = STATUS_BADGES[emp.status] || STATUS_BADGES.ACTIVE;

                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs inline-block">
                          {emp.employeeCode}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-1">
                          Joined {formatDate(emp.joiningDate)}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {emp.photoUrl ? (
                            <img
                              src={emp.photoUrl}
                              alt={`${emp.firstName} ${emp.lastName}`}
                              className="w-9 h-9 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
                              {emp.firstName.charAt(0)}
                              {emp.lastName ? emp.lastName.charAt(0) : ""}
                            </div>
                          )}
                          <div>
                            <Link
                              href={`/employees/${emp.id}`}
                              className="font-bold text-slate-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 transition"
                            >
                              {emp.firstName} {emp.lastName}
                            </Link>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                              <span className="inline-flex items-center gap-1">
                                <Phone className="w-3 h-3 text-slate-400" />
                                {emp.phone}
                              </span>
                              {emp.bloodGroup && (
                                <span className="text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.2 rounded">
                                  {emp.bloodGroup}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {emp.campus.name}
                        </div>
                        <span
                          className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${catBadge.className}`}
                        >
                          {catBadge.label}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800 dark:text-slate-200">{emp.designation}</div>
                        <div className="text-[11px] text-slate-500">
                          {emp.department || emp.employmentType}
                          {emp.qualification ? ` • ${emp.qualification}` : ""}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          {emp.oasisId ? (
                            <div className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50/70 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200/70 dark:border-emerald-800">
                              <ShieldCheck className="w-3 h-3" />
                              OASIS: {emp.oasisId}
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400">No OASIS ID</span>
                          )}
                          {(emp.assignedClass || emp.subjectsTaught) && (
                            <div className="text-[11px] text-slate-600 dark:text-slate-300 truncate max-w-[220px]">
                              {emp.assignedClass ? `Class Teacher: ${emp.assignedClass}` : emp.subjectsTaught}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border ${statusBadge.className}`}
                        >
                          {statusBadge.label}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-1">
                          {emp._count.documents} Vault Doc(s)
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <Link
                            href={`/employees/${emp.id}`}
                            title="View Employee Dossier"
                            className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 hover:text-emerald-700 dark:hover:text-emerald-400 rounded-lg text-slate-600 dark:text-slate-300 transition"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>

                          {canUpdate && (
                            <Link
                              href={`/employees/${emp.id}?edit=true`}
                              title="Edit Employee Details"
                              className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-blue-950/60 hover:text-blue-700 dark:hover:text-blue-400 rounded-lg text-slate-600 dark:text-slate-300 transition"
                            >
                              <Pencil className="w-4 h-4" />
                            </Link>
                          )}

                          {canDelete && (
                            <DeleteEmployeeButton
                              employeeId={emp.id}
                              employeeName={`${emp.firstName} ${emp.lastName}`}
                              action={async (fd: FormData) => {
                                "use server";
                                const id = fd.get("employeeId") as string;
                                if (id) await deleteEmployee(id);
                              }}
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
