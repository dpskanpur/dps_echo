import { prisma } from "@/lib/prisma";
import { CheckCircle2, FileText, Printer, ArrowRight, ShieldCheck, Clock } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PublicRegistrationSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; registrationNo?: string }>;
}) {
  const { id } = await searchParams;

  if (!id) {
    notFound();
  }

  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      campus: true,
      class: true,
      guardians: true,
    },
  });

  if (!student) {
    notFound();
  }

  const father = student.guardians.find((g) => g.relation === "FATHER");
  const mother = student.guardians.find((g) => g.relation === "MOTHER");

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Top Bar */}
      <header className="bg-emerald-900 text-white shadow-md py-4 px-6 border-b border-emerald-800">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/dps_crest.png" alt="DPS Crest" width={40} height={40} className="object-contain" />
            <div>
              <h1 className="text-sm sm:text-base font-black text-amber-300 uppercase tracking-tight">
                Delhi Public School Kanpur
              </h1>
              <p className="text-[11px] text-emerald-200">Online Applicant Registration Acknowledgement</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 flex-1 w-full space-y-6">
        {/* Success Card Header */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-lg text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-1">
            <span className="text-xs font-extrabold text-emerald-700 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Online Payment & Registration Successful
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 pt-2">
              Registration Received!
            </h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Your online application and fee payment have been recorded. Your application is currently under status: <strong className="text-amber-600">REGISTERED (Pending Admin Confirmation)</strong>.
            </p>
          </div>

          {/* Registration ID Banner */}
          <div className="bg-emerald-900 text-white rounded-2xl p-4 max-w-lg mx-auto shadow-md space-y-1">
            <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">Official Registration ID</span>
            <p className="text-2xl sm:text-3xl font-mono font-black text-amber-300 tracking-wider">
              {student.registrationNo}
            </p>
          </div>
        </div>

        {/* Receipt Details Box */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-md space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-800" />
              <h3 className="text-sm font-bold text-slate-900 uppercase">Acknowledgement Receipt Summary</h3>
            </div>
            <span className="text-xs font-mono font-bold text-slate-500">
              Date: {new Date(student.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 bg-slate-50 rounded-xl space-y-1">
              <span className="text-slate-400 font-bold">Applicant Student:</span>
              <p className="font-bold text-slate-900 text-sm">
                {student.firstName} {student.middleName ? `${student.middleName} ` : ""}{student.lastName}
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl space-y-1">
              <span className="text-slate-400 font-bold">Seeking Admission Class & Campus:</span>
              <p className="font-bold text-slate-900 text-sm">
                {student.class.name} — {student.campus.name}
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl space-y-1">
              <span className="text-slate-400 font-bold">Father's Name:</span>
              <p className="font-bold text-slate-900">{father?.name || "N/A"}</p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl space-y-1">
              <span className="text-slate-400 font-bold">Contact Mobile:</span>
              <p className="font-bold text-slate-900">{student.studentMobile || father?.phone || "N/A"}</p>
            </div>

            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
              <span className="text-emerald-800 font-bold">Registration Fee Paid:</span>
              <p className="font-black text-emerald-950 text-base">₹{student.registrationFeePaid.toLocaleString("en-IN")}</p>
            </div>

            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
              <span className="text-emerald-800 font-bold">Payment Mode & Txn ID:</span>
              <p className="font-bold text-emerald-950">{student.registrationPaymentMode} ({student.registrationPaymentTxnId})</p>
            </div>
          </div>

          {/* Pending Admin Approval Banner */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-xs text-amber-900">
            <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold block text-amber-950">Next Step: School Admin Review</strong>
              <p className="mt-0.5 leading-relaxed">
                The school admissions team will review your application. Upon admin confirmation, you will be invited to complete formal admission formalities and receive your official Admission Scholar ID (`DPS-{student.campus.code}-2026-XXXX`).
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link
            href="/public-registration"
            className="text-xs font-bold text-slate-600 hover:text-slate-900"
          >
            ← Submit Another Registration
          </Link>
        </div>
      </main>
    </div>
  );
}
