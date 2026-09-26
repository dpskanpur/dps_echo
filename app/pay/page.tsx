import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import { issuePayToken } from "@/lib/pay-token";
import { isGatewayConfigured } from "@/lib/razorpay";
import { rateLimit } from "@/lib/rate-limit";
import { RazorpayCheckoutButton } from "@/components/RazorpayCheckoutButton";
import { CheckCircle2, Search, Receipt, Lock, Building2, AlertTriangle } from "lucide-react";
import { calculateLateFee } from "@/lib/fee-payments";
import { PublicShell } from "@/components/PublicShell";

import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Quick Pay School Fees",
  description: "Official Quick Pay Fee Portal for Delhi Public School (DPS) Kanpur campuses (Azad Nagar, Barra, Kidwai Nagar, Servodaya Nagar). Pay school fees online via UPI, Net Banking, and Cards.",
  openGraph: {
    title: "Quick Pay School Fees | DPS Kanpur",
    description: "Pay school fees online securely for DPS Kanpur students across Azad Nagar, Barra, Kidwai Nagar, and Servodaya Nagar campuses.",
    url: "https://echo.dpskanpur.com/pay",
  },
};

export default async function PublicQuickPayPage({
  searchParams,
}: {
  searchParams: Promise<{ scholarNo?: string }>;
}) {
  const { scholarNo } = await searchParams;

  let student: any = null;
  let searchError = "";
  let payToken = "";

  const gatewayLive = isGatewayConfigured();

  if (scholarNo) {
    const headerList = await headers();
    const ip = (headerList.get("x-forwarded-for") || "unknown").split(",")[0].trim();
    const limit = rateLimit(`pay-lookup:${ip}`, 15, 60_000);

    if (!limit.allowed) {
      searchError = "Too many lookup attempts. Please wait a minute and try again.";
    } else {
      const cleanScholar = scholarNo.trim();

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
        student = matched;
        payToken = issuePayToken(matched.id);
      } else {
        searchError = `No student record found matching Scholar / Admission Number "${cleanScholar}". Please verify and try again.`;
      }
    }
  }

  return (
    <PublicShell
      eyebrow="Fee Payment"
      title="Pay school fees"
      subtitle="Enter the student's unique scholar or admission number to see outstanding dues and pay online via UPI, card or net banking."
      badge={
        <>
          <Lock className="w-3.5 h-3.5" /> Secure payment
        </>
      }
    >
      <div className="space-y-6">
        {!gatewayLive && (
          <div className="p-4 bg-amber-50 border border-amber-200 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900">
              <strong className="block font-semibold">Online payment is temporarily unavailable</strong>
              <p className="text-[11px] text-amber-800 mt-0.5">
                You can still review your dues below. Please pay at the school accounts office in the
                meantime.
              </p>
            </div>
          </div>
        )}

        {/* Search / Lookup Box */}
        <div className="bg-white border border-slate-300 p-5 sm:p-6">
          <form method="GET" className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Scholar or admission number
              </label>
              <input
                type="text"
                name="scholarNo"
                required
                defaultValue={scholarNo || ""}
                placeholder="e.g. DPSAZD-AZD-2026-0001 or DPSAZD-2018-0245"
                className="w-full bg-slate-50 border border-slate-300 px-3 py-2.5 text-sm text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
              />
            </div>

            {searchError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium">
                {searchError}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-emerald-800 hover:bg-emerald-900 text-white font-semibold py-2.5 px-4 text-sm transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Search className="w-4 h-4" /> Show outstanding dues
            </button>
          </form>
        </div>

        {/* Found Student Dues */}
        {student && (
          <div className="bg-white border border-slate-300 p-5 sm:p-6 space-y-5">
            {/* Student Dossier Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {student.firstName} {student.lastName}
                </h3>
                <p className="text-xs text-slate-500">
                  {student.scholarNo} • {student.class.name} • {student.campus.name}
                </p>
              </div>
              <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 shrink-0">
                Verified
              </span>
            </div>

            {/* Invoices List */}
            {student.invoices.length === 0 ? (
              <div className="p-6 bg-emerald-50 border border-emerald-200 text-center space-y-1.5">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
                <h4 className="font-semibold text-emerald-950 text-sm">All fees are paid</h4>
                <p className="text-xs text-emerald-800">
                  There are no pending invoices for {student.firstName}. Thank you!
                </p>
              </div>
            ) : (
              student.invoices.map((inv: any) => {
                const isOverdue = new Date() > new Date(inv.dueDate);
                const calculatedLateFee = isOverdue ? calculateLateFee(inv.dueDate, student.campus) : 0;
                const activeFine = Math.max(inv.fineAmount || 0, calculatedLateFee);
                const payableBalance = Math.max(0, inv.grossAmount - inv.discountAmount + activeFine - inv.paidAmount);

                return (
                  <div key={inv.id} className="bg-slate-50 border border-slate-300 p-4 sm:p-5 space-y-4">
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
                          {formatCurrency(payableBalance)}
                        </span>
                      </div>
                    </div>

                    {/* Head-wise fee breakdown */}
                    <div className="bg-white p-3 border border-slate-300/80 text-xs divide-y divide-slate-100">
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
                      {activeFine > 0 && (
                        <div className="py-1.5 flex items-center justify-between text-rose-700 font-bold">
                          <span>Automated Late Fee ({student.campus.code} Rules)</span>
                          <span>+{formatCurrency(activeFine)}</span>
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
                        amountLabel={formatCurrency(payableBalance)}
                      />
                    ) : (
                      <div className="p-3 bg-slate-100 border border-slate-300 text-[11px] text-slate-600">
                        Online payment is unavailable right now. Please pay this invoice at the school
                        accounts office.
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {/* Payment History */}
            {student.payments.length > 0 && (
              <div className="pt-2 space-y-3">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-slate-400" />
                  <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                    Recent payments
                  </h4>
                </div>

                <div className="border border-slate-300 divide-y divide-slate-100 overflow-hidden">
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

            <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-2 border-t border-slate-200">
              <Building2 className="w-3.5 h-3.5 text-emerald-700" />
              <span>
                {student.campus.name}
                {student.campus.phone ? ` • ${student.campus.phone}` : ""}
              </span>
            </div>
          </div>
        )}
      </div>
    </PublicShell>
  );
}
