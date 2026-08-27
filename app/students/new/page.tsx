import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";
import { createStudent, registerStudent, promoteStudentToAdmission } from "@/lib/actions";
import { getCurrentUser, getUserPermissions } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  UserPlus,
  Building2,
  User,
  Phone,
  MapPin,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  ClipboardList,
  GraduationCap,
  Users,
  Award,
  FileCheck,
} from "lucide-react";
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

        <main className="p-6 sm:p-8 space-y-6 flex-1 overflow-y-auto max-w-5xl mx-auto w-full">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <UserPlus className="w-6 h-6 text-emerald-800" />
                <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                  {activeMode === "promote"
                    ? "Promote Registration to Admission"
                    : activeMode === "registration"
                    ? "Official DPS Registration Form"
                    : "Full Student Admission & Enrolment"}
                </h1>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {activeMode === "promote"
                  ? `Promoting applicant ${studentToPromote?.firstName} ${studentToPromote?.lastName} (REG ID: ${studentToPromote?.registrationNo || "Pending"}) to full active admission with permanent Scholar ID.`
                  : activeMode === "registration"
                  ? "Digital counterpart of official DPS Kanpur paper Registration Form. Generates unique Registration ID."
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

          {/* Form Mode Navigation Tabs */}
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
                <span>1. Registration Form (Official DPS)</span>
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

          {/* MODE 1: OFFICIAL DPS REGISTRATION FORM */}
          {activeMode === "registration" && (
            <form action={registerStudent} className="space-y-6">
              <input type="hidden" name="campusId" value={selectedCampus.id} />

              {/* Official Paper Header Crest Box */}
              <div className="bg-white border-2 border-slate-900 rounded-3xl p-6 sm:p-8 text-center space-y-3 shadow-md relative overflow-hidden">
                <div className="flex items-center justify-center gap-3">
                  <img
                    src="/dps-logo-white.png"
                    alt="DPS Logo"
                    className="h-14 w-auto object-contain invert brightness-0"
                  />
                  <div className="text-left">
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
                      DELHI PUBLIC SCHOOL
                    </h2>
                    <h3 className="text-sm font-bold text-emerald-800 uppercase tracking-wide">
                      {selectedCampus.name.toUpperCase()}, KANPUR
                    </h3>
                  </div>
                </div>
                <div className="inline-block bg-slate-900 text-white font-extrabold text-xs uppercase px-4 py-1.5 rounded-full tracking-wider">
                  REGISTRATION FORM (Academic Session 2026-2027)
                </div>
                <p className="text-[11px] text-slate-500 font-medium italic">
                  To be filled in CAPITAL LETTERS ONLY • Unique Registration ID will be assigned upon submission
                </p>
              </div>

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
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-900">
                      {selectedCampus.name} ({selectedCampus.code})
                    </div>
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
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      required
                      placeholder="FIRST NAME"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Middle Name
                    </label>
                    <input
                      type="text"
                      name="middleName"
                      placeholder="MIDDLE NAME"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
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
                      placeholder="LAST NAME"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Date of Birth (DD/MM/YYYY) *
                    </label>
                    <input
                      type="date"
                      name="dob"
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Date of Birth (in Words)
                    </label>
                    <input
                      type="text"
                      name="dobInWords"
                      placeholder="e.g. FIFTEENTH AUGUST TWO THOUSAND SIXTEEN"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Gender *
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

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nationality *
                    </label>
                    <input
                      type="text"
                      name="nationality"
                      defaultValue="Indian"
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Mother Tongue
                    </label>
                    <input
                      type="text"
                      name="motherTongue"
                      defaultValue="Hindi"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Religion
                    </label>
                    <input
                      type="text"
                      name="religion"
                      placeholder="e.g. Hinduism"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Category *
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

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Student Aadhaar No.
                    </label>
                    <input
                      type="text"
                      name="aadhaarNo"
                      placeholder="12-DIGIT AADHAAR"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Mobile No. *
                    </label>
                    <input
                      type="tel"
                      name="studentMobile"
                      required
                      placeholder="+91 98390 XXXXX"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Email ID
                    </label>
                    <input
                      type="email"
                      name="studentEmail"
                      placeholder="parent/student@email.com"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Permanent / Residential Address & PIN Code *
                    </label>
                    <textarea
                      name="currentAddress"
                      rows={2}
                      required
                      placeholder="FULL RESIDENTIAL ADDRESS..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                    <input
                      type="text"
                      name="currentPincode"
                      placeholder="PIN CODE (e.g. 208002)"
                      className="w-full mt-2 bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-semibold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Correspondence Address & PIN Code
                    </label>
                    <textarea
                      name="permanentAddress"
                      rows={2}
                      placeholder="CORRESPONDENCE ADDRESS IF DIFFERENT..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                    <input
                      type="text"
                      name="permanentPincode"
                      placeholder="PIN CODE (e.g. 208002)"
                      className="w-full mt-2 bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-semibold text-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: PRIOR SCHOOLING & ADDITIONAL DETAILS */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <GraduationCap className="w-4 h-4 text-emerald-800" />
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                    3. Prior Schooling & Survey Details
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      How did you hear about DPS Azaad Nagar?
                    </label>
                    <select
                      name="howHeardAboutUs"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    >
                      <option value="School Website">School Website</option>
                      <option value="Friend/Relative Reference">Friend / Relative Reference</option>
                      <option value="Newspaper Advertisement">Newspaper Advertisement</option>
                      <option value="Billboard / Outdoor Hoarding">Billboard / Outdoor Hoarding</option>
                      <option value="Social Media (Facebook/Instagram)">Social Media (Facebook/Instagram)</option>
                      <option value="Existing DPS Student Sibling">Existing DPS Student Sibling</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Reason for joining DPS Azaad Nagar
                    </label>
                    <input
                      type="text"
                      name="reasonJoining"
                      placeholder="e.g. Academic Excellence & Sports Infrastructure"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Previous School (if any)
                    </label>
                    <input
                      type="text"
                      name="previousSchool"
                      placeholder="PREVIOUS SCHOOL NAME"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      PEN (Permanent Education Number)
                    </label>
                    <input
                      type="text"
                      name="penNo"
                      placeholder="GOVT PEN NUMBER"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Previous School Board
                    </label>
                    <select
                      name="previousBoard"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    >
                      <option value="CBSE">CBSE</option>
                      <option value="ICSE / CISCE">ICSE / CISCE</option>
                      <option value="UP Board">UP Board</option>
                      <option value="IB / International">IB / International</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Previous Class Attended
                    </label>
                    <input
                      type="text"
                      name="previousClass"
                      placeholder="e.g. CLASS IV"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Medium of Instruction
                    </label>
                    <select
                      name="mediumInstruction"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    >
                      <option value="English">English</option>
                      <option value="Hindi">Hindi</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Reason for Leaving Previous School
                    </label>
                    <input
                      type="text"
                      name="reasonLeavingPrevious"
                      placeholder="REASON FOR TRANSFER"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 4: FATHER'S DETAILS */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <Users className="w-4 h-4 text-emerald-800" />
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                    4. Father's Details
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="fatherName"
                      required
                      placeholder="FATHER FULL NAME"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Email ID
                    </label>
                    <input
                      type="email"
                      name="fatherEmail"
                      placeholder="father@email.com"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Mobile No. *
                    </label>
                    <input
                      type="tel"
                      name="fatherPhone"
                      required
                      placeholder="+91 98390 XXXXX"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Occupation
                    </label>
                    <input
                      type="text"
                      name="fatherOccupation"
                      placeholder="BUSINESS / SERVICE / DOCTOR"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Organization
                    </label>
                    <input
                      type="text"
                      name="fatherOrganization"
                      placeholder="COMPANY / FIRM NAME"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Designation
                    </label>
                    <input
                      type="text"
                      name="fatherDesignation"
                      placeholder="DESIGNATION / ROLE"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Educational Qualification
                    </label>
                    <input
                      type="text"
                      name="fatherQualification"
                      placeholder="GRADUATE / POST GRADUATE"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Father Aadhaar No.
                    </label>
                    <input
                      type="text"
                      name="fatherAadhaar"
                      placeholder="12-DIGIT AADHAAR"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Monthly Income (₹)
                    </label>
                    <input
                      type="text"
                      name="fatherMonthlyIncome"
                      placeholder="MONTHLY INCOME IN FIGURES"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 5: MOTHER'S DETAILS */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <Users className="w-4 h-4 text-emerald-800" />
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                    5. Mother's Details
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      name="motherName"
                      placeholder="MOTHER FULL NAME"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Email ID
                    </label>
                    <input
                      type="email"
                      name="motherEmail"
                      placeholder="mother@email.com"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Mobile No.
                    </label>
                    <input
                      type="tel"
                      name="motherPhone"
                      placeholder="+91 98390 XXXXX"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Occupation
                    </label>
                    <input
                      type="text"
                      name="motherOccupation"
                      placeholder="HOMEMAKER / TEACHER / SERVICE"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Educational Qualification
                    </label>
                    <input
                      type="text"
                      name="motherQualification"
                      placeholder="GRADUATE / POST GRADUATE"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Mother Aadhaar No.
                    </label>
                    <input
                      type="text"
                      name="motherAadhaar"
                      placeholder="12-DIGIT AADHAAR"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 6: LOCAL GUARDIAN'S DETAILS (IF PARENTS RESIDE OUTSIDE KANPUR) */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <Phone className="w-4 h-4 text-emerald-800" />
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                    6. Local Guardian's Details <span className="text-[11px] font-normal text-slate-500 normal-case">(To be filled ONLY if parents reside outside Kanpur)</span>
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Guardian Full Name
                    </label>
                    <input
                      type="text"
                      name="guardianName"
                      placeholder="LOCAL GUARDIAN NAME"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Relation with Student
                    </label>
                    <input
                      type="text"
                      name="guardianRelation"
                      placeholder="e.g. UNCLE / GRANDFATHER"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Mobile No.
                    </label>
                    <input
                      type="tel"
                      name="guardianPhone"
                      placeholder="+91 98390 XXXXX"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 7: DECLARATION & SUBMIT */}
              <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
                  <FileCheck className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold uppercase tracking-wide">
                    7. Parent / Guardian Declaration
                  </h3>
                </div>

                <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
                  <p>
                    1. I hereby declare that all information furnished in this Registration Form is true, correct, and complete to the best of my knowledge and belief.
                  </p>
                  <p>
                    2. I understand that submission of this application form does not guarantee admission to the school, which remains subject to availability of seats and performance in the pre-admission interaction/test.
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="declaration"
                    required
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-700 bg-slate-800"
                  />
                  <label htmlFor="declaration" className="text-xs font-bold text-white cursor-pointer">
                    I agree to the above declaration & confirm all details are filled in capital letters.
                  </label>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                  <Link
                    href="/students"
                    className="px-5 py-2.5 text-xs font-semibold text-slate-400 hover:text-white"
                  >
                    Cancel
                  </Link>
                  <button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black py-3.5 px-8 rounded-xl text-xs transition shadow-lg flex items-center gap-2 cursor-pointer"
                  >
                    <ClipboardList className="w-4 h-4" />
                    <span>Submit Registration & Issue Unique REG ID</span>
                  </button>
                </div>
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
                      defaultValue={studentToPromote.category || "General"}
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
                      defaultValue={studentToPromote.aadhaarNo || ""}
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
                      defaultValue={studentToPromote.permanentAddress || studentToPromote.currentAddress || ""}
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
