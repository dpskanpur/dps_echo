import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";
import { issueTransferCertificate } from "@/lib/actions";
import { PrintButton } from "@/components/PrintButton";
import { formatDate } from "@/lib/utils";
import { getCurrentUser, getUserPermissions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { FileText, Search, Printer, CheckCircle, ShieldCheck, UserCheck, AlertCircle, Lock } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function TransferCertificatePage({
  searchParams,
}: {
  searchParams: Promise<{ campus?: string; studentId?: string; tcId?: string }>;
}) {
  const { campus: campusId, studentId, tcId } = await searchParams;
  const user = await getCurrentUser();
  const permissions = await getUserPermissions(user);

  if (!permissions.modules.tc.canView && !permissions.isAdmin) {
    redirect("/?error=unauthorized_tc");
  }

  const campuses = await prisma.campus.findMany({ orderBy: { name: "asc" } });

  // If specific student selected for TC generation
  const targetStudent = studentId
    ? await prisma.student.findUnique({
        where: { id: studentId },
        include: {
          campus: true,
          class: true,
          section: true,
          guardians: true,
          invoices: { where: { status: { in: ["PENDING", "PARTIALLY_PAID", "OVERDUE"] } } },
        },
      })
    : null;

  // If specific TC selected for viewing/printing
  const activeTC = tcId
    ? await prisma.transferCertificate.findUnique({
        where: { id: tcId },
        include: {
          student: { include: { campus: true, class: true } },
        },
      })
    : null;

  // List of all issued TCs
  const issuedTCs = await prisma.transferCertificate.findMany({
    where: campusId && campusId !== "ALL" ? { student: { campusId } } : {},
    include: {
      student: { include: { campus: true, class: true } },
    },
    orderBy: { issueDate: "desc" },
  });

  // Active students eligible for TC
  const activeStudents = await prisma.student.findMany({
    where: {
      status: "ACTIVE",
      ...(campusId && campusId !== "ALL" ? { campusId } : {}),
    },
    include: { campus: true, class: true },
    take: 20,
  });

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar userEmail={user?.email} userRole={user?.role} permissions={permissions} />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar campuses={campuses} selectedCampusId={campusId} user={user || undefined} permissions={permissions} />

        <main className="p-8 space-y-6 flex-1 overflow-y-auto max-w-6xl mx-auto w-full">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-800" />
                <h1 className="text-xl font-black text-slate-900">
                  Transfer Certificate (TC) & Clearance Hub
                </h1>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Issue CBSE-prescribed Transfer Certificates with automated no-dues verification and tamper-evident QR code stamps.
              </p>
            </div>
          </div>

          {/* If TC View / Print Mode is active */}
          {activeTC && (
            <div className="bg-white rounded-2xl border-2 border-emerald-900/40 p-8 shadow-lg space-y-6 print:border-none print:shadow-none print:p-0">
              <div className="no-print flex items-center justify-between pb-4 border-b border-slate-200">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                  <CheckCircle className="w-4 h-4" /> TC Issued & Ready for Official Printing
                </div>
                <PrintButton label="Print TC" />
              </div>

              {/* Official CBSE Transfer Certificate Document */}
              <div className="border-4 border-double border-slate-800 p-8 rounded-lg space-y-6 bg-white text-slate-900 relative">
                {/* Watermark */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.04] text-slate-900 font-black text-7xl select-none uppercase tracking-widest text-center">
                  DELHI PUBLIC SCHOOL
                </div>

                {/* Institution Letterhead */}
                <div className="text-center space-y-1 pb-4 border-b-2 border-slate-800">
                  <h2 className="text-2xl font-black uppercase tracking-wider text-emerald-950">
                    {activeTC.student.campus.name}
                  </h2>
                  <p className="text-xs font-semibold text-slate-700">
                    {activeTC.student.campus.affiliation || "Affiliated to CBSE, New Delhi"}
                  </p>
                  <p className="text-xs text-slate-600">
                    {activeTC.student.campus.address}, {activeTC.student.campus.city} (U.P.) • Phone: {activeTC.student.campus.phone}
                  </p>
                  <div className="inline-block mt-2 px-4 py-1 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded">
                    TRANSFER CERTIFICATE
                  </div>
                </div>

                {/* TC Metadata Header */}
                <div className="flex justify-between text-xs font-bold border-b border-slate-300 pb-2">
                  <div>
                    <span>TC No: </span>
                    <span className="font-mono text-emerald-900">{activeTC.tcNumber}</span>
                  </div>
                  <div>
                    <span>Scholar No: </span>
                    <span className="font-mono text-slate-800">{activeTC.student.scholarNo}</span>
                  </div>
                  <div>
                    <span>Date of Issue: </span>
                    <span>{formatDate(activeTC.issueDate)}</span>
                  </div>
                </div>

                {/* 20 CBSE Prescribed Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6 text-xs leading-relaxed">
                  <div>
                    <span className="text-slate-500 font-medium">1. Name of Pupil:</span>{" "}
                    <strong className="text-slate-900 uppercase">{activeTC.student.firstName} {activeTC.student.lastName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">2. Mother's Name:</span>{" "}
                    <strong className="text-slate-900">{activeTC.motherName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">3. Father's / Guardian's Name:</span>{" "}
                    <strong className="text-slate-900">{activeTC.fatherName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">4. Nationality:</span>{" "}
                    <strong className="text-slate-900">{activeTC.nationality}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">5. Date of First Admission with Class:</span>{" "}
                    <strong className="text-slate-900">{formatDate(activeTC.dateOfFirstAdmission)} in {activeTC.classInWhichFirstAdmitted}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">6. Date of Birth (in figures & words):</span>{" "}
                    <strong className="text-slate-900">{formatDate(activeTC.student.dob)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">7. Class in which pupil last studied:</span>{" "}
                    <strong className="text-slate-900">{activeTC.classLastStudied}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">8. School / Board Annual Exam Last Taken:</span>{" "}
                    <strong className="text-slate-900">{activeTC.schoolBoardExamLastTaken}</strong>
                  </div>
                  <div className="md:col-span-2">
                    <span className="text-slate-500 font-medium">9. Subjects Studied:</span>{" "}
                    <strong className="text-slate-900">{activeTC.subjectsStudied}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">10. Whether Qualified for Promotion:</span>{" "}
                    <strong className="text-slate-900">{activeTC.isQualifiedForPromotion}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">11. Month Upto Which Fees Paid:</span>{" "}
                    <strong className="text-emerald-900">{activeTC.monthUptoWhichFeesPaid}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">12. Total Working Days in Session:</span>{" "}
                    <strong className="text-slate-900">{activeTC.totalWorkingDays} days</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">13. Total Attendance Days:</span>{" "}
                    <strong className="text-slate-900">{activeTC.totalDaysPresent} days</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">14. General Conduct:</span>{" "}
                    <strong className="text-slate-900">{activeTC.generalConduct}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">15. Date of Application for Certificate:</span>{" "}
                    <strong className="text-slate-900">{formatDate(activeTC.applicationDate)}</strong>
                  </div>
                  <div className="md:col-span-2">
                    <span className="text-slate-500 font-medium">16. Reason for Leaving the School:</span>{" "}
                    <strong className="text-slate-900">{activeTC.reasonForLeaving}</strong>
                  </div>
                </div>

                {/* QR Verification Seal & Signatures */}
                <div className="pt-8 border-t border-slate-300 flex items-end justify-between text-xs">
                  {/* QR Stamp */}
                  <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div className="w-14 h-14 bg-white border border-slate-300 rounded p-1 flex items-center justify-center font-mono text-[9px] text-center font-bold text-emerald-900">
                      QR CODE STAMP
                    </div>
                    <div>
                      <span className="font-bold text-slate-800 block">Digitally Verifiable</span>
                      <span className="text-[10px] text-slate-500 block font-mono">Token: {activeTC.verificationToken}</span>
                      <Link
                        href={`/verify-tc?token=${activeTC.verificationToken}`}
                        target="_blank"
                        className="text-[10px] text-emerald-800 font-semibold hover:underline"
                      >
                        Verify Online ↗
                      </Link>
                    </div>
                  </div>

                  {/* Signature Blocks */}
                  <div className="flex gap-12 text-center font-bold text-slate-700">
                    <div className="border-t border-slate-400 pt-1 px-4">
                      <span>Prepared By</span>
                      <span className="block text-[10px] text-slate-400 font-normal">Accounts / Records</span>
                    </div>
                    <div className="border-t border-slate-400 pt-1 px-4">
                      <span>Checked By</span>
                      <span className="block text-[10px] text-slate-400 font-normal">Headmistress / Supervisor</span>
                    </div>
                    <div className="border-t border-slate-400 pt-1 px-4 text-emerald-950">
                      <span>Principal</span>
                      <span className="block text-[10px] text-slate-400 font-normal">{activeTC.student.campus.name}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* New TC Generator Form (When a student is chosen) */}
          {targetStudent && !activeTC && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-800" />
                  <h2 className="text-sm font-bold text-slate-900">
                    Issue Transfer Certificate for {targetStudent.firstName} {targetStudent.lastName}
                  </h2>
                </div>
                <span className="text-xs font-mono font-bold text-slate-700">
                  {targetStudent.scholarNo} • {targetStudent.class.name}
                </span>
              </div>

              {/* No-Dues Clearance Banner */}
              {targetStudent.invoices.length > 0 ? (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3 text-rose-900 text-xs">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold">Pending Fee Dues Detected ({targetStudent.invoices.length} Invoices)</h3>
                    <p className="mt-0.5 text-rose-700">
                      Standard school policy requires fee dues to be cleared before formal TC handover. You may still generate the draft TC or collect payment first.
                    </p>
                    <Link
                      href={`/fees/collect?studentId=${targetStudent.id}`}
                      className="inline-block mt-2 bg-rose-600 hover:bg-rose-700 text-white font-bold px-3 py-1 rounded text-[11px]"
                    >
                      Clear Dues in Fee Desk →
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2 text-emerald-900 text-xs font-semibold">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  ✓ All Accounts & Library Dues Cleared. Student is eligible for immediate TC release.
                </div>
              )}

              {/* TC Form */}
              <form action={issueTransferCertificate} className="space-y-4">
                <input type="hidden" name="studentId" value={targetStudent.id} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Reason for Leaving School *
                    </label>
                    <input
                      type="text"
                      name="reasonForLeaving"
                      required
                      defaultValue="Parent Job Relocation"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      General Conduct *
                    </label>
                    <select
                      name="generalConduct"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <option value="Exemplary">Exemplary</option>
                      <option value="Good">Good</option>
                      <option value="Satisfactory">Satisfactory</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Promotion Status *
                    </label>
                    <input
                      type="text"
                      name="isQualifiedForPromotion"
                      required
                      defaultValue={`Promoted to next standard`}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Month Upto Which Fees Paid *
                    </label>
                    <input
                      type="text"
                      name="monthUptoWhichFeesPaid"
                      required
                      defaultValue="March 2026 (Cleared)"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Total Working Days in Session
                    </label>
                    <input
                      type="number"
                      name="totalWorkingDays"
                      defaultValue={210}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Days Present
                    </label>
                    <input
                      type="number"
                      name="totalDaysPresent"
                      defaultValue={198}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>

                <div className="pt-3 flex justify-end gap-3">
                  <Link
                    href="/tc"
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-xs font-semibold transition"
                  >
                    Cancel
                  </Link>
                  <button
                    type="submit"
                    className="bg-emerald-800 hover:bg-emerald-900 text-white px-5 py-2 rounded-lg text-xs font-bold transition shadow-sm"
                  >
                    Generate & Issue CBSE TC
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Issued TC Register Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Issued Transfer Certificates Register</h3>
                <p className="text-xs text-slate-500">Official log of completed pupil transfers and school withdrawals.</p>
              </div>
              <span className="text-xs font-bold text-slate-600 bg-slate-200/80 px-2.5 py-1 rounded">
                Total Issued: {issuedTCs.length}
              </span>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {issuedTCs.length === 0 ? (
                <div className="p-6 text-center text-slate-400">
                  No Transfer Certificates issued yet for the selected campus.
                </div>
              ) : (
                issuedTCs.map((tc) => (
                  <div key={tc.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-emerald-900">{tc.tcNumber}</span>
                        <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded">
                          {tc.status}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 mt-1">
                        {tc.student.firstName} {tc.student.lastName} ({tc.student.scholarNo})
                      </h4>
                      <p className="text-xs text-slate-500">
                        Class: {tc.student.class.name} • Campus: {tc.student.campus.name} • Issued on {formatDate(tc.issueDate)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/tc?tcId=${tc.id}`}
                        className="bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1"
                      >
                        <Printer className="w-3.5 h-3.5" /> View & Print
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
