import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";
import { registerStudent } from "@/lib/actions";
import { getCurrentUser, getUserPermissions } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  Building2,
  User,
  Phone,
  MapPin,
  ClipboardList,
  GraduationCap,
  Users,
  Award,
  FileCheck,
} from "lucide-react";
import Link from "next/link";
import { DobInputWithWords } from "@/components/DobInputWithWords";
import { ValidatedInput } from "@/components/ValidatedInput";
import { CampusSelector } from "@/components/CampusSelector";
import { RegistrationFormWrapper } from "@/components/RegistrationFormWrapper";

export const dynamic = "force-dynamic";

export default async function NewAdmissionPage({
  searchParams,
}: {
  searchParams: Promise<{ campus?: string }>;
}) {
  const { campus: campusId } = await searchParams;

  const user = await getCurrentUser();
  const permissions = await getUserPermissions(user);

  if (!permissions.modules.students.canUpdate && !permissions.isAdmin) {
    redirect("/students?error=unauthorized");
  }

  const campuses = await prisma.campus.findMany({
    orderBy: { name: "asc" },
  });

  const selectedCampus =
    campuses.find((c) => c.id === campusId) || campuses[0];

  const classes = await prisma.class.findMany({
    where: { campusId: selectedCampus.id },
    include: { sections: true },
    orderBy: { sequence: "asc" },
  });

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar userEmail={user?.email} userRole={user?.role} permissions={permissions} />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar campuses={campuses} selectedCampusId={selectedCampus.id} user={user || undefined} permissions={permissions} />

        <main className="p-6 sm:p-8 space-y-6 flex-1 overflow-y-auto max-w-5xl mx-auto w-full">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <ClipboardList className="w-6 h-6 text-emerald-800" />
                <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                  Official DPS Registration Form
                </h1>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Digital counterpart of official DPS Kanpur paper Registration Form. Generates unique Registration ID (`REG-AZD-2026-XXXX`).
              </p>
            </div>
            <Link
              href="/students"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 self-start sm:self-auto"
            >
              ← Back to Directory
            </Link>
          </div>

          {/* OFFICIAL DPS REGISTRATION FORM */}
          <RegistrationFormWrapper action={registerStudent}>
            <input type="hidden" name="campusId" value={selectedCampus.id} />

            {/* SECTION 1: TARGET CLASS & ACADEMIC PLACEMENT */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <Building2 className="w-4 h-4 text-emerald-800" />
                <h3 className="text-sm font-bold text-slate-900">
                  1. Admission Target & Campus
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Campus *
                  </label>
                  <CampusSelector
                    campuses={campuses}
                    selectedCampusId={selectedCampus.id}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Seeking Admission in Class *
                  </label>
                  <select
                    name="classId"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  >
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Academic Session
                  </label>
                  <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-800">
                    2026-2027
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: STUDENT'S DETAILS */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <User className="w-4 h-4 text-emerald-800" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  2. Student's Details
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <ValidatedInput
                  label="First Name"
                  name="firstName"
                  fieldType="text-only"
                  isRequired
                  uppercase
                  hint="Letters only"
                  placeholder="FIRST NAME"
                />

                <ValidatedInput
                  label="Middle Name"
                  name="middleName"
                  fieldType="text-only"
                  uppercase
                  hint="Letters only"
                  placeholder="MIDDLE NAME"
                />

                <ValidatedInput
                  label="Last Name"
                  name="lastName"
                  fieldType="text-only"
                  isRequired
                  uppercase
                  hint="Letters only"
                  placeholder="LAST NAME"
                />

                <DobInputWithWords />

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Gender <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <select
                    name="gender"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <ValidatedInput
                  label="Nationality"
                  name="nationality"
                  fieldType="text-only"
                  isRequired
                  uppercase
                  defaultValue="Indian"
                  placeholder="NATIONALITY"
                />

                <ValidatedInput
                  label="Mother Tongue"
                  name="motherTongue"
                  fieldType="text-only"
                  uppercase
                  defaultValue="Hindi"
                  placeholder="MOTHER TONGUE"
                />

                <ValidatedInput
                  label="Religion"
                  name="religion"
                  fieldType="text-only"
                  uppercase
                  placeholder="e.g. HINDUISM"
                />

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Category <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <select
                    name="category"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  >
                    <option value="General">General</option>
                    <option value="OBC">OBC</option>
                    <option value="SC">SC</option>
                    <option value="ST">ST</option>
                    <option value="EWS">EWS</option>
                  </select>
                </div>

                <ValidatedInput
                  label="Student Aadhaar No."
                  name="aadhaarNo"
                  fieldType="aadhaar"
                  hint="12 digits"
                  placeholder="12-DIGIT AADHAAR"
                />

                <ValidatedInput
                  label="Mobile No."
                  name="studentMobile"
                  fieldType="phone"
                  isRequired
                  hint="10 digits (6-9)"
                  placeholder="98390XXXXX"
                />

                <ValidatedInput
                  label="Student Email"
                  name="studentEmail"
                  fieldType="email"
                  placeholder="student@example.com"
                />
              </div>

              {/* Residential Address */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Present Residential Address <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <textarea
                    name="currentAddress"
                    required
                    rows={2}
                    placeholder="House No., Street Name, Locality, Kanpur"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  ></textarea>
                </div>

                <ValidatedInput
                  label="PIN Code"
                  name="currentPincode"
                  fieldType="pincode"
                  isRequired
                  hint="6 digits"
                  placeholder="208001"
                />

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Permanent Address
                  </label>
                  <textarea
                    name="permanentAddress"
                    rows={2}
                    placeholder="Same as present address or permanent village/hometown address"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  ></textarea>
                </div>

                <ValidatedInput
                  label="Permanent PIN Code"
                  name="permanentPincode"
                  fieldType="pincode"
                  hint="6 digits"
                  placeholder="208001"
                />
              </div>
            </div>

            {/* SECTION 3: PARENT / GUARDIAN DETAILS */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <Phone className="w-4 h-4 text-emerald-800" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  3. Parent / Guardian Details
                </h3>
              </div>

              {/* Father Details */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 inline-block">
                  Father's Particulars
                </span>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <ValidatedInput
                    label="Father's Name"
                    name="fatherName"
                    fieldType="text-only"
                    isRequired
                    uppercase
                    placeholder="FATHER'S NAME"
                  />

                  <ValidatedInput
                    label="Father's Mobile"
                    name="fatherPhone"
                    fieldType="phone"
                    isRequired
                    hint="10 digits (6-9)"
                    placeholder="98390XXXXX"
                  />

                  <ValidatedInput
                    label="Father's Email"
                    name="fatherEmail"
                    fieldType="email"
                    placeholder="father@example.com"
                  />

                  <ValidatedInput
                    label="Father's Occupation"
                    name="fatherOccupation"
                    placeholder="e.g. Business / Govt Service"
                  />
                </div>
              </div>

              {/* Mother Details */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200 inline-block">
                  Mother's Particulars
                </span>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <ValidatedInput
                    label="Mother's Name"
                    name="motherName"
                    fieldType="text-only"
                    isRequired
                    uppercase
                    placeholder="MOTHER'S NAME"
                  />

                  <ValidatedInput
                    label="Mother's Mobile"
                    name="motherPhone"
                    fieldType="phone"
                    hint="10 digits (6-9)"
                    placeholder="98390XXXXX"
                  />

                  <ValidatedInput
                    label="Mother's Email"
                    name="motherEmail"
                    fieldType="email"
                    placeholder="mother@example.com"
                  />

                  <ValidatedInput
                    label="Mother's Occupation"
                    name="motherOccupation"
                    placeholder="e.g. Homemaker / Doctor"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 4: PRIOR SCHOOLING HISTORY */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <GraduationCap className="w-4 h-4 text-emerald-800" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  4. Last School Attended & PEN Info
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <ValidatedInput
                    label="Name of Last Attended School"
                    name="previousSchool"
                    placeholder="e.g. St. Mary's School, Kanpur"
                  />
                </div>

                <ValidatedInput
                  label="Permanent Education No. (PEN)"
                  name="penNo"
                  placeholder="e.g. 2019485736"
                />

                <ValidatedInput
                  label="Previous Class Passed"
                  name="previousClass"
                  placeholder="e.g. Class III"
                />
              </div>
            </div>

            {/* Submit Registration Button */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <Link
                href="/students"
                className="px-5 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Cancel
              </Link>
              <button
                type="submit"
                className="bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 text-white font-bold py-3.5 px-8 rounded-xl text-xs transition shadow-md flex items-center gap-2 cursor-pointer"
              >
                <ClipboardList className="w-4 h-4" />
                <span>Submit Registration & Issue Unique REG ID</span>
              </button>
            </div>
          </RegistrationFormWrapper>
        </main>
      </div>
    </div>
  );
}
