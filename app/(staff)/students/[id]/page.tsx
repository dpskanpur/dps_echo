import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";
import { getCurrentUser, getUserPermissions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { formatDate, formatCurrency } from "@/lib/utils";
import { promoteStudentToAdmission, updateStudent } from "@/lib/actions";
import { StudentDiscountCard } from "@/components/StudentDiscountCard";
import { RecordPaymentModal } from "@/components/RecordPaymentModal";
import {
  User,
  FileText,
  Users,
  Building2,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Heart,
  FolderOpen,
  Receipt,
  CheckCircle2,
  Clock,
  Printer,
  ShieldCheck,
  Sparkles,
  Pencil,
} from "lucide-react";

import { getLinkedSiblings } from "@/lib/promotion-actions";
import { SiblingLinkCard } from "@/components/SiblingLinkCard";
import { PassportPhotoUploader } from "@/components/PassportPhotoUploader";
import { DocumentUploadSection } from "@/components/DocumentUploadSection";

export const dynamic = "force-dynamic";

export default async function StudentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; edit?: string; notice?: string }>;
}) {
  const { id } = await params;
  const { tab = "overview", edit, notice } = await searchParams;
  const isEditing = edit === "true";

  const user = await getCurrentUser();
  const permissions = await getUserPermissions(user);

  if (!permissions.modules.students.canView && !permissions.isAdmin) {
    redirect("/?error=unauthorized_students");
  }

  const campuses = await prisma.campus.findMany({ orderBy: { name: "asc" } });

  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      campus: true,
      class: { include: { sections: true } },
      section: true,
      guardians: true,
      documents: true,
      transferCertificate: true,
      discounts: true,
      promotionHistories: {
        include: { fromCampus: true, toCampus: true },
        orderBy: { createdAt: "desc" },
      },
      invoices: {
        include: {
          items: { include: { feeHead: true } },
          payments: true,
        },
        orderBy: { dueDate: "desc" },
      },
      payments: {
        orderBy: { paymentDate: "desc" },
      },
    },
  });

  if (!student) {
    notFound();
  }

  const linkedSiblings = await getLinkedSiblings(student.id);

  const classes = await prisma.class.findMany({
    where: { campusId: student.campusId },
    include: { sections: true },
    orderBy: { sequence: "asc" },
  });

  const primaryGuardian = student.guardians.find((g) => g.isPrimary) || student.guardians[0];
  const totalInvoiced = student.invoices.reduce((acc, inv) => acc + inv.netAmount, 0);
  const totalPaid = student.invoices.reduce((acc, inv) => acc + inv.paidAmount, 0);
  const totalBalance = student.invoices.reduce((acc, inv) => acc + inv.balanceAmount, 0);

  return (
        <main className="p-8 space-y-6 flex-1 overflow-y-auto max-w-6xl mx-auto w-full">
          {/* Back Navigation */}
          <div className="flex items-center justify-between">
            <Link
              href="/students"
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1"
            >
              ← Back to Student Directory
            </Link>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Student ID:</span>
              <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                {student.id}
              </span>
            </div>
          </div>

          {/* Student Dossier Header Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              {/* Left Details */}
              <div className="flex items-start gap-4">
                {student.photoUrl ? (
                  <img
                    src={student.photoUrl}
                    alt={`${student.firstName} ${student.lastName}`}
                    className="w-16 h-20 rounded-xl object-cover border border-slate-200 shadow-md shrink-0 bg-slate-100"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-800 to-teal-600 text-white font-black text-2xl flex items-center justify-center shadow-md shrink-0">
                    {student.firstName[0]}
                    {student.lastName[0]}
                  </div>
                )}
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-black text-slate-900">
                      {student.firstName} {student.lastName}
                    </h1>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        student.status === "ACTIVE"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : student.status === "REGISTERED"
                          ? "bg-amber-100 text-amber-900 border border-amber-300 font-extrabold"
                          : student.status === "TC_ISSUED"
                          ? "bg-purple-100 text-purple-800 border border-purple-200"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {student.status === "REGISTERED" ? "REGISTERED (PENDING ADMISSION)" : student.status}
                    </span>
                    {student.registrationNo && (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-900 text-xs font-mono font-bold border border-amber-200">
                        REG ID: {student.registrationNo}
                      </span>
                    )}
                    {student.house && (
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-semibold">
                        House: {student.house}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-y-1 gap-x-4 mt-2 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <span className="font-mono font-bold text-slate-800">
                        {student.status === "REGISTERED" ? `REG: ${student.registrationNo || student.scholarNo}` : `ADM ID: ${student.scholarNo}`}
                      </span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                      <strong>{student.campus.name}</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      Class: <strong>{student.class.name} {student.section ? `(${student.section.name})` : ""}</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {student.status === "REGISTERED" ? `Registered: ${student.registrationDate ? formatDate(student.registrationDate) : "Recent"}` : `Admitted: ${formatDate(student.admissionDate)}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <Link
                  href={isEditing ? `/students/${student.id}` : `/students/${student.id}?edit=true`}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition shadow-xs cursor-pointer ${
                    isEditing
                      ? "bg-slate-800 text-white hover:bg-slate-900"
                      : "bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100"
                  }`}
                >
                  <Pencil className="w-3.5 h-3.5 text-amber-700" />
                  <span>{isEditing ? "Close Edit Mode" : "Edit Record"}</span>
                </Link>

                {student.status === "ACTIVE" && (
                  <>
                    <Link
                      href={`/tc?studentId=${student.id}`}
                      className="inline-flex items-center gap-1.5 bg-purple-700 hover:bg-purple-800 text-white px-3.5 py-2 rounded-lg text-xs font-bold transition shadow-xs"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Issue TC
                    </Link>
                  </>
                )}
                {student.transferCertificate && (
                  <Link
                    href={`/tc?studentId=${student.id}`}
                    className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white px-3.5 py-2 rounded-lg text-xs font-bold transition"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print CBSE TC
                  </Link>
                )}
              </div>
            </div>

          {/* EDIT STUDENT RECORD PANEL */}
          {isEditing && (
            <form action={updateStudent} className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-amber-400 shadow-xl space-y-6 my-6">
              <input type="hidden" name="studentId" value={student.id} />

              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Pencil className="w-5 h-5 text-amber-600" />
                  <h2 className="text-lg font-black text-slate-900">Edit Student Information</h2>
                </div>
                <Link
                  href={`/students/${student.id}`}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  ✕ Cancel & Close
                </Link>
              </div>

              {/* 1. Student Personal Information */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">1. Student Personal Info</h3>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-3">
                  <PassportPhotoUploader
                    value={student.photoUrl}
                    studentId={student.id}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">First Name *</label>
                    <input
                      type="text"
                      name="firstName"
                      required
                      defaultValue={student.firstName}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-400 focus:outline-none uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Middle Name</label>
                    <input
                      type="text"
                      name="middleName"
                      defaultValue={student.middleName || ""}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-400 focus:outline-none uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Last Name *</label>
                    <input
                      type="text"
                      name="lastName"
                      required
                      defaultValue={student.lastName}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-400 focus:outline-none uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Date of Birth</label>
                    <input
                      type="date"
                      name="dob"
                      defaultValue={student.dob ? new Date(student.dob).toISOString().split("T")[0] : ""}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Gender *</label>
                    <select
                      name="gender"
                      defaultValue={student.gender}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-400 focus:outline-none"
                    >
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Blood Group</label>
                    <select
                      name="bloodGroup"
                      defaultValue={student.bloodGroup || "B+"}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-400 focus:outline-none"
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
                    <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                    <select
                      name="category"
                      defaultValue={student.category || "General"}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-400 focus:outline-none"
                    >
                      <option value="General">General</option>
                      <option value="OBC">OBC</option>
                      <option value="SC">SC</option>
                      <option value="ST">ST</option>
                      <option value="EWS">EWS</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Student Mobile</label>
                    <input
                      type="text"
                      name="studentMobile"
                      defaultValue={student.studentMobile || ""}
                      placeholder="10 digits"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Student Aadhaar No.</label>
                    <input
                      type="text"
                      name="aadhaarNo"
                      defaultValue={student.aadhaarNo || ""}
                      placeholder="12 digits"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Academic Placement & Section */}
              <div className="space-y-3 pt-4 border-t border-slate-200">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">2. Academic & Section Assignment</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Class *</label>
                    <select
                      name="classId"
                      defaultValue={student.classId}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-400 focus:outline-none"
                    >
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Section</label>
                    <select
                      name="sectionId"
                      defaultValue={student.sectionId || ""}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-400 focus:outline-none"
                    >
                      <option value="">Unassigned</option>
                      {classes
                        .find((c) => c.id === student.classId)
                        ?.sections.map((sec) => (
                          <option key={sec.id} value={sec.id}>
                            Section {sec.name} {sec.roomNo ? `(Room ${sec.roomNo})` : ""}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">House</label>
                    <select
                      name="house"
                      defaultValue={student.house || "Ganga"}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-400 focus:outline-none"
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

              {/* 3. Parent / Guardian Details */}
              <div className="space-y-3 pt-4 border-t border-slate-200">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">3. Parent / Guardian Particulars</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Father's Name</label>
                    <input
                      type="text"
                      name="fatherName"
                      defaultValue={student.guardians.find((g) => g.relation === "FATHER")?.name || primaryGuardian?.name || ""}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-400 focus:outline-none uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Father's Mobile</label>
                    <input
                      type="text"
                      name="fatherPhone"
                      defaultValue={student.guardians.find((g) => g.relation === "FATHER")?.phone || primaryGuardian?.phone || ""}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Mother's Name</label>
                    <input
                      type="text"
                      name="motherName"
                      defaultValue={student.guardians.find((g) => g.relation === "MOTHER")?.name || ""}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-400 focus:outline-none uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Mother's Mobile</label>
                    <input
                      type="text"
                      name="motherPhone"
                      defaultValue={student.guardians.find((g) => g.relation === "MOTHER")?.phone || ""}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Residential Address */}
              <div className="space-y-3 pt-4 border-t border-slate-200">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">4. Present Address</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Present Address</label>
                    <textarea
                      name="currentAddress"
                      rows={2}
                      defaultValue={student.currentAddress || ""}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-amber-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">PIN Code</label>
                    <input
                      type="text"
                      name="currentPincode"
                      defaultValue={student.currentPincode || ""}
                      placeholder="208001"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <Link
                  href={`/students/${student.id}`}
                  className="px-5 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold py-3 px-6 rounded-xl text-xs transition shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Updated Student Information</span>
                </button>
              </div>
            </form>
          )}

          {/* REGISTERED APPLICANT: 1-CLICK ADMISSION PROMOTION CARD */}
          {student.status === "REGISTERED" && (
            <div className="bg-gradient-to-r from-emerald-900 via-emerald-850 to-teal-900 text-white rounded-2xl p-6 shadow-lg border border-emerald-800 space-y-5 mt-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-bold uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5" />
                    Applicant Registered — Ready for Admission Confirmation
                  </div>
                  <h2 className="text-xl font-black text-white">
                    Confirm Admission & Issue Permanent Scholar ID
                  </h2>
                  <p className="text-xs text-emerald-100/90 max-w-xl">
                    Applicant <strong className="text-amber-300">{student.firstName} {student.lastName}</strong> is registered under REG ID <strong className="font-mono text-amber-300">{student.registrationNo}</strong>. Allocate section & house below to confirm active admission.
                  </p>
                </div>
              </div>

              <form action={promoteStudentToAdmission} className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <input type="hidden" name="studentId" value={student.id} />

                <div>
                  <label className="block text-xs font-bold text-emerald-100 mb-1">
                    Assign Section *
                  </label>
                  <select
                    name="sectionId"
                    className="w-full bg-slate-900 border border-emerald-700/60 rounded-xl p-2.5 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
                  >
                    {student.class.sections?.map((sec) => (
                      <option key={sec.id} value={sec.id}>
                        Section {sec.name} {sec.roomNo ? `(${sec.roomNo.startsWith("Room") ? sec.roomNo : `Room ${sec.roomNo}`})` : ""}
                      </option>
                    )) || <option value="">No Section</option>}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-emerald-100 mb-1">
                    Assign House *
                  </label>
                  <select
                    name="house"
                    defaultValue="Ganga"
                    className="w-full bg-slate-900 border border-emerald-700/60 rounded-xl p-2.5 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
                  >
                    <option value="Ganga">Ganga (Red)</option>
                    <option value="Yamuna">Yamuna (Blue)</option>
                    <option value="Jhelum">Jhelum (Green)</option>
                    <option value="Chenab">Chenab (Yellow)</option>
                    <option value="Ravi">Ravi (Orange)</option>
                    <option value="Sutlej">Sutlej (Purple)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-slate-950 font-black py-2.5 px-6 rounded-xl text-xs transition shadow-lg flex items-center justify-center gap-2 cursor-pointer w-full"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-950" />
                  <span>Confirm & Issue Scholar ID</span>
                </button>
              </form>
            </div>
          )}

            {/* Quick Balance Ticker */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-5 border-t border-slate-100">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[11px] font-bold uppercase text-slate-400 block">
                  Total Invoiced
                </span>
                <span className="text-base font-bold text-slate-800">
                  {formatCurrency(totalInvoiced)}
                </span>
              </div>

              <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-100">
                <span className="text-[11px] font-bold uppercase text-emerald-800 block">
                  Total Paid
                </span>
                <span className="text-base font-bold text-emerald-900">
                  {formatCurrency(totalPaid)}
                </span>
              </div>

              <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-100">
                <span className="text-[11px] font-bold uppercase text-amber-800 block">
                  Outstanding Balance
                </span>
                <span className="text-base font-bold text-amber-900">
                  {formatCurrency(totalBalance)}
                </span>
              </div>
            </div>
          </div>

          {/* Dossier Tabs */}
          <div className="border-b border-slate-200 flex gap-4 text-xs font-bold">
            <Link
              href={`/students/${student.id}?tab=overview`}
              className={`pb-3 border-b-2 transition flex items-center gap-1.5 ${
                tab === "overview"
                  ? "border-emerald-800 text-emerald-900"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <User className="w-4 h-4" /> 360° Profile & Demographics
            </Link>
            <Link
              href={`/students/${student.id}?tab=family`}
              className={`pb-3 border-b-2 transition flex items-center gap-1.5 ${
                tab === "family"
                  ? "border-emerald-800 text-emerald-900"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Users className="w-4 h-4" /> Family & Guardians ({student.guardians.length})
            </Link>
            <Link
              href={`/students/${student.id}?tab=fees`}
              className={`pb-3 border-b-2 transition flex items-center gap-1.5 ${
                tab === "fees"
                  ? "border-emerald-800 text-emerald-900"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Receipt className="w-4 h-4" /> Fee Ledger & Invoices ({student.invoices.length})
            </Link>
            <Link
              href={`/students/${student.id}?tab=docs`}
              className={`pb-3 border-b-2 transition flex items-center gap-1.5 ${
                tab === "docs"
                  ? "border-emerald-800 text-emerald-900"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <FolderOpen className="w-4 h-4" /> Document Locker ({student.documents.length})
            </Link>
          </div>

          {/* Tab 1: Overview */}
          {tab === "overview" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Personal Information */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-emerald-800" /> Demographics & Identity
                </h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block">Date of Birth:</span>
                    <strong className="text-slate-800">{formatDate(student.dob)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Gender:</span>
                    <strong className="text-slate-800">{student.gender}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Blood Group:</span>
                    <strong className="text-slate-800">{student.bloodGroup || "Not recorded"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Aadhaar Number:</span>
                    <strong className="text-slate-800 font-mono">{student.aadhaarNo || "Not provided"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Nationality:</span>
                    <strong className="text-slate-800">{student.nationality}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Category / Social:</span>
                    <strong className="text-slate-800">{student.category}</strong>
                  </div>
                </div>
              </div>

              {/* Address & Emergency Contact */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-800" /> Address & Emergency
                </h3>
                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-slate-400 block">Residential Address:</span>
                    <p className="text-slate-800 font-medium">{student.currentAddress || "Not specified"}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Emergency Phone:</span>
                    <p className="text-slate-800 font-mono font-bold flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-emerald-700" />
                      {student.emergencyContact || primaryGuardian?.phone || "N/A"}
                    </p>
                  </div>
                  {student.medicalNotes && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-900">
                      <div className="font-bold flex items-center gap-1 mb-0.5">
                        <Heart className="w-3.5 h-3.5 text-rose-600" /> Medical / Allergy Notes
                      </div>
                      <p>{student.medicalNotes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Academic Session & Inter-Branch Transfer History */}
              {student.promotionHistories && student.promotionHistories.length > 0 && (
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4 md:col-span-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-emerald-700" />
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                      Academic Session Journey & Branch Transfer History
                    </h3>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {student.promotionHistories.map((hist) => (
                      <div key={hist.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-xl">
                            {hist.fromSession} → {hist.toSession}
                          </span>
                          <div>
                            <span className="font-bold text-slate-900">
                              {hist.fromClassName} ({hist.fromCampus.code}) → {hist.toClassName} ({hist.toCampus.code})
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                              Processed by {hist.promotedBy || "Admin"} on {formatDate(hist.createdAt)}
                            </span>
                          </div>
                        </div>

                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                          hist.action === "BRANCH_TRANSFER" ? "bg-purple-100 text-purple-950 border border-purple-200" : "bg-emerald-100 text-emerald-950 border border-emerald-200"
                        }`}>
                          {hist.action === "BRANCH_TRANSFER" ? "Inter-Branch Campus Transfer" : hist.action}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Family & Guardians */}
          {tab === "family" && (
            <div className="space-y-6">
              {/* Sibling Linkage Card */}
              <SiblingLinkCard
                currentStudentId={student.id}
                familyId={student.familyId}
                initialSiblings={linkedSiblings}
              />

              {/* Guardians List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {student.guardians.map((g) => (
                  <div key={g.id} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                        {g.relation}
                      </span>
                      {g.isPrimary && (
                        <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-full border border-slate-200">
                          Primary Contact
                        </span>
                      )}
                    </div>
                    <h4 className="text-base font-bold text-slate-900">{g.name}</h4>
                    <div className="space-y-2 text-xs text-slate-600">
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-mono">{g.phone}</span>
                      </div>
                      {g.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{g.email}</span>
                        </div>
                      )}
                      {g.occupation && (
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{g.occupation} {g.organization ? `at ${g.organization}` : ""}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 3: Fee Ledger & Invoices */}
          {tab === "fees" && (
            <div className="space-y-6">
              {/* Fee Discount Approval & Setting Card */}
              <StudentDiscountCard
                studentId={student.id}
                studentName={`${student.firstName} ${student.lastName}`}
                isDiscountEligible={student.isDiscountEligible}
                discountPercent={student.discountPercent}
                discountAmount={student.discountAmount}
                discountApprovedBy={student.discountApprovedBy}
                discountReason={student.discountReason}
                isAdmin={permissions.isAdmin}
                canManageFees={permissions.modules.fees.canUpdate || permissions.isAdmin}
                totalGrossDemand={student.invoices.reduce((acc, inv) => acc + inv.grossAmount, 0)}
              />

              {/* Invoices List */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Fee Invoices & Payments History</h3>
                    <p className="text-xs text-slate-500">Breakdown of quarterly demands, concessions, and collected receipts.</p>
                  </div>
                </div>

                <div className="divide-y divide-slate-100">
                  {student.invoices.map((inv) => (
                    <div key={inv.id} className="p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-900">{inv.invoiceNo}</span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                inv.status === "PAID"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : inv.status === "OVERDUE"
                                  ? "bg-rose-100 text-rose-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {inv.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-0.5 font-medium">{inv.periodName} • Due: {formatDate(inv.dueDate)}</p>
                        </div>

                        <div className="text-right flex items-center gap-4">
                          <div>
                            <span className="text-[11px] text-slate-400 block">Total Demand</span>
                            <strong className="text-xs text-slate-800">{formatCurrency(inv.netAmount)}</strong>
                          </div>
                          <div>
                            <span className="text-[11px] text-slate-400 block">Balance Due</span>
                            <strong className={`text-xs ${inv.balanceAmount > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                              {formatCurrency(inv.balanceAmount)}
                            </strong>
                          </div>
                          {inv.balanceAmount > 0 && (permissions.modules.fees.canUpdate || permissions.isAdmin) && (
                            <RecordPaymentModal
                              invoiceId={inv.id}
                              invoiceNo={inv.invoiceNo}
                              studentName={`${student.firstName} ${student.lastName}`}
                              balanceAmount={inv.balanceAmount}
                              buttonSize="sm"
                            />
                          )}
                        </div>
                      </div>

                      {/* Invoice Item Breakdown */}
                      <div className="bg-slate-50 p-2.5 rounded-lg text-[11px] grid grid-cols-2 sm:grid-cols-4 gap-2 border border-slate-100">
                        {inv.items.map((item) => (
                          <div key={item.id}>
                            <span className="text-slate-500 block">{item.feeHead.name}:</span>
                            <span className="font-semibold text-slate-800">{formatCurrency(item.amount)}</span>
                          </div>
                        ))}
                        {inv.discountAmount > 0 && (
                          <div>
                            <span className="text-emerald-700 block">Discount Applied:</span>
                            <span className="font-semibold text-emerald-800">-{formatCurrency(inv.discountAmount)}</span>
                          </div>
                        )}
                      </div>

                      {/* Payments against this invoice */}
                      {inv.payments.length > 0 && (
                        <div className="pl-3 border-l-2 border-emerald-500 space-y-1 text-xs">
                          {inv.payments.map((p) => (
                            <div key={p.id} className="flex items-center justify-between text-slate-600">
                              <span className="flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                Receipt <strong>{p.receiptNo}</strong> ({p.paymentMode}) on {formatDate(p.paymentDate)}
                              </span>
                              <span className="font-bold text-emerald-700">{formatCurrency(p.amountPaid)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Document Locker */}
          {tab === "docs" && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <DocumentUploadSection
                studentId={student.id}
                documents={student.documents}
              />
            </div>
          )}
        </main>
  );
}
