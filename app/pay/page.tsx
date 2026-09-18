import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import { issuePayToken } from "@/lib/pay-token";
import { isGatewayConfigured } from "@/lib/razorpay";
import { rateLimit } from "@/lib/rate-limit";
import { RazorpayCheckoutButton } from "@/components/RazorpayCheckoutButton";
import {
  CheckCircle2,
  Search,
  Receipt,
  Lock,
  Building2,
  AlertTriangle,
} from "lucide-react";

import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Quick Pay School Fees",
  description:
    "Official Quick Pay Fee Portal for Delhi Public School (DPS) Kanpur campuses (Azad Nagar, Barra, Kidwai Nagar, Servodaya Nagar). Pay school fees online via UPI, Net Banking, and Cards.",
  openGraph: {
    title: "Quick Pay School Fees | DPS Kanpur",
    description:
      "Pay school fees online securely for DPS Kanpur students across Azad Nagar, Barra, Kidwai Nagar, and Servodaya Nagar campuses.",
    url: "https://echo.dpskanpur.com/pay",
  },
};

export default async function PublicQuickPayPage({
  searchParams,
}: {
  searchParams: Promise<{ scholarNo?: string; dob?: string }>;
}) {
  const { scholarNo, dob } = await searchParams;

  let student: any = null;
  let searchError = "";
  let payToken = "";

  const gatewayLive = isGatewayConfigured();

  if (scholarNo && dob) {
    // The lookup is the only thing standing between a guessed scholar number
    // and a student's fee record, so it is rate limited per client.
    const headerList = await headers();
    const ip = (headerList.get("x-forwarded-for") || "unknown").split(",")[0].trim();
    const limit = rateLimit(`pay-lookup:${ip}`, 10, 60_000);

    if (!limit.allowed) {
      searchError = "Too many lookup attempts. Please wait a minute and try again.";
    } else {
      const cleanScholar = scholarNo.trim();

      // Exact match only. A partial match would let anyone walk the roll.
      const matched = await prisma.student.findFirst({
        where: {
          OR: [
            { scholarNo: { equals: cleanScholar, mode: "insensitive" } },
            { admissionNo: { equals: cleanScholar, mode: "insensitive" } },
          ],
        },
        include: {
          campus: true,
          class: true,
          section: true,
          invoices: {
            where: { status: { in: ["PENDING", "PARTIALLY_PAID", "OVERDUE"] } },
            include: { items: { include: { feeHead: true } } },
            orderBy: { dueDate: "asc" },
          },
          payments: {
            orderBy: { paymentDate: "desc" },
            take: 8,
            include: { invoice: { select: { invoiceNo: true, periodName: true } } },
          },
        },
      });

      if (matched) {
        const sDob = new Date(dob);
        const sameDay =
          matched.dob.getUTCFullYear() === sDob.getUTCFullYear() &&
          matched.dob.getUTCMonth() === sDob.getUTCMonth() &&
          matched.dob.getUTCDate() === sDob.getUTCDate();

        if (sameDay) {
          student = matched;
          payToken = issuePayToken(matched.id);
        } else {
          searchError = "Date of Birth does not match school records for this Scholar Number.";
        }
      } else {
        // Deliberately identical to the DOB mismatch message so the form
        // cannot be used to confirm which scholar numbers exist.
        searchError = "No matching student found. Please check the Scholar Number and Date of Birth.";
      }
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
            <Lock className="w-3.5 h-3.5 text-emerald-400" /> Secure Payment Gateway
          </div>
        </div>
      </header>

      {/* Main Form & Invoices Container */}
      <main className="max-w-4xl mx-auto w-full p-4 sm:p-6 space-y-6 my-auto">
        {/* Banner */}
        <div className="text-center space-y-1">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">Online Fee Payment Portal</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Pay student quarterly tuition &amp; school dues instantly with UPI, Net Banking, or
            Debit/Credit card. No login required.
          </p>
        </div>

        {!gatewayLive && (
          <div className="max-w-xl mx-auto p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900">
              <strong className="block font-bold">Online payment is temporarily unavailable</strong>
              <p className="text-[11px] text-amber-800 mt-0.5">
                You can still review your dues below. Please pay at the school accounts office in the
                meantime.
              </p>
            </div>
          </div>
        )}

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
                placeholder="e.g. DPS-AZD-2018-0245"
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
                <div key={inv.id} className="bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono text-xs font-bold text-slate-900 block">
                        {inv.invoiceNo}
                      </span>
                      <span className="text-xs font-semibold text-slate-600">{inv.periodName}</span>
                      <span className="block text-[11px] text-slate-500 mt-0.5">
                        Due {formatDate(inv.dueDate)}
                      </span>
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
                        <span className="font-mono font-bold text-slate-800">
                          {formatCurrency(item.amount)}
                        </span>
                      </div>
                    ))}
                    {inv.discountAmount > 0 && (
                      <div className="py-1.5 flex items-center justify-between text-emerald-700 font-semibold">
                        <span>Concession / Sibling Discount</span>
                        <span>-{formatCurrency(inv.discountAmount)}</span>
                      </div>
                    )}
                    {inv.paidAmount > 0 && (
                      <div className="py-1.5 flex items-center justify-between text-slate-600 font-semibold">
                        <span>Already Paid</span>
                        <span>-{formatCurrency(inv.paidAmount)}</span>
                      </div>
                    )}
                  </div>

                  {gatewayLive ? (
                    <RazorpayCheckoutButton
                      invoiceId={inv.id}
                      payToken={payToken}
                      invoiceNo={inv.invoiceNo}
                      amountLabel={formatCurrency(inv.balanceAmount)}
                    />
                  ) : (
                    <div className="p-3 bg-slate-100 border border-slate-200 rounded-lg text-[11px] text-slate-600">
                      Online payment is unavailable right now. Please pay this invoice at the school
                      accounts office.
                    </div>
                  )}
                </div>
              ))
            )}

            {/* Payment History */}
            {student.payments.length > 0 && (
              <div className="pt-2 space-y-3">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-slate-400" />
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Recent Payments
                  </h4>
                </div>

                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
                  {student.payments.map((p: any) => (
                    <div key={p.id} className="p-3 flex items-center justify-between bg-white">
                      <div className="min-w-0">
                        <span className="font-mono text-[11px] font-bold text-slate-900 block truncate">
                          {p.receiptNo}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {formatDate(p.paymentDate)} • {p.paymentMode.replace(/_/g, " ")} •{" "}
                          {p.invoice.periodName}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-slate-800 shrink-0 ml-3">
                        {formatCurrency(p.amountPaid)}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400">
                  For a stamped receipt copy, contact the school accounts office.
                </p>
              </div>
            )}

            <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-2 border-t border-slate-100">
              <Building2 className="w-3.5 h-3.5 text-emerald-700" />
              <span>
                {student.campus.name}
                {student.campus.phone ? ` • ${student.campus.phone}` : ""}
              </span>
            </div>
          </div>
        )}
      </main>

      {/* Public Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-6 text-center text-xs text-slate-500">
        <p>© 2026 DPS Echo. All Rights Reserved.</p>
      </footer>
    </div>
  );
}
