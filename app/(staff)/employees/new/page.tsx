import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getUserPermissions } from "@/lib/auth";
import { resolveCampusScope } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { createEmployee } from "@/lib/employee-actions";
import { PassportPhotoUploader } from "@/components/PassportPhotoUploader";
import { EmployeeCategoryAcademicSection } from "@/components/EmployeeCategoryAcademicSection";
import {
  Briefcase,
  ArrowLeft,
  UserCheck,
  Phone,
  Building2,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function NewEmployeePage() {
  const user = await getCurrentUser();
  const permissions = await getUserPermissions(user);

  if (!permissions.modules.employees?.canUpdate && !permissions.isAdmin) {
    redirect("/employees?error=unauthorized_create");
  }

  const campusScope = resolveCampusScope(user, null);

  const campuses = await prisma.campus.findMany({
    where: campusScope.locked && campusScope.campusId ? { id: campusScope.campusId } : {},
    orderBy: { name: "asc" },
  });

  const defaultToday = new Date().toISOString().split("T")[0];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-boxdark p-5 rounded-2xl border border-slate-200/80 dark:border-strokedark shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800 flex items-center justify-center">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Onboard Faculty / Staff Member
            </h1>
            <p className="text-xs text-slate-500 dark:text-bodydark2 mt-0.5">
              Create a new employee profile, CBSE OASIS record, and school assignment (Zero-Payroll HR Directory).
            </p>
          </div>
        </div>

        <Link
          href="/employees"
          className="inline-flex items-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Directory</span>
        </Link>
      </div>

      <form action={createEmployee} className="space-y-6">
        {/* Section 1: Core Identity & Campus Assignment */}
        <div className="bg-white dark:bg-boxdark p-6 rounded-2xl border border-slate-200/80 dark:border-strokedark shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                1. Personal Identity &amp; Campus Assignment
              </h2>
            </div>
            {campusScope.locked && campuses[0] && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                <Building2 className="w-3.5 h-3.5" />
                Locked to {campuses[0].name}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
            <div className="lg:col-span-1">
              <PassportPhotoUploader
                name="photoUrl"
                employeeId="temp-new-emp"
                layout="vertical"
                label="Staff Passport Photo"
                helperText="Upload formal staff passport photo (JPG/PNG, max 5MB)."
              />
            </div>

            <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Assigned Campus <span className="text-rose-500">*</span>
                </label>
                <select
                  name="campusId"
                  required
                  defaultValue={campusScope.campusId || campuses[0]?.id || ""}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200"
                >
                  {campuses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Employee Code (Auto-generated if blank)
                </label>
                <input
                  type="text"
                  name="employeeCode"
                  placeholder="e.g., EMP-KID-0001 (Leave blank to auto-generate)"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-mono text-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                  First Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="firstName"
                  required
                  placeholder="e.g., Anjali"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  name="lastName"
                  placeholder="e.g., Verma"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Gender
                </label>
                <select
                  name="gender"
                  defaultValue="FEMALE"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200"
                >
                  <option value="FEMALE">Female</option>
                  <option value="MALE">Male</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    name="dob"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Blood Group
                  </label>
                  <select
                    name="bloodGroup"
                    defaultValue=""
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200"
                  >
                    <option value="">Select</option>
                    {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((bg) => (
                      <option key={bg} value={bg}>
                        {bg}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2 & 3: Role, Category & CBSE OASIS (Interactive Client Component) */}
        <EmployeeCategoryAcademicSection defaultToday={defaultToday} />

        {/* Section 4: Contact & Emergency Details */}
        <div className="bg-white dark:bg-boxdark p-6 rounded-2xl border border-slate-200/80 dark:border-strokedark shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Phone className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              4. Contact &amp; Emergency Information
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                Primary Mobile Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                name="phone"
                required
                placeholder="e.g., 9839011223"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-200"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                Official / Personal Email
              </label>
              <input
                type="email"
                name="email"
                placeholder="e.g., faculty@dpskanpur.com"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-200"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                Emergency Contact Person Name
              </label>
              <input
                type="text"
                name="emergencyName"
                placeholder="e.g., Spouse / Parent Name"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-200"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                Emergency Contact Phone
              </label>
              <input
                type="tel"
                name="emergencyPhone"
                placeholder="e.g., 9415022334"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-200"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                Residential Address
              </label>
              <input
                type="text"
                name="address"
                placeholder="House No., Locality, Kanpur - Pincode"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-200"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Link
            href="/employees"
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-boxdark border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="bg-[#0F9D58] hover:bg-[#0d8a4d] text-white px-6 py-2.5 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
          >
            Create Employee Profile
          </button>
        </div>
      </form>
    </div>
  );
}
