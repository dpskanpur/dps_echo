import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";
import { collectFeePayment } from "@/lib/actions";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getCurrentUser, getUserPermissions } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  CreditCard,
  Search,
  Receipt,
  User,
  CheckCircle,
  Building2,
  Printer,
  Sparkles,
  Coins,
  Lock,
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function FeeCollectionDeskPage({
  searchParams,
}: {
  searchParams: Promise<{ campus?: string; studentId?: string; q?: string }>;
}) {
  const { campus: campusId, studentId, q } = await searchParams;
  const user = await getCurrentUser();
  const permissions = await getUserPermissions(user);

  if (!permissions.modules.fees.canView && !permissions.isAdmin) {
    redirect("/?error=unauthorized_fees");
  }

  const campuses = await prisma.campus.findMany({ orderBy: { name: "asc" } });

  // Selected Student
  const selectedStudent = studentId
    ? await prisma.student.findUnique({
        where: { id: studentId },
        include: {
          campus: true,
          class: true,
          section: true,
          guardians: true,
          invoices: {
            where: { status: { in: ["PENDING", "PARTIALLY_PAID", "OVERDUE"] } },
            include: { items: { include: { feeHead: true } } },
            orderBy: { dueDate: "asc" },
          },
        },
      })
    : null;

  // Search Results for Student Picker
  const searchResults = q
    ? await prisma.student.findMany({
        where: {
          status: "ACTIVE",
          OR: [
            { firstName: { contains: q } },
            { lastName: { contains: q } },
            { scholarNo: { contains: q } },
            { admissionNo: { contains: q } },
          ],
        },
        include: { campus: true, class: true, section: true },
        take: 8,
      })
    : [];

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar userEmail={user?.email} userRole={user?.role} permissions={permissions} />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar campuses={campuses} selectedCampusId={campusId} user={user || undefined} permissions={permissions} />

        <main className="p-8 space-y-6 flex-1 overflow-y-auto max-w-5xl mx-auto w-full">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-800" />
                <h1 className="text-xl font-black text-slate-900">
                  Fee Collection Desk (POS Counter)
                </h1>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Fast-entry cashier portal for collecting student quarterly dues, concessions, and instant 3-part receipt printing.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-emerald-800 font-bold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
              <Coins className="w-4 h-4" /> Live Cashier Terminal
            </div>
          </div>

          {/* Student Search Box */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              1. Search & Select Student
            </h2>
            <form method="GET" className="relative flex gap-2">
              {campusId && <input type="hidden" name="campus" value={campusId} />}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  name="q"
                  defaultValue={q || ""}
                  placeholder="Type Scholar Number (e.g. DPS-AZD-2018-0245) or Student Name..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>
              <button
                type="submit"
                className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-5 py-2.5 rounded-lg transition"
              >
                Find
              </button>
            </form>

            {/* Search Dropdown Results */}
            {searchResults.length > 0 && (
              <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 bg-white max-h-48 overflow-y-auto">
                {searchResults.map((s) => (
                  <Link
                    key={s.id}
                    href={`/fees/collect?studentId=${s.id}`}
                    className="p-3 flex items-center justify-between hover:bg-emerald-50/60 transition text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-900">
                        {s.firstName} {s.lastName}
                      </span>{" "}
                      <span className="font-mono text-slate-500">({s.scholarNo})</span>
                      <p className="text-[11px] text-slate-400">
                        {s.class.name} • {s.campus.name}
                      </p>
                    </div>
                    <span className="bg-emerald-800 text-white font-bold px-2.5 py-1 rounded text-[11px]">
                      Select Student →
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Selected Student & Outstanding Invoices */}
          {selectedStudent ? (
            <div className="space-y-6">
              {/* Student Summary Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-900 font-bold text-lg flex items-center justify-center">
                    {selectedStudent.firstName[0]}
                    {selectedStudent.lastName[0]}
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900">
                      {selectedStudent.firstName} {selectedStudent.lastName}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Scholar No: <strong className="font-mono text-slate-800">{selectedStudent.scholarNo}</strong> • {selectedStudent.class.name} {selectedStudent.section ? `(${selectedStudent.section.name})` : ""} • {selectedStudent.campus.name}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] font-bold text-slate-400 block uppercase">
                    Pending Invoices
                  </span>
                  <span className="text-lg font-black text-amber-700">
                    {selectedStudent.invoices.length} Due
                  </span>
                </div>
              </div>

              {/* Invoices List for Payment */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  2. Select Invoice & Record Counter Collection
                </h3>

                {selectedStudent.invoices.length === 0 ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center text-emerald-900 text-xs font-bold">
                    ✓ All fees are currently cleared! No outstanding invoices for this student.
                  </div>
                ) : (
                  selectedStudent.invoices.map((inv) => (
                    <div
                      key={inv.id}
                      className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-900">
                              {inv.invoiceNo}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                              {inv.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 font-semibold mt-0.5">
                            {inv.periodName} • Due Date: {formatDate(inv.dueDate)}
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="text-xs text-slate-500 block">Balance Payable:</span>
                          <span className="text-xl font-black text-emerald-700">
                            {formatCurrency(inv.balanceAmount)}
                          </span>
                        </div>
                      </div>

                      {/* Head Breakdown */}
                      <div className="bg-slate-50 p-3 rounded-lg text-xs grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {inv.items.map((item) => (
                          <div key={item.id}>
                            <span className="text-slate-400 block">{item.feeHead.name}:</span>
                            <span className="font-bold text-slate-800">{formatCurrency(item.amount)}</span>
                          </div>
                        ))}
                        {inv.discountAmount > 0 && (
                          <div>
                            <span className="text-emerald-700 block">Concession:</span>
                            <span className="font-bold text-emerald-800">-{formatCurrency(inv.discountAmount)}</span>
                          </div>
                        )}
                      </div>

                      {/* Payment Submission Form */}
                      <form action={collectFeePayment} className="pt-2 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                        <input type="hidden" name="invoiceId" value={inv.id} />

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Payment Mode *
                          </label>
                          <select
                            name="paymentMode"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                          >
                            <option value="CASH">💵 Cash at Desk</option>
                            <option value="ONLINE_UPI">📱 UPI / QR Scan</option>
                            <option value="POS_CARD">💳 POS Card Swipe</option>
                            <option value="CHEQUE">🏦 Cheque / DD</option>
                            <option value="NEFT_RTGS">🌐 NEFT / RTGS</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Amount Paying (₹) *
                          </label>
                          <input
                            type="number"
                            name="amountPaid"
                            defaultValue={inv.balanceAmount}
                            step="any"
                            required
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Ref / Cheque / Txn No
                          </label>
                          <input
                            type="text"
                            name="transactionRef"
                            placeholder="e.g. CASH-01 or UTR#992"
                            defaultValue="CASH-DESK"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                          />
                        </div>

                        <div>
                          <button
                            type="submit"
                            className="w-full bg-emerald-800 hover:bg-emerald-900 text-white font-bold py-2 px-4 rounded-lg text-xs transition shadow-sm flex items-center justify-center gap-1.5"
                          >
                            <Receipt className="w-4 h-4" /> Collect & Print Receipt
                          </button>
                        </div>
                      </form>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-xs space-y-2">
              <CreditCard className="w-8 h-8 mx-auto text-slate-300" />
              <p>Search for a student above to view active invoices and record fee collections.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
