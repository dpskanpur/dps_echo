import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import { collectFeePayment } from "@/lib/actions";
import {
  CreditCard,
  Building2,
  CheckCircle2,
  ShieldCheck,
  Search,
  Receipt,
  QrCode,
  Lock,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PublicQuickPayPage({
  searchParams,
}: {
  searchParams: Promise<{ scholarNo?: string; dob?: string; success?: string }>;
}) {
  const { scholarNo, dob, success } = await searchParams;

  let student: any = null;
  let searchError = "";

  if (scholarNo && dob) {
    const sDob = new Date(dob);
    const cleanScholar = scholarNo.trim().toUpperCase();

    const matched = await prisma.student.findFirst({
      where: {
        scholarNo: {
          contains: cleanScholar,
        },
      },
      include: {
        campus: true,
        class: true,
        section: true,
        guardians: true,
        invoices: {
          where: { status: { in: ["PENDING", "PARTIALLY_PAID", "OVERDUE"] } },
          include: {
            items: { include: { feeHead: true } },
          },
          orderBy: { dueDate: "asc" },
        },
      },
    });

    if (matched) {
      const matchYear = matched.dob.getUTCFullYear();
      const matchMonth = matched.dob.getUTCMonth();
      const matchDay = matched.dob.getUTCDate();

      const inputYear = sDob.getUTCFullYear();
      const inputMonth = sDob.getUTCMonth();
      const inputDay = sDob.getUTCDate();

      if (matchYear === inputYear && matchMonth === inputMonth && matchDay === inputDay) {
        student = matched;
      } else {
        searchError = "Date of Birth does not match school records for this Scholar Number.";
      }
    } else {
      searchError = "No student found with the provided Scholar Number.";
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between">
      {/* Public Header */}
      <header className="bg-emerald-950 text-white py-4 px-6 border-b border-emerald-900 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-300 flex items-center justify-center font-bold text-slate-950 text-sm shadow">
              DE
            </div>
            <div>
              <h1 className="text-sm font-black tracking-wide">DPS Kanpur</h1>
              <p className="text-[11px] text-emerald-300 font-medium">Official Quick Pay Parent Gateway</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-emerald-200">
            <Lock className="w-3.5 h-3.5 text-emerald-400" /> 256-Bit SSL Encrypted
          </div>
        </div>
      </header>

      {/* Main Form & Invoices Container */}
      <main className="max-w-4xl mx-auto w-full p-4 sm:p-6 space-y-6 my-auto">
        {/* Banner */}
        <div className="text-center space-y-1">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">
            Online Fee Payment Portal
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Pay student quarterly tuition & school dues instantly with UPI, Net Banking, or Debit/Credit card. No login required.
          </p>
        </div>

        {/* Search / Lookup Box */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm max-w-xl mx-auto">
          <form method="GET" className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Student Scholar Number / Admission Number *
              </label>
              <input
                type="text"
                name="scholarNo"
                required
                defaultValue={scholarNo || ""}
                placeholder="e.g. DPS-AZD-2018-0245 or AZD/2018/245"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Student Date of Birth (for verification) *
              </label>
              <input
                type="date"
                name="dob"
                required
                defaultValue={dob || ""}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>

            {searchError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 font-medium">
                {searchError}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-emerald-800 hover:bg-emerald-900 text-white font-bold py-2.5 px-4 rounded-lg text-xs transition shadow-sm flex items-center justify-center gap-2"
            >
              <Search className="w-4 h-4" /> Fetch Outstanding Dues
            </button>
          </form>
        </div>

        {/* Found Student Dues */}
        {student && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6 max-w-2xl mx-auto">
            {/* Student Dossier Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {student.firstName} {student.lastName}
                </h3>
                <p className="text-xs text-slate-500">
                  {student.scholarNo} • {student.class.name} • {student.campus.name}
                </p>
              </div>
              <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full">
                Verified Student
              </span>
            </div>

            {/* Invoices List */}
            {student.invoices.length === 0 ? (
              <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-1">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <h4 className="font-bold text-emerald-950 text-sm">All Fees are Paid!</h4>
                <p className="text-xs text-emerald-800">
                  There are no pending invoices for {student.firstName}. Thank you!
                </p>
              </div>
            ) : (
              student.invoices.map((inv: any) => (
                <div
                  key={inv.id}
                  className="bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono text-xs font-bold text-slate-900 block">{inv.invoiceNo}</span>
                      <span className="text-xs font-semibold text-slate-600">{inv.periodName}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-400 block">Payable Amount</span>
                      <span className="text-xl font-black text-emerald-800">
                        {formatCurrency(inv.balanceAmount)}
                      </span>
                    </div>
                  </div>

                  {/* Head-wise fee breakdown */}
                  <div className="bg-white p-3 rounded-lg border border-slate-200/80 text-xs divide-y divide-slate-100">
                    {inv.items.map((item: any) => (
                      <div key={item.id} className="py-1.5 flex items-center justify-between">
                        <span className="text-slate-600">{item.feeHead.name}</span>
                        <span className="font-mono font-bold text-slate-800">{formatCurrency(item.amount)}</span>
                      </div>
                    ))}
                    {inv.discountAmount > 0 && (
                      <div className="py-1.5 flex items-center justify-between text-emerald-700 font-semibold">
                        <span>Concession / Sibling Discount</span>
                        <span>-{formatCurrency(inv.discountAmount)}</span>
                      </div>
                    )}
                  </div>

                  {/* Payment Simulator Form */}
                  <form action={collectFeePayment} className="space-y-3 pt-2">
                    <input type="hidden" name="invoiceId" value={inv.id} />
                    <input type="hidden" name="amountPaid" value={inv.balanceAmount} />
                    <input type="hidden" name="paymentMode" value="ONLINE_UPI" />
                    <input type="hidden" name="transactionRef" value={`PG-UPI-${Date.now().toString(36).toUpperCase()}`} />
                    <input type="hidden" name="cashierName" value="Online Parent Payment Gateway" />
                    <input type="hidden" name="returnUrl" value={`/pay?scholarNo=${encodeURIComponent(student.scholarNo)}&dob=${encodeURIComponent(dob || "")}&success=1`} />

                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-3">
                      <QrCode className="w-7 h-7 text-emerald-700 shrink-0" />
                      <div className="text-xs text-emerald-950">
                        <strong>Instant UPI & Net Banking Gateway</strong>
                        <p className="text-[11px] text-emerald-800">Direct instant receipt generated upon authorization.</p>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 px-4 rounded-xl text-xs transition shadow-md flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" /> Pay {formatCurrency(inv.balanceAmount)} via UPI / Card Now
                    </button>
                  </form>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* Public Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-6 text-center text-xs text-slate-500">
        <p>© 2026 Delhi Public School Kanpur. All Rights Reserved. • DPS Echo System</p>
      </footer>
    </div>
  );
}
