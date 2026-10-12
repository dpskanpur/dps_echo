"use client";

import { useState } from "react";
import { Upload, Plus, FileSpreadsheet, AlertCircle, CheckCircle2, X } from "lucide-react";
import { importQuarterlyDemandsAction, upsertSingleDemandAction } from "@/lib/fee-demand-actions";

export function DemandImportModal({
  campuses,
  academicSessionName,
}: {
  campuses: Array<{ id: string; code: string; name: string }>;
  academicSessionName?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"bulk" | "single">("bulk");
  const [csvText, setCsvText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; applied?: number; errors?: string[] } | null>(null);

  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const lines = csvText.trim().split("\n");
      if (lines.length === 0 || !csvText.trim()) {
        setResult({ success: false, applied: 0, errors: ["Please paste or select valid CSV data."] });
        setLoading(false);
        return;
      }

      const rows: Array<{
        scholarNo: string;
        periodName: string;
        grossAmount: number;
        discountAmount?: number;
        discountReason?: string;
        dueDate?: string;
      }> = [];

      // Check header
      const startIdx = lines[0].toLowerCase().includes("scholar") ? 1 : 0;

      for (let i = startIdx; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Split by comma or tab
        const parts = line.split(/,|\t/).map((p) => p.trim().replace(/^["']|["']$/g, ""));
        if (parts.length >= 3) {
          const scholarNo = parts[0];
          const periodName = parts[1] || "Quarter 1 (Apr - Jun)";
          const grossAmount = parseFloat(parts[2] || "0");
          const discountAmount = parseFloat(parts[3] || "0");
          const discountReason = parts[4] || "";
          const dueDate = parts[5] || "";

          if (scholarNo && grossAmount > 0) {
            rows.push({
              scholarNo,
              periodName,
              grossAmount,
              discountAmount,
              discountReason,
              dueDate,
            });
          }
        }
      }

      if (rows.length === 0) {
        setResult({
          success: false,
          applied: 0,
          errors: ["No valid student demand rows found in your CSV."],
        });
        setLoading(false);
        return;
      }

      const res = await importQuarterlyDemandsAction(rows, academicSessionName);
      setResult(res);
      if (res.success && res.applied > 0) {
        setCsvText("");
      }
    } catch (err: any) {
      setResult({ success: false, applied: 0, errors: [err.message || "An error occurred during import."] });
    } finally {
      setLoading(false);
    }
  };

  const sampleCsv = `ScholarNo,PeriodName,GrossAmount,DiscountAmount,DiscountReason,DueDate
DPS-AZD-2026-0001,Quarter 1 (Apr - Jun),15000,1500,Staff Ward 10%,2026-04-15
DPS-AZD-2026-0002,Quarter 1 (Apr - Jun),15000,0,,2026-04-15
DPS-BAR-2026-0105,Quarter 1 (Apr - Jun),18000,2000,Sibling Concession,2026-04-15`;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 bg-[#0F9D58] hover:bg-[#0d8a4d] text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition cursor-pointer"
      >
        <Upload className="w-4 h-4" />
        <span>Upload / Add Fee Demands</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-boxdark rounded-3xl border border-slate-200 dark:border-strokedark shadow-2xl max-w-2xl w-full p-6 space-y-5 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white">
                    Import Student Fee Demands &amp; Discounts
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-bodydark2">
                    Session: {academicSessionName || "Active Session"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab Switcher */}
            <div className="flex border-b border-slate-200 dark:border-strokedark text-xs font-bold">
              <button
                onClick={() => setActiveTab("bulk")}
                className={`py-2 px-4 border-b-2 transition ${
                  activeTab === "bulk"
                    ? "border-emerald-600 text-emerald-700"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                Bulk CSV / Excel Upload
              </button>
              <button
                onClick={() => setActiveTab("single")}
                className={`py-2 px-4 border-b-2 transition ${
                  activeTab === "single"
                    ? "border-emerald-600 text-emerald-700"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                Single Student Entry
              </button>
            </div>

            {/* Results Alert */}
            {result && (
              <div
                className={`p-4 rounded-2xl border text-xs ${
                  result.success
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                    : "bg-rose-50 border-rose-200 text-rose-900"
                }`}
              >
                <div className="flex items-center gap-2 font-bold mb-1">
                  {result.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-700" />
                  )}
                  <span>
                    {result.success
                      ? `Successfully imported/updated ${result.applied} fee demand(s)!`
                      : "Import issues detected"}
                  </span>
                </div>
                {result.errors && result.errors.length > 0 && (
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] mt-2 opacity-90 max-h-32 overflow-y-auto">
                    {result.errors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Bulk Tab */}
            {activeTab === "bulk" ? (
              <form onSubmit={handleBulkImport} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Paste CSV Data (ScholarNo, PeriodName, GrossAmount, DiscountAmount, DiscountReason, DueDate)
                    </label>
                    <button
                      type="button"
                      onClick={() => setCsvText(sampleCsv)}
                      className="text-[11px] font-semibold text-emerald-700 hover:underline"
                    >
                      Load Sample Data
                    </button>
                  </div>
                  <textarea
                    value={csvText}
                    onChange={(e) => setCsvText(e.target.value)}
                    rows={8}
                    placeholder={`ScholarNo,PeriodName,GrossAmount,DiscountAmount,DiscountReason,DueDate\nDPS-AZD-2026-0001,Quarter 1 (Apr - Jun),15000,1500,Staff Ward 10%,2026-04-15`}
                    className="w-full font-mono text-xs p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-strokedark rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 bg-[#0F9D58] hover:bg-[#0d8a4d] text-white font-bold text-xs px-5 py-2.5 rounded-xl transition disabled:opacity-50"
                  >
                    {loading ? "Processing..." : "Import Demands"}
                  </button>
                </div>
              </form>
            ) : (
              /* Single Student Form */
              <form
                action={async (fd) => {
                  setLoading(true);
                  setResult(null);
                  try {
                    await upsertSingleDemandAction(fd);
                    setResult({ success: true, applied: 1, errors: [] });
                  } catch (err: any) {
                    setResult({ success: false, applied: 0, errors: [err.message] });
                  } finally {
                    setLoading(false);
                  }
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Scholar Number *</label>
                    <input
                      type="text"
                      name="scholarNo"
                      required
                      placeholder="e.g. DPS-AZD-2026-0001"
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Period / Quarter *</label>
                    <select
                      name="periodName"
                      defaultValue="Quarter 1 (Apr - Jun)"
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none"
                    >
                      <option value="Quarter 1 (Apr - Jun)">Quarter 1 (Apr - Jun)</option>
                      <option value="Quarter 2 (Jul - Sep)">Quarter 2 (Jul - Sep)</option>
                      <option value="Quarter 3 (Oct - Dec)">Quarter 3 (Oct - Dec)</option>
                      <option value="Quarter 4 (Jan - Mar)">Quarter 4 (Jan - Mar)</option>
                      <option value="Annual Fee 2026-27">Annual Fee 2026-27</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Gross Fee Amount (₹) *</label>
                    <input
                      type="number"
                      name="grossAmount"
                      required
                      step="50"
                      min="0"
                      placeholder="15000"
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Concession / Discount (₹)</label>
                    <input
                      type="number"
                      name="discountAmount"
                      step="50"
                      min="0"
                      placeholder="0"
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Discount Reason</label>
                    <input
                      type="text"
                      name="discountReason"
                      placeholder="e.g. Staff Ward 50%"
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Due Date</label>
                    <input
                      type="date"
                      name="dueDate"
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 bg-[#0F9D58] hover:bg-[#0d8a4d] text-white font-bold text-xs px-5 py-2.5 rounded-xl transition disabled:opacity-50"
                  >
                    {loading ? "Saving..." : "Save Demand"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
