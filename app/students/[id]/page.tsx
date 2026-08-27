import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";
import { getCurrentUser, getUserPermissions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { formatDate, formatCurrency } from "@/lib/utils";
import {
  User,
  CreditCard,
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
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function StudentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab = "overview" } = await searchParams;

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
      class: true,
      section: true,
      guardians: true,
      documents: true,
      transferCertificate: true,
      discounts: true,
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

  const primaryGuardian = student.guardians.find((g) => g.isPrimary) || student.guardians[0];
  const totalInvoiced = student.invoices.reduce((acc, inv) => acc + inv.netAmount, 0);
  const totalPaid = student.invoices.reduce((acc, inv) => acc + inv.paidAmount, 0);
  const totalBalance = student.invoices.reduce((acc, inv) => acc + inv.balanceAmount, 0);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar userEmail={user?.email} userRole={user?.role} permissions={permissions} />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar campuses={campuses} selectedCampusId={student.campusId} user={user || undefined} permissions={permissions} />

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
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-800 to-teal-600 text-white font-black text-2xl flex items-center justify-center shadow-md shrink-0">
                  {student.firstName[0]}
                  {student.lastName[0]}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-black text-slate-900">
                      {student.firstName} {student.lastName}
                    </h1>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        student.status === "ACTIVE"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : student.status === "TC_ISSUED"
                          ? "bg-purple-100 text-purple-800 border border-purple-200"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {student.status}
                    </span>
                    {student.house && (
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-semibold">
                        House: {student.house}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-y-1 gap-x-4 mt-2 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <span className="font-mono font-bold text-slate-800">
                        {student.scholarNo}
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
                      Admitted: {formatDate(student.admissionDate)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {student.status === "ACTIVE" && (
                  <>
                    <Link
                      href={`/fees/collect?studentId=${student.id}`}
                      className="inline-flex items-center gap-1.5 bg-emerald-800 hover:bg-emerald-900 text-white px-3.5 py-2 rounded-lg text-xs font-bold transition shadow-xs"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      Collect Fee Desk
                    </Link>
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
            </div>
          )}

          {/* Tab 2: Family & Guardians */}
          {tab === "family" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {student.guardians.map((g) => (
                <div key={g.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded">
                      {g.relation}
                    </span>
                    {g.isPrimary && (
                      <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded">
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
          )}

          {/* Tab 3: Fee Ledger & Invoices */}
          {tab === "fees" && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Fee Invoices & Payments History</h3>
                  <p className="text-xs text-slate-500">Breakdown of quarterly demands, concessions, and collected receipts.</p>
                </div>
                <Link
                  href={`/fees/collect?studentId=${student.id}`}
                  className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg transition"
                >
                  + Record Payment
                </Link>
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
          )}

          {/* Tab 4: Document Locker */}
          {tab === "docs" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {student.documents.map((doc) => (
                <div key={doc.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <FolderOpen className="w-5 h-5 text-emerald-800" />
                    <span className="text-[10px] font-mono text-slate-400">{doc.fileSize || "PDF"}</span>
                  </div>
                  <h4 className="font-bold text-xs text-slate-900">{doc.title}</h4>
                  <p className="text-[11px] text-slate-500 truncate">{doc.fileName}</p>
                  <div className="pt-2 flex items-center justify-between text-xs">
                    <span className="text-slate-400">{formatDate(doc.uploadedAt)}</span>
                    <span className="text-emerald-800 font-semibold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> Verified
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
