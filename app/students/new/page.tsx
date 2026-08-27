import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";
import { createStudent } from "@/lib/actions";
import { getCurrentUser, getUserPermissions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { UserPlus, Building2, User, Phone, MapPin, Sparkles } from "lucide-react";
import Link from "next/link";

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
    redirect("/students?error=unauthorized_create_student");
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

        <main className="p-8 space-y-6 flex-1 overflow-y-auto max-w-5xl mx-auto w-full">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-800" />
                <h1 className="text-xl font-black text-slate-900">
                  New Student Admission & Enrolment
                </h1>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Formalize student onboarding, generate Scholar ID, and allocate academic cohort.
              </p>
            </div>
            <Link
              href="/students"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              ← Back to Directory
            </Link>
          </div>

          {/* Admission Form */}
          <form action={createStudent} className="space-y-6">
            <input type="hidden" name="campusId" value={selectedCampus.id} />

            {/* Step 1: Campus & Academic Placement */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
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
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-bold text-emerald-900">
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
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
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <User className="w-4 h-4 text-emerald-800" />
                <h2 className="text-sm font-bold text-slate-900">
                  2. Student Demographics & Personal Details
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    required
                    placeholder="e.g. Aarav"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Gender *
                  </label>
                  <select
                    name="gender"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
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
                    Student Aadhaar Number
                  </label>
                  <input
                    type="text"
                    name="aadhaarNo"
                    placeholder="xxxx-xxxx-xxxx"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
              </div>
            </div>

            {/* Step 3: Parents & Contact Info */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <Phone className="w-4 h-4 text-emerald-800" />
                <h2 className="text-sm font-bold text-slate-900">
                  3. Parents & Guardian Details
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Father Info */}
                <div className="space-y-3 bg-slate-50/60 p-4 rounded-lg border border-slate-200/60">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Father's Details
                  </h3>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="fatherName"
                      required
                      placeholder="e.g. Rajesh Sharma"
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        name="fatherPhone"
                        required
                        placeholder="98390xxxxx"
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        name="fatherEmail"
                        placeholder="parent@example.com"
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Occupation / Organization
                    </label>
                    <input
                      type="text"
                      name="fatherOccupation"
                      placeholder="e.g. Chartered Accountant"
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>

                {/* Mother Info */}
                <div className="space-y-3 bg-slate-50/60 p-4 rounded-lg border border-slate-200/60">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Mother's Details
                  </h3>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      name="motherName"
                      placeholder="e.g. Sunita Sharma"
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        name="motherPhone"
                        placeholder="98390xxxxx"
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Emergency Contact *
                      </label>
                      <input
                        type="tel"
                        name="emergencyContact"
                        required
                        placeholder="+91 98390 12345"
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="pt-2">
                <div className="flex items-center gap-1.5 mb-1 text-xs font-bold text-slate-700">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>Residential Address</span>
                </div>
                <textarea
                  name="currentAddress"
                  rows={2}
                  placeholder="House / Flat No., Street, Area, City (e.g. 14/82, Civil Lines, Kanpur)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                ></textarea>
              </div>
            </div>

            {/* Submission */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Link
                href="/students"
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 rounded-lg text-xs font-semibold transition"
              >
                Cancel
              </Link>
              <button
                type="submit"
                className="bg-emerald-800 hover:bg-emerald-900 text-white px-6 py-2.5 rounded-lg text-xs font-bold transition shadow-md flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Enroll Student & Generate Scholar ID
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
