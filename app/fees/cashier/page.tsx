import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { getCurrentUser, getUserPermissions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Coins, CheckCircle, Printer, Download, CreditCard, Banknote, QrCode } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DailyCashierRegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ campus?: string }>;
}) {
  const { campus: campusId } = await searchParams;
  const user = await getCurrentUser();
  const permissions = await getUserPermissions(user);

  if (!permissions.modules.fees.canView && !permissions.isAdmin) {
    redirect("/?error=unauthorized_fees");
  }

  const campuses = await prisma.campus.findMany({ orderBy: { name: "asc" } });

  const payments = await prisma.feePayment.findMany({
    where: campusId && campusId !== "ALL" ? { invoice: { campusId } } : {},
    include: {
      student: { include: { campus: true, class: true } },
      invoice: true,
    },
    orderBy: { paymentDate: "desc" },
  });

  const totalCollected = payments.reduce((acc, p) => acc + p.amountPaid, 0);

  const cashTotal = payments
    .filter((p) => p.paymentMode === "CASH")
    .reduce((acc, p) => acc + p.amountPaid, 0);

  const upiTotal = payments
    .filter((p) => p.paymentMode === "ONLINE_UPI")
    .reduce((acc, p) => acc + p.amountPaid, 0);

  const posTotal = payments
    .filter((p) => p.paymentMode === "POS_CARD")
    .reduce((acc, p) => acc + p.amountPaid, 0);

  const chequeTotal = payments
    .filter((p) => p.paymentMode === "CHEQUE" || p.paymentMode === "NEFT_RTGS")
    .reduce((acc, p) => acc + p.amountPaid, 0);

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
                <Coins className="w-5 h-5 text-emerald-800" />
                <h1 className="text-xl font-black text-slate-900">
                  Daily Cashier Reconciliation Register
                </h1>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Day-end counter settlement grouped by tender mode for accounts reconciliation.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-xs">
                Total Settlements: {formatCurrency(totalCollected)}
              </span>
            </div>
          </div>

          {/* Tender Mode Breakdown Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase block">💵 Cash in Vault</span>
                <span className="text-lg font-black text-slate-900 mt-0.5 block">{formatCurrency(cashTotal)}</span>
              </div>
              <Banknote className="w-8 h-8 text-emerald-600 bg-emerald-50 p-1.5 rounded-lg" />
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase block">📱 UPI / QR Gateway</span>
                <span className="text-lg font-black text-slate-900 mt-0.5 block">{formatCurrency(upiTotal)}</span>
              </div>
              <QrCode className="w-8 h-8 text-teal-600 bg-teal-50 p-1.5 rounded-lg" />
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase block">💳 POS Card Swipe</span>
                <span className="text-lg font-black text-slate-900 mt-0.5 block">{formatCurrency(posTotal)}</span>
              </div>
              <CreditCard className="w-8 h-8 text-blue-600 bg-blue-50 p-1.5 rounded-lg" />
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase block">🏦 Cheque & RTGS</span>
                <span className="text-lg font-black text-slate-900 mt-0.5 block">{formatCurrency(chequeTotal)}</span>
              </div>
              <Coins className="w-8 h-8 text-purple-600 bg-purple-50 p-1.5 rounded-lg" />
            </div>
          </div>

          {/* Cashier Payment Transactions Register Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">
                Collection Transactions Log ({payments.length})
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Receipt No</th>
                    <th className="py-3 px-4">Student & Scholar No</th>
                    <th className="py-3 px-4">Campus</th>
                    <th className="py-3 px-4">Mode / Ref</th>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Cashier</th>
                    <th className="py-3 px-4 text-right">Amount Collected</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{p.receiptNo}</td>
                      <td className="py-3 px-4">
                        <Link
                          href={`/students/${p.studentId}`}
                          className="font-bold text-slate-900 hover:text-emerald-800"
                        >
                          {p.student.firstName} {p.student.lastName}
                        </Link>
                        <span className="block text-[11px] text-slate-400">{p.student.scholarNo}</span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700">{p.student.campus.name}</td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-800 block">{p.paymentMode}</span>
                        <span className="text-[10px] font-mono text-slate-400">{p.transactionRef || "-"}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-500">{formatDateTime(p.paymentDate)}</td>
                      <td className="py-3 px-4 text-slate-600 font-medium">{p.cashierName}</td>
                      <td className="py-3 px-4 text-right font-mono font-black text-emerald-800 text-sm">
                        {formatCurrency(p.amountPaid)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
