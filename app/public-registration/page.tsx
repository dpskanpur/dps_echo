import { prisma } from "@/lib/prisma";
import { registerStudentPublic } from "@/lib/actions";
import {
  Building2,
  User,
  Phone,
  MapPin,
  ClipboardList,
  Sparkles,
  ShieldCheck,
  CreditCard,
  Lock,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { DobInputWithWords } from "@/components/DobInputWithWords";
import { ValidatedInput } from "@/components/ValidatedInput";
import { RegistrationFormWrapper } from "@/components/RegistrationFormWrapper";
import { CampusSelector } from "@/components/CampusSelector";

import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Online Student Registration 2026-27",
  description:
    "Official Online Student Registration Portal for Delhi Public School (DPS) Kanpur campuses: Azad Nagar, Barra, Kidwai Nagar, Servodaya Nagar. Apply for admissions 2026-27 online.",
  openGraph: {
    title: "Online Student Registration 2026-27 | DPS Kanpur",
    description:
      "Official Online Student Registration Portal for Delhi Public School Kanpur campuses.",
    url: "https://echo.dpskanpur.com/public-registration",
  },
};

export default async function PublicRegistrationPage({
  searchParams,
}: {
  searchParams: Promise<{ campus?: string }>;
}) {
  const { campus: campusId } = await searchParams;

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
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Top Header Banner */}
      <header className="bg-emerald-900 text-white shadow-md border-b border-emerald-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-white p-1.5 rounded-xl shadow-xs">
              <Image
                src="/dps_crest.png"
                alt="DPS Crest"
                width={44}
                height={44}
                className="object-contain"
              />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black tracking-tight text-amber-300 uppercase">
                Delhi Public School Kanpur
              </h1>
              <p className="text-xs text-emerald-200">
                Official Online Applicant Registration Portal (Session 2026-2027)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs font-bold text-emerald-200 hover:text-white transition bg-emerald-950/60 px-3 py-1.5 rounded-lg border border-emerald-700/50"
            >
              Staff Portal Login →
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full space-y-6">
        {/* Banner Card */}
        <div className="bg-gradient-to-r from-emerald-900 via-emerald-850 to-teal-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-emerald-800 relative overflow-hidden">
          <div className="relative z-10 space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              Online Registration Open for Session 2026-2027
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              Apply Online for Student Admission
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100/90 max-w-2xl leading-relaxed">
              Complete the online registration form below. Registration requires an online fee payment of{" "}
              <strong className="text-amber-300">₹{selectedCampus.registrationFee.toLocaleString("en-IN")}</strong>. All online applications are reviewed by the school admission committee before issuing final admission confirmation.
            </p>
          </div>
        </div>

        {/* Public Registration Form */}
        <RegistrationFormWrapper action={registerStudentPublic}>
          <input type="hidden" name="campusId" value={selectedCampus.id} />

          {/* SECTION 1: CAMPUS & CLASS SELECTION */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Building2 className="w-4 h-4 text-emerald-800" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                1. Select Campus & Seeking Class
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Select DPS Campus <span className="text-rose-500 font-bold">*</span>
                </label>
                <CampusSelector
                  campuses={campuses}
                  selectedCampusId={selectedCampus.id}
                  baseUrl="/public-registration"
                  showFee
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Seeking Admission in Class <span className="text-rose-500 font-bold">*</span>
                </label>
                <select
                  name="classId"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
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

          {/* SECTION 2: STUDENT DEMOGRAPHICS */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <User className="w-4 h-4 text-emerald-800" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                2. Student Personal Information
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <ValidatedInput
                label="First Name"
                name="firstName"
                fieldType="text-only"
                isRequired
                uppercase
                placeholder="FIRST NAME"
              />

              <ValidatedInput
                label="Middle Name"
                name="middleName"
                fieldType="text-only"
                uppercase
                placeholder="MIDDLE NAME"
              />

              <ValidatedInput
                label="Last Name"
                name="lastName"
                fieldType="text-only"
                isRequired
                uppercase
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
                label="Aadhaar No."
                name="aadhaarNo"
                fieldType="aadhaar"
                hint="12 digits"
                placeholder="12-DIGIT AADHAAR"
              />

              <ValidatedInput
                label="Student / Contact Mobile"
                name="studentMobile"
                fieldType="phone"
                isRequired
                hint="10 digits"
                placeholder="98390XXXXX"
              />

              <ValidatedInput
                label="Student Email Address"
                name="studentEmail"
                fieldType="email"
                placeholder="student@example.com"
              />
            </div>
          </div>

          {/* SECTION 3: GUARDIAN DETAILS */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Phone className="w-4 h-4 text-emerald-800" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                3. Parent / Guardian Details
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ValidatedInput
                label="Father's Full Name"
                name="fatherName"
                fieldType="text-only"
                isRequired
                uppercase
                placeholder="FATHER NAME"
              />

              <ValidatedInput
                label="Father's Mobile No."
                name="fatherPhone"
                fieldType="phone"
                isRequired
                hint="10 digits"
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
                placeholder="e.g. Business / Service"
              />

              <ValidatedInput
                label="Mother's Full Name"
                name="motherName"
                fieldType="text-only"
                isRequired
                uppercase
                placeholder="MOTHER NAME"
              />

              <ValidatedInput
                label="Mother's Mobile No."
                name="motherPhone"
                fieldType="phone"
                hint="10 digits"
                placeholder="98390XXXXX"
              />
            </div>
          </div>

          {/* SECTION 4: RESIDENTIAL ADDRESS */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <MapPin className="w-4 h-4 text-emerald-800" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                4. Residential Address
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Residential Address <span className="text-rose-500 font-bold">*</span>
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
            </div>
          </div>

          {/* SECTION 5: ONLINE PAYMENT GATEWAY (ONLINE ONLY) */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border-2 border-emerald-300 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-200">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-800" />
                <h3 className="text-sm font-black text-emerald-950 uppercase tracking-wide">
                  5. Mandatory Online Registration Fee Payment
                </h3>
              </div>
              <span className="bg-emerald-800 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                <Lock className="w-3 h-3" /> Online Gateway Only
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="space-y-2">
                <p className="text-xs text-slate-700 leading-relaxed">
                  As per school policy for online public applications, the registration fee must be paid strictly via <strong className="text-emerald-900 font-bold">Online Payment Gateway</strong>. Cash payments are accepted only for physical counter registrations.
                </p>
                <div className="p-3 bg-white rounded-xl border border-emerald-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Fixed Registration Fee ({selectedCampus.code}):</span>
                  <span className="text-base font-black text-emerald-900">₹{selectedCampus.registrationFee.toLocaleString("en-IN")}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Select Online Payment Method *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 p-3 bg-white border border-emerald-400 rounded-xl cursor-pointer hover:bg-emerald-50 transition">
                    <input
                      type="radio"
                      name="paymentGateway"
                      value="RAZORPAY"
                      defaultChecked
                      className="accent-emerald-700"
                    />
                    <span className="text-xs font-bold text-slate-800">Razorpay / UPI / Cards</span>
                  </label>
                  <label className="flex items-center gap-2 p-3 bg-white border border-emerald-200 rounded-xl cursor-pointer hover:bg-emerald-50 transition">
                    <input
                      type="radio"
                      name="paymentGateway"
                      value="NETBANKING"
                      className="accent-emerald-700"
                    />
                    <span className="text-xs font-bold text-slate-800">NetBanking / NEFT</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Registration Button */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>Status will be saved as REGISTERED (Pending Admin Confirmation)</span>
            </div>

            <button
              type="submit"
              className="bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 text-white font-bold py-3.5 px-8 rounded-xl text-xs transition shadow-lg flex items-center gap-2 cursor-pointer"
            >
              <CreditCard className="w-4 h-4 text-amber-300" />
              <span>Pay ₹{selectedCampus.registrationFee.toLocaleString("en-IN")} & Complete Online Registration</span>
            </button>
          </div>
        </RegistrationFormWrapper>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-6 border-t border-slate-800 text-center text-xs">
        <p>© 2026 Delhi Public School Kanpur. Official Echo Admissions Portal.</p>
      </footer>
    </div>
  );
}
