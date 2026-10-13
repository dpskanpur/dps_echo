import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getUserPermissions } from "@/lib/auth";
import { resolveCampusScope } from "@/lib/permissions";
import { formatDate } from "@/lib/utils";
import { updateEmployee, updateEmployeeClearance } from "@/lib/employee-actions";
import { PassportPhotoUploader } from "@/components/PassportPhotoUploader";
import { EmployeeDocumentSection } from "@/components/EmployeeDocumentSection";
import {
  Briefcase,
  ArrowLeft,
  Building2,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Heart,
  FolderOpen,
  CheckCircle2,
  Pencil,
  Lock,
  GraduationCap,
  ShieldCheck,
  ClipboardCheck,
  UserCheck,
  AlertCircle,
} from "lucide-react";

export const dynamic = "force-dynamic";

const CATEGORY_LABELS: Record<string, string> = {
  TEACHING: "Teaching Faculty",
  NON_TEACHING: "Non-Teaching Staff",
  ADMIN: "Administration",
  SUPPORT: "Support Staff",
};

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  ACTIVE: {
    label: "Active",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
  },
  ON_LEAVE: {
    label: "On Approved Leave",
    className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
  },
  RESIGNED: {
    label: "Resigned",
    className: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800",
  },
  RETIRED: {
    label: "Retired",
    className: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  },
  TRANSFERRED: {
    label: "Transferred",
    className: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800",
  },
};

