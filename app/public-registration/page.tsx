import { getPublicCampuses, getPublicClasses } from "@/lib/public-data";
import { registerStudentPublic } from "@/lib/actions";
import {
  Building2,
  User,
  Phone,
  MapPin,
  ShieldCheck,
  CreditCard,
  Lock,
} from "lucide-react";
import { DobInputWithWords } from "@/components/DobInputWithWords";
import { ValidatedInput } from "@/components/ValidatedInput";
import { RegistrationFormWrapper } from "@/components/RegistrationFormWrapper";
import { PublicShell } from "@/components/PublicShell";
import { CampusSelector } from "@/components/CampusSelector";

import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Online Student Registration 2026-27",
  description: "Official Online Student Registration Portal for Delhi Public School (DPS) Kanpur campuses: Azad Nagar, Barra, Kidwai Nagar, Servodaya Nagar. Apply for admissions 2026-27 online.",
  openGraph: {
    title: "Online Student Registration 2026-27 | DPS Kanpur",
    description: "Official Online Student Registration Portal for Delhi Public School Kanpur campuses.",
    url: "https://echo.dpskanpur.com/public-registration",
  },
};

export default async function PublicRegistrationPage({
  searchParams,
}: {
  searchParams: Promise<{ campus?: string }>;
}) {
  const { campus: campusId } = await searchParams;

  // Cached across requests — see lib/public-data.ts
  let campuses: any[] = [];
  try {
    campuses = await getPublicCampuses();
  } catch (error) {
    console.error("Public registration campus query error:", error);
  }

  if (!campuses || campuses.length === 0) {
    campuses = [
      { id: "azd", code: "AZD", name: "DPS Azad Nagar", registrationFee: 1000 },
      { id: "bar", code: "BAR", name: "DPS Barra", registrationFee: 1000 },
      { id: "kid", code: "KID", name: "DPS Kidwai Nagar", registrationFee: 1000 },
      { id: "srv", code: "SRV", name: "DPS Servodaya Nagar", registrationFee: 1000 },
    ];
  }

  const selectedCampus =
    campuses.find((c: any) => c.id === campusId) || campuses[0];

  // Public page: on an unconfigured database this must read as "not open yet"
  // rather than crashing in front of a parent.
  if (!selectedCampus) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-slate-300 p-7 text-center space-y-3">
          <h1 className="text-lg font-black text-slate-900">Registration Not Open</h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            Online registration is not accepting applications at the moment. Please contact the
            school office for assistance.
          </p>
        </div>
      </div>
    );
  }

  let classes: any[] = [];
  try {
    classes = await getPublicClasses(selectedCampus.id);
  } catch (error) {
    console.error("Public registration classes query error:", error);
  }

  if (!classes || classes.length === 0) {
    classes = [
      { id: "cls-pg", name: "Playgroup (PG)", numericGrade: 0 },
      { id: "cls-nur", name: "Nursery", numericGrade: 0 },
      { id: "cls-prep", name: "Prep / KG", numericGrade: 0 },
      { id: "cls-1", name: "Class I", numericGrade: 1 },
      { id: "cls-2", name: "Class II", numericGrade: 2 },
      { id: "cls-3", name: "Class III", numericGrade: 3 },
      { id: "cls-4", name: "Class IV", numericGrade: 4 },
      { id: "cls-5", name: "Class V", numericGrade: 5 },
      { id: "cls-6", name: "Class VI", numericGrade: 6 },
      { id: "cls-7", name: "Class VII", numericGrade: 7 },
      { id: "cls-8", name: "Class VIII", numericGrade: 8 },
      { id: "cls-9", name: "Class IX", numericGrade: 9 },
      { id: "cls-10", name: "Class X", numericGrade: 10 },
      { id: "cls-11", name: "Class XI", numericGrade: 11 },
      { id: "cls-12", name: "Class XII", numericGrade: 12 },
    ];
  }

  return (
    <PublicShell
      width="wide"
      eyebrow="Admissions 2026-2027"
      title="Apply for admission"
      subtitle={`Complete the form below to register an applicant. A registration fee of ₹${selectedCampus.registrationFee.toLocaleString("en-IN")} is payable online. Every application is reviewed by the admission committee before admission is confirmed.`}
      badge={
        <>
          <ShieldCheck className="w-3.5 h-3.5" /> Registration open
        </>
      }
    >
      <div className="space-y-5">
        {/* Public Registration Form */}
        <RegistrationFormWrapper action={registerStudentPublic}>
          <input type="hidden" name="campusId" value={selectedCampus.id} />

          {/* SECTION 1: CAMPUS & CLASS SELECTION */}
          <div className="bg-white border border-slate-300 p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
              <Building2 className="w-4 h-4 text-emerald-800" />
              <h3 className="text-sm font-semibold text-slate-900">
                1. Select Campus & Seeking Class
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
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
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Seeking Admission in Class <span className="text-rose-500 font-bold">*</span>
                </label>
                <select
                  name="classId"
                  required
                  className="w-full bg-slate-50 border border-slate-300 p-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                >
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Academic Session
                </label>
                <div className="p-2.5 bg-slate-100 border border-slate-300 text-xs font-bold text-slate-800">
                  2026-2027
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: STUDENT DEMOGRAPHICS */}
          <div className="bg-white border border-slate-300 p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
              <User className="w-4 h-4 text-emerald-800" />
              <h3 className="text-sm font-semibold text-slate-900">
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
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Gender <span className="text-rose-500 font-bold">*</span>
                </label>
                <select
                  name="gender"
                  required
                  className="w-full bg-slate-50 border border-slate-300 p-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
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
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Category <span className="text-rose-500 font-bold">*</span>
                </label>
                <select
                  name="category"
                  required
                  className="w-full bg-slate-50 border border-slate-300 p-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
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
          <div className="bg-white border border-slate-300 p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
              <Phone className="w-4 h-4 text-emerald-800" />
              <h3 className="text-sm font-semibold text-slate-900">
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
          <div className="bg-white border border-slate-300 p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
              <MapPin className="w-4 h-4 text-emerald-800" />
              <h3 className="text-sm font-semibold text-slate-900">
                4. Residential Address
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Full Residential Address <span className="text-rose-500 font-bold">*</span>
                </label>
                <textarea
                  name="currentAddress"
                  required
                  rows={2}
                  placeholder="House No., Street Name, Locality, Kanpur"
                  className="w-full bg-slate-50 border border-slate-300 p-2.5 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
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
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-300 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-200">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-800" />
                <h3 className="text-sm font-black text-emerald-950 uppercase tracking-wide">
                  5. Mandatory Online Registration Fee Payment
                </h3>
              </div>
              <span className="bg-emerald-800 text-white text-xs font-bold px-3 py-1 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Online Gateway Only
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="space-y-2">
                <p className="text-xs text-slate-700 leading-relaxed">
                  As per school policy for online public applications, the registration fee must be paid strictly via <strong className="text-emerald-900 font-bold">Online Payment Gateway</strong>. Cash payments are accepted only for physical counter registrations.
                </p>
                <div className="p-3 bg-white border border-emerald-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Fixed Registration Fee ({selectedCampus.code}):</span>
                  <span className="text-base font-black text-emerald-900">₹{selectedCampus.registrationFee.toLocaleString("en-IN")}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Select Online Payment Gateway *
                </label>
                <div className="p-3 bg-white border border-emerald-400 flex items-center justify-between">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      name="paymentGateway"
                      value="RAZORPAY"
                      defaultChecked
                      className="w-4 h-4 accent-emerald-700 cursor-pointer"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-900">Razorpay Payment Gateway</div>
                      <div className="text-[11px] text-slate-500 font-medium">UPI, Credit/Debit Cards, NetBanking & Wallets</div>
                    </div>
                  </label>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 shrink-0">
                    Secure
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Registration Button */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-300">
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>Status will be saved as REGISTERED (Pending Admin Confirmation)</span>
            </div>

            <button
              type="submit"
              className="bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 text-white font-bold py-3.5 px-8 text-xs transition flex items-center gap-2 cursor-pointer"
            >
              <CreditCard className="w-4 h-4 text-amber-300" />
              <span>Pay ₹{selectedCampus.registrationFee.toLocaleString("en-IN")} & Complete Online Registration</span>
            </button>
          </div>
        </RegistrationFormWrapper>
      </div>
    </PublicShell>
  );
}
