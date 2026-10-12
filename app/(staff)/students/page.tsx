import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { listAcademicSessions, resolveSessionScope } from "@/lib/academic-session";
import { formatDate } from "@/lib/utils";
import { getCurrentUser, getUserPermissions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { deleteStudent } from "@/lib/actions";
import { DeleteStudentButton } from "@/components/DeleteStudentButton";
import { BulkImportModal } from "@/components/BulkImportModal";
import { LiveSearchInput } from "@/components/LiveSearchInput";
import { Pagination } from "@/components/Pagination";
import { ExportCsvButton } from "@/components/ExportCsvButton";
import {
  Card,
  Badge,
  Button,
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
} from "@/components/tremor";
import {
  Users,
  UserPlus,
  Eye,
  Filter,
  Lock,
  Pencil,
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
  const pageSize = 15;

  const campuses = await prisma.campus.findMany({
    orderBy: { name: "asc" },
  });

  const classes = await prisma.class.findMany({
    where: campusId && campusId !== "ALL" ? { campusId } : {},
    orderBy: { sequence: "asc" },
  });

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
        /* Fee module temporarily disabled
        invoices: {
          where: { status: { in: ["PENDING", "PARTIALLY_PAID", "OVERDUE"] } },
        },
        */
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
    <div className="space-y-3">
      {/* Page Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-slate-900 tracking-tight">Student Directory</h1>
            <span className="font-mono text-xs text-slate-500 tabular-nums">
              ({totalCount.toLocaleString()} records)
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Centralized registry of applicants and enrolled students across DPS Kanpur
          </p>
        </div>

        <div className="flex items-center gap-2">
          {permissions.modules.students.canUpdate ? (
            <>
              <Link
                href="/students/new"
                className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition cursor-pointer select-none"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ New Student</span>
              </Link>
              <BulkImportModal />
            </>
          ) : (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 text-slate-700 px-2.5 py-1 rounded text-xs font-medium">
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              <span>View-Only ({permissions.roleDisplayName})</span>
            </div>
          )}
        </div>
      </div>

      {/* Table Toolbar: Search, Filters, CSV Export */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-2 rounded-md border border-slate-200">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          <LiveSearchInput
            defaultValue={q}
            placeholder="Search by student name, scholar no, registration ID..."
            className="w-full sm:max-w-xs"
          />

          <form method="GET" className="flex items-center gap-1.5 flex-wrap">
            {campusId && <input type="hidden" name="campus" value={campusId} />}
            <select
              name="classId"
              defaultValue={classId || "ALL"}
              aria-label="Filter by class"
              className="h-8 bg-white border border-slate-200 text-xs rounded-md px-2 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400 font-medium"
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
              className="h-8 bg-white border border-slate-200 text-xs rounded-md px-2 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400 font-medium"
            >
              <option value="ALL">All States</option>
              <option value="REGISTERED">Registered Applicants</option>
              <option value="ACTIVE">Active Enrolled</option>
              <option value="TC_ISSUED">TC Issued</option>
            </select>

            <Button type="submit" variant="secondary" size="xs">
              <Filter className="w-3 h-3 text-slate-400" />
              <span>Filter</span>
            </Button>
          </form>
        </div>

        <div>
          <ExportCsvButton
            filename="student-directory"
            data={students.map((s) => ({
              scholarNo: s.scholarNo || "",
              regNo: s.registrationNo || "",
              name: `${s.firstName} ${s.lastName}`,
              campus: s.campus.name,
              class: `${s.class.name}-${s.section?.name || "A"}`,
              gender: s.gender,
              dob: s.dob ? formatDate(s.dob) : "",
              guardian: s.guardians[0]?.name || "",
              phone: s.guardians[0]?.phone || s.emergencyContact || "",
              status: s.status,
            }))}
            headers={[
              { key: "scholarNo", label: "Scholar No" },
              { key: "regNo", label: "Registration ID" },
              { key: "name", label: "Student Name" },
              { key: "campus", label: "Campus" },
              { key: "class", label: "Class & Section" },
              { key: "gender", label: "Gender" },
              { key: "dob", label: "Date of Birth" },
              { key: "guardian", label: "Primary Guardian" },
              { key: "phone", label: "Contact Phone" },
              { key: "status", label: "Status" },
            ]}
          />
        </div>
      </div>

      {/* High-Density Data Table */}
      <Card className="p-0 rounded-md shadow-none border border-slate-200 bg-white overflow-hidden">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell className="py-2.5 px-3">Scholar / Reg ID</TableHeaderCell>
              <TableHeaderCell className="py-2.5 px-3">Student Name</TableHeaderCell>
              <TableHeaderCell className="py-2.5 px-3">Class &amp; Campus</TableHeaderCell>
              <TableHeaderCell className="py-2.5 px-3">Guardian &amp; Contact</TableHeaderCell>
              {customColumns.map((col) => (
                <TableHeaderCell key={col.id} className="py-2.5 px-3">
                  {col.label}
                </TableHeaderCell>
              ))}
              <TableHeaderCell className="py-2.5 px-3">Status</TableHeaderCell>
              <TableHeaderCell className="py-2.5 px-3 text-right">Actions</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {students.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6 + customColumns.length} className="py-12 text-center text-slate-400">
                  <div className="space-y-1.5">
                    <Users className="w-6 h-6 text-slate-300 mx-auto" />
                    <p className="text-xs font-medium">No students found matching the selected criteria.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              students.map((s) => {
                const primaryGuardian = s.guardians[0];
                const isRegisteredOnly = s.status === "REGISTERED";

                return (
                  <TableRow key={s.id}>
                    <TableCell className="py-2 px-3 align-middle font-mono">
                      {isRegisteredOnly ? (
                        <div>
                          <span className="font-semibold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 text-xs inline-block">
                            {s.registrationNo || s.scholarNo}
                          </span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            Reg: {s.registrationDate ? formatDate(s.registrationDate) : "Recent"}
                          </span>
                        </div>
                      ) : (
                        <div>
                          <span className="font-semibold text-slate-900 block text-xs">
                            {s.scholarNo}
                          </span>
                          {s.registrationNo && (
                            <span className="text-[10px] text-slate-500 block">
                              Reg: {s.registrationNo}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 block">
                            Adm: {formatDate(s.admissionDate)}
                          </span>
                        </div>
                      )}
                    </TableCell>

                    <TableCell className="py-2 px-3 align-middle">
                      <Link
                        href={`/students/${s.id}`}
                        className="font-medium text-slate-900 hover:text-slate-700 hover:underline block text-[13px]"
                      >
                        {s.firstName} {s.lastName}
                      </Link>
                      <span className="text-[11px] text-slate-400 block">
                        DOB: {formatDate(s.dob)} • {s.gender}
                      </span>
                    </TableCell>

                    <TableCell className="py-2 px-3 align-middle">
                      <span className="font-medium text-slate-800 block text-xs">
                        {s.class.name} {s.section ? `(${s.section.name})` : ""}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {s.campus.name}
                      </span>
                    </TableCell>

                    <TableCell className="py-2 px-3 align-middle">
                      <span className="font-medium text-slate-800 block text-xs">
                        {primaryGuardian?.name || "N/A"}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {primaryGuardian?.phone || s.emergencyContact || "-"}
                      </span>
                    </TableCell>

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
                        <TableCell key={col.id} className="py-2 px-3 text-xs text-slate-700">
                          {val || "-"}
                        </TableCell>
                      );
                    })}

                    <TableCell className="py-2 px-3 align-middle">
                      {isRegisteredOnly ? (
                        <Badge variant="warning">Registered</Badge>
                      ) : s.status === "ACTIVE" ? (
                        <Badge variant="success">Active</Badge>
                      ) : s.status === "TC_ISSUED" ? (
                        <Badge variant="info">TC Issued</Badge>
                      ) : (
                        <Badge variant="neutral">{s.status}</Badge>
                      )}
                    </TableCell>

                    <TableCell className="py-2 px-3 align-middle text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/students/${s.id}`}
                          title="View Student Record"
                          className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Link>

                        <Link
                          href={`/students/${s.id}?edit=true`}
                          title="Edit Student Details"
                          className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Link>

                        {permissions.isAdmin && (
                          <DeleteStudentButton
                            studentId={s.id}
                            studentName={`${s.firstName} ${s.lastName}`}
                            action={deleteStudent}
                          />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
        />
      </Card>
    </div>
  );
}
