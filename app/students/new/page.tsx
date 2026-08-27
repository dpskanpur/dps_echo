import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";
import { createStudent, registerStudent, promoteStudentToAdmission } from "@/lib/actions";
import { getCurrentUser, getUserPermissions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { UserPlus, Building2, User, Phone, MapPin, Sparkles, CheckCircle2, ArrowRight, ShieldCheck, ClipboardList } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function NewAdmissionPage({
  searchParams,
}: {
  searchParams: Promise<{ campus?: string; mode?: string; promoteStudentId?: string }>;
}) {
  const { campus: campusId, mode = "registration", promoteStudentId } = await searchParams;
  const user = await getCurrentUser();
  const permissions = await getUserPermissions(user);

  if (!permissions.modules.students.canUpdate && !permissions.isAdmin) {
    redirect("/students?error=unauthorized_create_student");
  }

  const campuses = await prisma.campus.findMany({
    orderBy: { name: "asc" },
  });

  const studentToPromote = promoteStudentId
    ? await prisma.student.findUnique({
        where: { id: promoteStudentId },
        include: { campus: true, class: true, section: true, guardians: true },
      })
    : null;

  const selectedCampus = studentToPromote
    ? studentToPromote.campus
    : campuses.find((c) => c.id === campusId) || campuses[0];

  const classes = await prisma.class.findMany({
    where: { campusId: selectedCampus.id },
    include: { sections: true },
    orderBy: { sequence: "asc" },
  });

  const activeMode = studentToPromote ? "promote" : mode === "admission" ? "admission" : "registration";

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar userEmail={user?.email} userRole={user?.role} permissions={permissions} />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar campuses={campuses} selectedCampusId={selectedCampus.id} user={user || undefined} permissions={permissions} />

        <main className="p-8 space-y-6 flex-1 overflow-y-auto max-w-5xl mx-auto w-full">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <UserPlus className="w-6 h-6 text-emerald-800" />
                <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                  {activeMode === "promote"
                    ? "Promote Registration to Admission"
                    : activeMode === "registration"
                    ? "Stage 1: New Student Registration"
                    : "Full Student Admission & Enrolment"}
                </h1>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {activeMode === "promote"
                  ? `Promoting applicant ${studentToPromote?.firstName} ${studentToPromote?.lastName} (REG ID: ${studentToPromote?.registrationNo || "Pending"}) to full active admission with permanent Scholar ID.`
                  : activeMode === "registration"
                  ? "Generate a unique Registration ID for new applicants. Confirmed registrations can later be promoted to full admission."
                  : "Formalize direct student onboarding, generate both Registration ID & Scholar ID, and allocate academic section."}
              </p>
            </div>
            <Link
              href="/students"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 self-start sm:self-auto"
            >
              ← Back to Directory
            </Link>
          </div>

          {/* Form Mode Navigation Tabs (if not promoting) */}
          {!studentToPromote && (
            <div className="bg-slate-200/70 p-1.5 rounded-2xl flex items-center gap-2 max-w-xl">
              <Link
                href={`/students/new?campus=${selectedCampus.id}&mode=registration`}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
                  activeMode === "registration"
                    ? "bg-white text-emerald-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <ClipboardList className="w-4 h-4 text-emerald-700" />
                <span>1. Registration Form (Stage 1)</span>
              </Link>
              <Link
                href={`/students/new?campus=${selectedCampus.id}&mode=admission`}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
                  activeMode === "admission"
                    ? "bg-white text-emerald-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <UserPlus className="w-4 h-4 text-emerald-700" />
                <span>2. Full Admission (1-Step)</span>
              </Link>
            </div>
          )}

          {/* Banner for Promoting Student */}
          {studentToPromote && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-800 text-white flex items-center justify-center font-bold text-sm">
                  {studentToPromote.firstName[0]}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">
                      {studentToPromote.firstName} {studentToPromote.lastName}
                    </span>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border border-emerald-200">
                      REG ID: {studentToPromote.registrationNo}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Class: <strong className="text-slate-800">{studentToPromote.class.name}</strong> • Campus: <strong className="text-slate-800">{selectedCampus.name}</strong>
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-emerald-800 flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4" /> Ready for Admission ID
                </span>
              </div>
            </div>
          )}

          {/* MODE 1: STAGE 1 — REGISTRATION FORM */}
          {activeMode === "registration" && (
            <form action={registerStudent} className="space-y-6">
              <input type="hidden" name="campusId" value={selectedCampus.id} />

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-3 text-xs text-amber-900">
                <ClipboardList className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold block">Stage 1: Applicant Registration</strong>
                  <p className="text-amber-800 mt-0.5 leading-relaxed">
                    Submitting this form creates an official applicant record and assigns a unique <strong className="font-mono text-amber-950">Registration ID (e.g. REG-AZD-2026-XXXX)</strong>. Once verified, staff can promote this record to full admission.
                  </p>
                </div>
              </div>

              {/* Step 1: Campus & Class Placement */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <Building2 className="w-4 h-4 text-emerald-800" />
                  <h2 className="text-sm font-bold text-slate-900">
                    1. Target Campus & Class
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Campus *
                    </label>
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-900">
                      {selectedCampus.name} ({selectedCampus.code})
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Applying for Class *
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
                </div>
              </div>

              {/* Step 2: Student Basic Information */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <User className="w-4 h-4 text-emerald-800" />
                  <h2 className="text-sm font-bold text-slate-900">
                    2. Student Basic Information
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      required
                      placeholder="e.g. Aarav"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Middle Name
                    </label>
                    <input
                      type="text"
                      name="middleName"
                      placeholder="e.g. Kumar"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      required
                      placeholder="e.g. Sharma"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Date of Birth *
                    </label>
                    <input
                      type="date"
                      name="dob"
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Gender *
                    </label>
                    <select
                      name="gender"
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    >
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Emergency Contact Number *
                    </label>
                    <input
                      type="tel"
                      name="emergencyContact"
                      required
                      placeholder="e.g. +91 98390 12345"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Current Address
                  </label>
                  <textarea
                    name="currentAddress"
                    rows={2}
                    placeholder="Residential address in Kanpur..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* Step 3: Guardian & Contact Details */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <Phone className="w-4 h-4 text-emerald-800" />
                  <h2 className="text-sm font-bold text-slate-900">
                    3. Parent / Guardian Contact Details
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Father's Name *
                    </label>
                    <input
                      type="text"
                      name="fatherName"
                      required
                      placeholder="e.g. Rajesh Sharma"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Father's Mobile *
                    </label>
                    <input
                      type="tel"
                      name="fatherPhone"
                      required
                      placeholder="e.g. +91 98390 12345"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Father's Email
                    </label>
                    <input
                      type="email"
                      name="fatherEmail"
                      placeholder="e.g. rajesh@gmail.com"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Mother's Name
                    </label>
                    <input
                      type="text"
                      name="motherName"
                      placeholder="e.g. Sunita Sharma"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Mother's Mobile
                    </label>
                    <input
                      type="tel"
                      name="motherPhone"
                      placeholder="e.g. +91 98390 54321"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Registration Button */}
              <div className="flex items-center justify-end gap-3 pt-4">
                <Link
                  href="/students"
                  className="px-5 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  className="bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 text-white font-bold py-3 px-6 rounded-xl text-xs transition shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <ClipboardList className="w-4 h-4" />
                  <span>Submit Registration & Generate REG ID</span>
                </button>
              </div>
            </form>
          )}

          {/* MODE 2: PROMOTING REGISTRATION TO FULL ADMISSION */}
          {activeMode === "promote" && studentToPromote && (
            <form action={promoteStudentToAdmission} className="space-y-6">
              <input type="hidden" name="studentId" value={studentToPromote.id} />

              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-start gap-3 text-xs text-emerald-900">
                <Sparkles className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold block">Stage 2: Promoting Registration to Admission</strong>
                  <p className="text-emerald-800 mt-0.5 leading-relaxed">
                    Applicant <strong className="text-emerald-950">{studentToPromote.firstName} {studentToPromote.lastName}</strong> (REG ID: <strong className="font-mono text-emerald-950">{studentToPromote.registrationNo}</strong>) is ready for full admission. Complete section allocation and emergency details to generate a unique <strong className="font-mono text-emerald-950">Admission Scholar ID (DPS-AZD-2026-XXXX)</strong>.
                  </p>
                </div>
              </div>

              {/* Section & Roll Number Allocation */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <Building2 className="w-4 h-4 text-emerald-800" />
                  <h2 className="text-sm font-bold text-slate-900">
                    1. Academic Section & Roll Number Allocation
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Admitted Class
                    </label>
                    <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-800">
                      {studentToPromote.class.name}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Assign Section *
                    </label>
                    <select
                      name="sectionId"
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    >
                      {classes
                        .find((c) => c.id === studentToPromote.classId)
                        ?.sections.map((sec) => (
                          <option key={sec.id} value={sec.id}>
                            Section {sec.name} {sec.roomNo ? `(Room ${sec.roomNo})` : ""}
                          </option>
                        )) || <option value="">No sections defined</option>}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Roll Number
                    </label>
                    <input
                      type="number"
                      name="rollNo"
                      placeholder="e.g. 15"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>
                </div>
              </div>

              {/* Student Demographics & Medical */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <User className="w-4 h-4 text-emerald-800" />
                  <h2 className="text-sm font-bold text-slate-900">
                    2. Enrolment Details & Demographics
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Blood Group
                    </label>
                    <select
                      name="bloodGroup"
                      defaultValue={studentToPromote.bloodGroup || "B+"}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    >
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Category
                    </label>
                    <select
                      name="category"
                      defaultValue="General"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    >
                      <option value="General">General</option>
                      <option value="OBC">OBC</option>
                      <option value="SC">SC</option>
                      <option value="ST">ST</option>
                      <option value="EWS">EWS</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      House Allocation
                    </label>
                    <select
                      name="house"
                      defaultValue="Ganga"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    >
                      <option value="Ganga">Ganga (Red)</option>
                      <option value="Yamuna">Yamuna (Blue)</option>
                      <option value="Jhelum">Jhelum (Green)</option>
                      <option value="Chenab">Chenab (Yellow)</option>
                      <option value="Ravi">Ravi (Orange)</option>
                      <option value="Sutlej">Sutlej (Purple)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Aadhaar Number
                    </label>
                    <input
                      type="text"
                      name="aadhaarNo"
                      placeholder="12-digit Aadhaar"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Current Residential Address
                    </label>
                    <textarea
                      name="currentAddress"
                      rows={2}
                      defaultValue={studentToPromote.currentAddress || ""}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Permanent Address
                    </label>
                    <textarea
                      name="permanentAddress"
                      rows={2}
                      defaultValue={studentToPromote.currentAddress || ""}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Promotion Button */}
              <div className="flex items-center justify-end gap-3 pt-4">
                <Link
                  href={`/students/${studentToPromote.id}`}
                  className="px-5 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  className="bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 text-white font-bold py-3 px-6 rounded-xl text-xs transition shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Promote to Full Admission & Assign Admission ID</span>
                </button>
              </div>
            </form>
          )}

          {/* MODE 3: DIRECT FULL ADMISSION (1-STEP) */}
          {activeMode === "admission" && !studentToPromote && (
            <form action={createStudent} className="space-y-6">
              <input type="hidden" name="campusId" value={selectedCampus.id} />

              {/* Step 1: Campus & Academic Placement */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <Building2 className="w-4 h-4 text-emerald-800" />
                  <h2 className="text-sm font-bold text-slate-900">
                    1. Campus & Academic Placement
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Campus *
                    </label>
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-900">
                      {selectedCampus.name} ({selectedCampus.code})
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Admitting Class *
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
                      House Allocation
                    </label>
                    <select
                      name="house"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    >
                      <option value="Ganga">Ganga (Red)</option>
                      <option value="Yamuna">Yamuna (Blue)</option>
                      <option value="Jhelum">Jhelum (Green)</option>
                      <option value="Chenab">Chenab (Yellow)</option>
                      <option value="Ravi">Ravi (Orange)</option>
                      <option value="Sutlej">Sutlej (Purple)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Step 2: Student Demographics */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <User className="w-4 h-4 text-emerald-800" />
                  <h2 className="text-sm font-bold text-slate-900">
                    2. Student Personal Information
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      required
                      placeholder="e.g. Aarav"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      required
                      placeholder="e.g. Sharma"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Date of Birth *
                    </label>
                    <input
                      type="date"
                      name="dob"
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Gender *
                    </label>
                    <select
                      name="gender"
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    >
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Blood Group
                    </label>
                    <select
                      name="bloodGroup"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    >
                      <option value="B+">B+</option>
                      <option value="A+">A+</option>
                      <option value="O+">O+</option>
                      <option value="AB+">AB+</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Aadhaar Number
                    </label>
                    <input
                      type="text"
                      name="aadhaarNo"
                      placeholder="12-digit Aadhaar"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>
                </div>
              </div>

              {/* Step 3: Guardian Details */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <Phone className="w-4 h-4 text-emerald-800" />
                  <h2 className="text-sm font-bold text-slate-900">
                    3. Parent / Guardian Contact Details
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Father's Name *
                    </label>
                    <input
                      type="text"
                      name="fatherName"
                      required
                      placeholder="e.g. Rajesh Sharma"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Father's Mobile *
                    </label>
                    <input
                      type="tel"
                      name="fatherPhone"
                      required
                      placeholder="e.g. +91 98390 12345"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Emergency Contact *
                    </label>
                    <input
                      type="tel"
                      name="emergencyContact"
                      required
                      placeholder="e.g. +91 98390 12345"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Direct Admission Button */}
              <div className="flex items-center justify-end gap-3 pt-4">
                <Link
                  href="/students"
                  className="px-5 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  className="bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 text-white font-bold py-3 px-6 rounded-xl text-xs transition shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Enrol Student & Generate Admission ID</span>
                </button>
              </div>
            </form>
          )}
        </main>
      </div>
    </div>
  );
}
