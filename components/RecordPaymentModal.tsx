"use client";

import { useState, useTransition } from "react";
import { recordOfflineFeePayment } from "@/lib/fee-discount-actions";
import { formatCurrency } from "@/lib/utils";
import { CreditCard, Banknote, QrCode, Building, CheckCircle2, X, Loader2 } from "lucide-react";

interface RecordPaymentModalProps {
  invoiceId: string;
  invoiceNo: string;
  studentName: string;
  balanceAmount: number;
  buttonSize?: "sm" | "md";
}

export function RecordPaymentModal({
  invoiceId,
  invoiceNo,
  studentName,
  balanceAmount,
  buttonSize = "md",
}: RecordPaymentModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [paymentMode, setPaymentMode] = useState<string>("CASH");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await recordOfflineFeePayment(formData);
        setIsOpen(false);
      } catch (err: any) {
        setError(err.message || "Failed to record payment.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg transition shadow-xs cursor-pointer ${
          buttonSize === "sm" ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs"
        }`}
      >
        <Banknote className="w-3.5 h-3.5" />
        <span>Collect Offline Payment</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                  Offline Fee Collection Desk
                </span>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <span>{studentName}</span>
                </h3>
                <span className="text-xs text-slate-400 font-mono">Invoice #{invoiceNo}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl font-medium">
                  {error}
                </div>
              )}

              {/* Outstanding Balance Banner */}
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-center justify-between">
                <span className="text-slate-600 font-semibold">Outstanding Balance:</span>
                <span className="text-base font-black text-amber-900 font-mono">
                  {formatCurrency(balanceAmount)}
                </span>
              </div>

              <input type="hidden" name="invoiceId" value={invoiceId} />

              {/* Payment Mode Selector */}
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">
                  Payment Mode *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: "CASH", label: "Cash", icon: Banknote },
                    { id: "UPI", label: "UPI", icon: QrCode },
                    { id: "CHEQUE", label: "Cheque", icon: Building },
                    { id: "BANK_TRANSFER", label: "Bank/NEFT", icon: CreditCard },
                  ].map((mode) => {
                    const Icon = mode.icon;
                    const isSelected = paymentMode === mode.id;
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setPaymentMode(mode.id)}
                        className={`p-2.5 rounded-xl border text-center font-bold flex flex-col items-center gap-1 transition cursor-pointer ${
                          isSelected
                            ? "bg-emerald-50 border-emerald-600 text-emerald-900 shadow-xs"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isSelected ? "text-emerald-700" : "text-slate-400"}`} />
                        <span className="text-[11px]">{mode.label}</span>
                      </button>
                    );
                  })}
                </div>
                <input type="hidden" name="paymentMode" value={paymentMode} />
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Amount Received (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    name="amountPaid"
                    step="0.01"
                    min="1"
                    max={balanceAmount}
                    defaultValue={balanceAmount}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-sm font-bold font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Default is full settlement (₹{balanceAmount}). Enter lower amount for partial payment.
                </p>
              </div>

              {/* Transaction Ref / Reference No */}
              {paymentMode !== "CASH" && (
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    {paymentMode === "UPI"
                      ? "UPI Ref / Transaction ID"
                      : paymentMode === "CHEQUE"
                      ? "Cheque Number"
                      : "Bank Transfer UTR No"}
                  </label>
                  <input
                    type="text"
                    name="transactionRef"
                    placeholder="e.g. 429104810294 / CHQ-10492"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              )}

              {/* Bank Name (If Cheque or Bank Transfer) */}
              {(paymentMode === "CHEQUE" || paymentMode === "BANK_TRANSFER") && (
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Bank Name</label>
                  <input
                    type="text"
                    name="bankName"
                    placeholder="e.g. State Bank of India, HDFC Bank"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">Receipt Notes / Remarks</label>
                <input
                  type="text"
                  name="notes"
                  placeholder="e.g. Received at accounts counter"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={isPending}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 text-white font-bold px-5 py-2 rounded-xl text-xs transition flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Recording...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                      <span>Confirm & Issue Receipt</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