export default async function EmployeeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; edit?: string }>;
}) {
  const { id } = await params;
  const { tab = "overview", edit } = await searchParams;
  const isEditing = edit === "true";

  const user = await getCurrentUser();
  const permissions = await getUserPermissions(user);

  if (!permissions.modules.employees?.canView && !permissions.isAdmin) {
    redirect("/?error=unauthorized_employees");
  }

  const employee = await prisma.employee.findUnique({
    where: { id },
    include: {
      campus: true,
      documents: {
        orderBy: { uploadedAt: "desc" },
      },
    },
  });

  if (!employee) {
    notFound();
  }

  // Enforce strict Campus Isolation (e.g., DPS Kidwai Nagar Sub-Admin can only access DPS Kidwai Nagar employees)
  if (user?.campusId && employee.campusId !== user.campusId && !permissions.isAdmin) {
    redirect("/employees?error=forbidden_campus");
  }

  const campusScope = resolveCampusScope(user, employee.campusId);
  const campuses = await prisma.campus.findMany({
    where: campusScope.locked && campusScope.campusId ? { id: campusScope.campusId } : {},
    orderBy: { name: "asc" },
  });

  const canUpdate = permissions.modules.employees?.canUpdate || permissions.isAdmin;
  const statusBadge = STATUS_BADGES[employee.status] || STATUS_BADGES.ACTIVE;

  const updateWithId = updateEmployee.bind(null, employee.id);
  const updateClearanceWithId = updateEmployeeClearance.bind(null, employee.id);

  const dobIso = employee.dob ? new Date(employee.dob).toISOString().split("T")[0] : "";
  const joiningIso = employee.joiningDate ? new Date(employee.joiningDate).toISOString().split("T")[0] : "";
  const leavingIso = employee.leavingDate ? new Date(employee.leavingDate).toISOString().split("T")[0] : "";

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/employees"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-emerald-600 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Faculty &amp; Staff Directory</span>
        </Link>

        <div className="flex items-center gap-2">
          {canUpdate ? (
            isEditing ? (
              <Link
                href={`/employees/${employee.id}`}
                className="inline-flex items-center gap-1.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold transition"
              >
                Cancel Editing
              </Link>
            ) : (
              <Link
                href={`/employees/${employee.id}?edit=true`}
                className="inline-flex items-center gap-1.5 bg-[#0F9D58] hover:bg-[#0d8a4d] text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Edit Staff Record</span>
              </Link>
            )
          ) : (
            <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-400 px-3 py-1.5 rounded-xl text-xs font-semibold">
              <Lock className="w-3.5 h-3.5" />
              View-Only Access
            </div>
          )}
        </div>
      </div>

      {/* Profile Header Card */}
      <div className="bg-white dark:bg-boxdark p-6 rounded-2xl border border-slate-200/80 dark:border-strokedark shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-5">
            {employee.photoUrl ? (
              <img
                src={employee.photoUrl}
                alt={`${employee.firstName} ${employee.lastName}`}
                className="w-20 h-24 rounded-2xl object-cover border-2 border-emerald-500/30 shadow-xs shrink-0"
              />
            ) : (
              <div className="w-20 h-24 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center font-black text-2xl shrink-0">
                {employee.firstName.charAt(0)}
                {employee.lastName ? employee.lastName.charAt(0) : ""}
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  {employee.firstName} {employee.lastName}
                </h1>
                <span className="font-mono text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2.5 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  {employee.employeeCode}
                </span>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${statusBadge.className}`}>
                  {statusBadge.label}
                </span>
              </div>

              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                {employee.designation}
                {employee.department ? ` • ${employee.department}` : ""} ({CATEGORY_LABELS[employee.category] || employee.category})
              </p>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 pt-1">
                <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200">
                  <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                  {employee.campus.name}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {employee.phone}
                </span>
                {employee.email && (
                  <span className="inline-flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    {employee.email}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Joined {formatDate(employee.joiningDate)}
                </span>
              </div>
            </div>
          </div>

          {/* Right Quick Badges */}
          <div className="flex flex-col sm:items-end gap-2 border-t md:border-t-0 pt-4 md:pt-0 border-slate-100 dark:border-slate-800">
            {employee.oasisId && (
              <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                CBSE OASIS: {employee.oasisId}
              </div>
            )}
            {employee.assignedClass && (
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/80 px-3 py-1 rounded-lg border border-slate-200/70 dark:border-slate-700">
                Class Teacher: <span className="font-bold text-slate-900 dark:text-white">{employee.assignedClass}</span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 overflow-x-auto">
          <Link
            href={`/employees/${employee.id}?tab=overview`}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              tab === "overview"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Profile &amp; CBSE OASIS</span>
          </Link>

          <Link
            href={`/employees/${employee.id}?tab=documents`}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              tab === "documents"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            <span>Document Vault ({employee.documents.length})</span>
          </Link>

          <Link
            href={`/employees/${employee.id}?tab=clearance`}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              tab === "clearance"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>Exit &amp; Handover Clearance</span>
          </Link>
        </div>
      </div>

      {/* TAB 1: OVERVIEW OR INLINE EDIT */}
      {tab === "overview" && (
        <>
          {isEditing && canUpdate ? (
            <form action={updateWithId} className="bg-white dark:bg-boxdark p-6 rounded-2xl border border-emerald-500/40 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Pencil className="w-4 h-4 text-emerald-600" />
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Edit Faculty / Staff Record — {employee.firstName} {employee.lastName}
                  </h2>
                </div>
                {campusScope.locked && (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                    Campus Scope Locked ({employee.campus.name})
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-1">
                  <PassportPhotoUploader
                    name="photoUrl"
                    value={employee.photoUrl}
                    employeeId={employee.id}
                  />
                </div>

                <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                      Campus
                    </label>
                    <select
                      name="campusId"
                      defaultValue={employee.campusId}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold"
                    >
                      {campuses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                      Employee Code
                    </label>
                    <input
                      type="text"
                      name="employeeCode"
                      defaultValue={employee.employeeCode}
                      required
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                      Status
                    </label>
                    <select
                      name="status"
                      defaultValue={employee.status}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="ON_LEAVE">On Approved Leave</option>
                      <option value="RESIGNED">Resigned</option>
                      <option value="RETIRED">Retired</option>
                      <option value="TRANSFERRED">Transferred</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      defaultValue={employee.firstName}
                      required
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      defaultValue={employee.lastName}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                      Gender
                    </label>
                    <select
                      name="gender"
                      defaultValue={employee.gender}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold"
                    >
                      <option value="FEMALE">Female</option>
                      <option value="MALE">Male</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      name="dob"
                      defaultValue={dobIso}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                      Blood Group
                    </label>
                    <input
                      type="text"
                      name="bloodGroup"
                      defaultValue={employee.bloodGroup || ""}
                      placeholder="e.g., B+"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                      Date of Joining
                    </label>
                    <input
                      type="date"
                      name="joiningDate"
                      defaultValue={joiningIso}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Role & Academic Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Category
                  </label>
                  <select
                    name="category"
                    defaultValue={employee.category}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold"
                  >
                    <option value="TEACHING">Teaching Faculty</option>
                    <option value="NON_TEACHING">Non-Teaching</option>
                    <option value="ADMIN">Administration</option>
                    <option value="SUPPORT">Support Staff</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Designation
                  </label>
                  <input
                    type="text"
                    name="designation"
                    defaultValue={employee.designation}
                    required
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Department / Wing
                  </label>
                  <input
                    type="text"
                    name="department"
                    defaultValue={employee.department || ""}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Employment Type
                  </label>
                  <select
                    name="employmentType"
                    defaultValue={employee.employmentType}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold"
                  >
                    <option value="PERMANENT">Permanent</option>
                    <option value="PROBATION">Probation</option>
                    <option value="CONTRACT">Contractual</option>
                    <option value="VISITING">Visiting</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Qualifications
                  </label>
                  <input
                    type="text"
                    name="qualification"
                    defaultValue={employee.qualification || ""}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Subjects Taught
                  </label>
                  <input
                    type="text"
                    name="subjectsTaught"
                    defaultValue={employee.subjectsTaught || ""}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                    CBSE OASIS Teacher ID
                  </label>
                  <input
                    type="text"
                    name="cbseOasisId"
                    defaultValue={employee.oasisId || ""}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                    CTET / TET Qualified
                  </label>
                  <select
                    name="ctetQualified"
                    defaultValue={employee.ctetQualified || "NA"}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold"
                  >
                    <option value="YES">Yes — Qualified</option>
                    <option value="NO">No</option>
                    <option value="NA">Not Applicable</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Prior Experience (Years)
                  </label>
                  <input
                    type="number"
                    name="experienceYrs"
                    defaultValue={employee.priorExperienceYrs ?? 0}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Class Teacher Assignment
                  </label>
                  <input
                    type="text"
                    name="assignedClass"
                    defaultValue={employee.assignedClass || ""}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                    House Assignment
                  </label>
                  <input
                    type="text"
                    name="assignedHouse"
                    defaultValue={employee.assignedHouse || ""}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Primary Mobile
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    defaultValue={employee.phone}
                    required
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    defaultValue={employee.email || ""}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Emergency Contact Name
                  </label>
                  <input
                    type="text"
                    name="emergencyName"
                    defaultValue={employee.emergencyName || ""}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Emergency Contact Phone
                  </label>
                  <input
                    type="tel"
                    name="emergencyPhone"
                    defaultValue={employee.emergencyPhone || ""}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Residential Address
                  </label>
                  <input
                    type="text"
                    name="address"
                    defaultValue={employee.currentAddress || ""}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs"
                  />
                </div>

                <div className="sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Remarks / Committees
                  </label>
                  <input
                    type="text"
                    name="remarks"
                    defaultValue={employee.notes || ""}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <Link
                  href={`/employees/${employee.id}`}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  className="bg-[#0F9D58] hover:bg-[#0d8a4d] text-white px-5 py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Card 1: CBSE OASIS & School Assignments */}
              <div className="bg-white dark:bg-boxdark p-6 rounded-2xl border border-slate-200/80 dark:border-strokedark shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-emerald-600" />
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                      CBSE OASIS &amp; School Assignments
                    </h2>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded">
                    Academic Dossier
                  </span>
                </div>

                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                    <dt className="text-[11px] text-slate-400 font-semibold">Qualification</dt>
                    <dd className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                      {employee.qualification || "Not specified"}
                    </dd>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                    <dt className="text-[11px] text-slate-400 font-semibold">Subjects Taught</dt>
                    <dd className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                      {employee.subjectsTaught || "N/A"}
                    </dd>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                    <dt className="text-[11px] text-slate-400 font-semibold">CBSE OASIS Teacher ID</dt>
                    <dd className="font-mono font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">
                      {employee.oasisId || "Not Assigned"}
                    </dd>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                    <dt className="text-[11px] text-slate-400 font-semibold">CTET / State TET Qualified</dt>
                    <dd className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                      {employee.ctetQualified === "YES"
                        ? "Yes — Qualified"
                        : employee.ctetQualified === "NO"
                        ? "No"
                        : "Not Applicable"}
                    </dd>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                    <dt className="text-[11px] text-slate-400 font-semibold">Class Teacher Assignment</dt>
                    <dd className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                      {employee.assignedClass || "None"}
                    </dd>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                    <dt className="text-[11px] text-slate-400 font-semibold">House Assignment &amp; Experience</dt>
                    <dd className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                      {employee.assignedHouse || "No House"} • {employee.priorExperienceYrs ?? 0} Yrs Prior Exp.
                    </dd>
                  </div>
                  {employee.notes && (
                    <div className="sm:col-span-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                      <dt className="text-[11px] text-slate-400 font-semibold">Committees / Remarks</dt>
                      <dd className="font-medium text-slate-700 dark:text-slate-300 mt-0.5">{employee.notes}</dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Card 2: Personal, Employment & Emergency Details */}
              <div className="bg-white dark:bg-boxdark p-6 rounded-2xl border border-slate-200/80 dark:border-strokedark shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-rose-500" />
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                      Personal &amp; Emergency Contact Record
                    </h2>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                    {employee.employmentType}
                  </span>
                </div>

                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                    <dt className="text-[11px] text-slate-400 font-semibold">Gender &amp; Date of Birth</dt>
                    <dd className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                      {employee.gender} • {employee.dob ? formatDate(employee.dob) : "DOB Not Set"}
                    </dd>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                    <dt className="text-[11px] text-slate-400 font-semibold">Blood Group</dt>
                    <dd className="font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                      {employee.bloodGroup || "Not Recorded"}
                    </dd>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                    <dt className="text-[11px] text-slate-400 font-semibold">Emergency Contact Person</dt>
                    <dd className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                      {employee.emergencyName || "Not Recorded"}
                    </dd>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                    <dt className="text-[11px] text-slate-400 font-semibold">Emergency Phone</dt>
                    <dd className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                      {employee.emergencyPhone || employee.phone}
                    </dd>
                  </div>
                  <div className="sm:col-span-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                    <dt className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> Residential Address
                    </dt>
                    <dd className="font-medium text-slate-700 dark:text-slate-300 mt-0.5">
                      {employee.currentAddress || "Address not recorded"}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          )}
        </>
      )}

      {/* TAB 2: DOCUMENT VAULT */}
      {tab === "documents" && (
        <div className="bg-white dark:bg-boxdark p-6 rounded-2xl border border-slate-200/80 dark:border-strokedark shadow-xs">
          <EmployeeDocumentSection
            employeeId={employee.id}
            documents={employee.documents}
            canEdit={canUpdate}
          />
        </div>
      )}

      {/* TAB 3: EXIT & HANDOVER CLEARANCE CHECKLIST */}
      {tab === "clearance" && (
        <div className="bg-white dark:bg-boxdark p-6 rounded-2xl border border-slate-200/80 dark:border-strokedark shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-emerald-600" />
                Inter-Campus Transfer &amp; Exit / No-Dues Clearance
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Track institutional asset handover before issuing an Experience or Relieving Certificate.
              </p>
            </div>
          </div>

          <form action={updateClearanceWithId} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Employment Status
                </label>
                <select
                  name="status"
                  disabled={!canUpdate}
                  defaultValue={employee.status}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-semibold"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="ON_LEAVE">On Approved Leave</option>
                  <option value="RESIGNED">Resigned</option>
                  <option value="RETIRED">Retired</option>
                  <option value="TRANSFERRED">Transferred to Another DPS Campus</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Date of Leaving / Relieving
                </label>
                <input
                  type="date"
                  name="leavingDate"
                  disabled={!canUpdate}
                  defaultValue={leavingIso}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Reason for Exit / Transfer Remarks
                </label>
                <input
                  type="text"
                  name="exitReason"
                  disabled={!canUpdate}
                  defaultValue={employee.exitReason || ""}
                  placeholder="e.g., Personal relocation / Promoted"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <label className="flex items-start gap-3 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 cursor-pointer">
                <input
                  type="checkbox"
                  name="clearanceLibrary"
                  disabled={!canUpdate}
                  defaultChecked={employee.clearanceLibrary}
                  className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Library Clearance</p>
                  <p className="text-[11px] text-slate-500">All reference books &amp; journals returned</p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 cursor-pointer">
                <input
                  type="checkbox"
                  name="clearanceIdKeys"
                  disabled={!canUpdate}
                  defaultChecked={employee.clearanceIdKeys}
                  className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">ID Card &amp; Locker Keys</p>
                  <p className="text-[11px] text-slate-500">Staff lanyard, keys &amp; registers handed over</p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 cursor-pointer">
                <input
                  type="checkbox"
                  name="clearanceItAssets"
                  disabled={!canUpdate}
                  defaultChecked={employee.clearanceItAssets}
                  className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">IT &amp; Lab Assets</p>
                  <p className="text-[11px] text-slate-500">Official email revoked &amp; devices returned</p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 cursor-pointer">
                <input
                  type="checkbox"
                  name="relievingIssued"
                  disabled={!canUpdate}
                  defaultChecked={employee.relievingIssued}
                  className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Relieving Letter Issued</p>
                  <p className="text-[11px] text-slate-500">Experience &amp; relieving certificate signed</p>
                </div>
              </label>
            </div>

            {canUpdate && (
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 bg-[#0F9D58] hover:bg-[#0d8a4d] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Update Clearance &amp; Status</span>
                </button>
              </div>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
