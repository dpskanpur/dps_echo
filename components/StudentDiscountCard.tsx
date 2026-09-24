"use client";

import { useState, useTransition } from "react";
import {
  toggleStudentDiscountEligibility,
  updateStudentDiscount,
} from "@/lib/fee-discount-actions";
import { formatCurrency } from "@/lib/utils";
import { Shield, ShieldAlert, ShieldCheck, Tag, Percent, DollarSign, Check, Loader2, Info } from "lucide-react";

interface StudentDiscountCardProps {
  studentId: string;
  studentName: string;
  isDiscountEligible: boolean;
  discountPercent: number;
  discountAmount: number;
  discountApprovedBy?: string | null;
  discountReason?: string | null;
  isAdmin: boolean;
  canManageFees: boolean;
  totalGrossDemand: number;
}

export function StudentDiscountCard({
  studentId,
  studentName,
  isDiscountEligible,
  discountPercent,
  discountAmount,
  discountApprovedBy,
  discountReason,
  isAdmin,
  canManageFees,
  totalGrossDemand,
}: StudentDiscountCardProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Local state for inputs
  const [pct, setPct] = useState<number>(discountPercent || 0);
  const [amt, setAmt] = useState<number>(discountAmount || 0);
  const [reason, setReason] = useState<string>(discountReason || "");

  // Calculated net fee
  const pctDiscountVal = totalGrossDemand * (pct / 100);
  const totalDiscountVal = isDiscountEligible ? Math.min(totalGrossDemand, pctDiscountVal + amt) : 0;
  const netPayableVal = Math.max(0, totalGrossDemand - totalDiscountVal);

  async function handleToggleEligibility(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await toggleStudentDiscountEligibility(formData);
        setSuccess("Discount eligibility updated successfully!");
      } catch (err: any) {
        setError(err.message || "Failed to update eligibility.");
      }
    });
  }

  async function handleUpdateDiscount(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await updateStudentDiscount(formData);
        setSuccess("Student fee discount updated successfully!");
      } catch (err: any) {
        setError(err.message || "Failed to update discount.");
      }
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-50 text-amber-800 border border-amber-200/60">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              Fee Concession & Discount Gate
            </h3>
            <p className="text-xs text-slate-500">
              Admin-approved fee discount rules and net payable calculation.
            </p>
          </div>
        </div>

        {/* Eligibility Status Badge */}
        <div>
          {isDiscountEligible ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              Eligible for Discount
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
              <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
              Discount Disabled (0%)
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium">
          {success}
        </div>
      )}

      {/* Admin Approval Gate Panel */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <Shield className="w-4 h-4 text-emerald-800" />
            <span>Admin Confirmation Gate</span>
          </div>
          {discountApprovedBy && (
            <span className="text-[11px] text-slate-500">
              Approved by: <strong className="text-slate-800">{discountApprovedBy}</strong>
            </span>
          )}
        </div>

        {isAdmin ? (
          <form onSubmit={handleToggleEligibility} className="flex items-center justify-between pt-1">
            <input type="hidden" name="studentId" value={studentId} />
            <input type="hidden" name="isEligible" value={isDiscountEligible ? "false" : "true"} />

            <p className="text-xs text-slate-600">
              {isDiscountEligible
                ? "As an Admin, you have verified and enabled discount eligibility for this student."
                : "As an Admin, confirm if this student is eligible for fee discounts/concessions."}
            </p>

            <button
              type="submit"
              disabled={isPending}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer ${
                isDiscountEligible
                  ? "bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300"
                  : "bg-emerald-800 hover:bg-emerald-900 text-white"
              }`}
            >
              {isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : isDiscountEligible ? (
                <span>Revoke Admin Eligibility</span>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Confirm & Enable Eligibility</span>
                </>
              )}
            </button>
          </form>
        ) : (
          <div className="text-xs text-slate-600 flex items-center gap-2">
            <Info className="w-4 h-4 text-slate-400 shrink-0" />
            <span>
              {isDiscountEligible
                ? "Admin has confirmed discount eligibility. Fee Managers can set discount percentage/amount below."
                : "Only Admin users can confirm/enable discount eligibility. Fee Managers cannot enter discounts until enabled by Admin."}
            </span>
          </div>
        )}
      </div>

      {/* Discount Configuration Form (Active when isDiscountEligible === true and user has fee permissions) */}
      {isDiscountEligible && canManageFees && (
        <form onSubmit={handleUpdateDiscount} className="space-y-4 pt-2">
          <input type="hidden" name="studentId" value={studentId} />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Percentage Discount */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Discount Percentage (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  name="discountPercent"
                  step="0.1"
                  min="0"
                  max="100"
                  value={pct}
                  onChange={(e) => setPct(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <Percent className="w-3.5 h-3.5 absolute right-3 top-2.5 text-slate-400" />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Default: 0%</span>
            </div>

            {/* Fixed Amount Discount */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Fixed Lump-sum Concession (₹)
              </label>
              <div className="relative">
                <input
                  type="number"
                  name="discountAmount"
                  step="1"
                  min="0"
                  value={amt}
                  onChange={(e) => setAmt(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <DollarSign className="w-3.5 h-3.5 absolute right-3 top-2.5 text-slate-400" />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Additional lump-sum waiver</span>
            </div>

            {/* Concession Category / Reason */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Concession Reason / Category
              </label>
              <select
                name="discountReason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="">-- Select Reason --</option>
                <option value="Sibling Concession">Sibling Concession</option>
                <option value="Staff Ward Concession">Staff Ward Concession</option>
                <option value="Merit Scholarship">Merit Scholarship</option>
                <option value="EWS / RTE Waiver">EWS / RTE Waiver</option>
                <option value="Management Special Approval">Management Special Approval</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-500">
              Updating discount will recalculate all pending quarterly demands for {studentName}.
            </span>
            <button
              type="submit"
              disabled={isPending}
              className="bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 text-white font-bold px-5 py-2 rounded-xl text-xs transition flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Apply & Recalculate Fees</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Real-time Calculation Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 text-xs">
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
          <span className="text-slate-400 font-medium block text-[11px]">Gross Invoiced Demand</span>
          <strong className="text-slate-900 text-sm font-mono">{formatCurrency(totalGrossDemand)}</strong>
        </div>

        <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
          <span className="text-emerald-800 font-medium block text-[11px]">Total Applied Discount</span>
          <strong className="text-emerald-900 text-sm font-mono">
            -{formatCurrency(totalDiscountVal)} ({pct}% {amt > 0 ? `+ ₹${amt}` : ""})
          </strong>
        </div>

        <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
          <span className="text-amber-800 font-medium block text-[11px]">Final Net Payable Amount</span>
          <strong className="text-amber-950 text-sm font-mono font-black">{formatCurrency(netPayableVal)}</strong>
        </div>
      </div>
    </div>
  );
}
