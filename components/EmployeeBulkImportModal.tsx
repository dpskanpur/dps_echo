"use client";

import { useState } from "react";
import { Upload, X, Download, CheckCircle2, AlertCircle, Loader2, FileSpreadsheet } from "lucide-react";
import { bulkImportEmployees, BulkEmployeeRow } from "@/lib/employee-actions";
import { useRouter } from "next/navigation";

export function EmployeeBulkImportModal({ defaultCampusId }: { defaultCampusId?: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [parsedRows, setParsedRows] = useState<BulkEmployeeRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);
  const router = useRouter();

  function downloadTemplate() {
    const headers = [
      "employeeCode",
      "campusCode",
      "firstName",
      "lastName",
      "gender",
      "dob",
      "bloodGroup",
      "phone",
      "email",
      "category",
      "designation",
      "department",
      "employmentType",
      "joiningDate",
      "qualification",
      "subjectsTaught",
      "cbseOasisId",
      "ctetQualified",
      "experienceYrs",
      "assignedClass",
      "assignedHouse",
    ];
    const sample1 = [
      "EMP-KID-0001",
      "DPSKID",
      "Anjali",
      "Verma",
      "FEMALE",
      "1988-05-14",
      "B+",
      "9839011223",
      "anjali.verma@dpskanpur.com",
      "TEACHING",
      "PRT",
      "Primary Wing",
      "PERMANENT",
      "2021-04-01",
      "M.A., B.Ed.",
      "English, EVS",
      "OASIS-UP-44912",
      "YES",
      "6",
      "Class III - A",
      "Nalanda",
    ];
    const sample2 = [
      "EMP-KID-0002",
      "DPSKID",
      "Rajesh",
      "Tiwari",
      "MALE",
      "1985-11-20",
      "O+",
      "9415022334",
      "rajesh.tiwari@dpskanpur.com",
      "ADMIN",
      "Office Superintendent",
      "Administration",
      "PERMANENT",
      "2019-07-15",
      "M.Com.",
      "",
      "",
      "NA",
      "10",
      "",
      "",
    ];
    const csvContent = [headers.join(","), sample1.map((c) => `"${c}"`).join(","), sample2.map((c) => `"${c}"`).join(",")].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dps_echo_employee_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function parseCsvLine(line: string): string[] {
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        out.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur.trim());
    return out;
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setResult(null);
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = (evt.target?.result as string) || "";
      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length < 2) {
        setParsedRows([]);
        return;
      }

      const headers = parseCsvLine(lines[0]).map((h) => h.replace(/^"|"$/g, "").trim());
      const rows: BulkEmployeeRow[] = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = parseCsvLine(lines[i]);
        const obj: any = {};
        headers.forEach((h, idx) => {
          obj[h] = (cols[idx] || "").replace(/^"|"$/g, "").trim();
        });
        if (obj.firstName || obj.phone) {
          rows.push(obj as BulkEmployeeRow);
        }
      }
      setParsedRows(rows);
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    if (parsedRows.length === 0) return;
    setLoading(true);
    try {
      const res = await bulkImportEmployees(parsedRows, defaultCampusId);
      setResult(res);
      if (res.imported > 0) {
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer"
      >
        <Upload className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        <span>Bulk CSV Import</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-boxdark border border-slate-200 dark:border-strokedark rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Bulk Import Faculty &amp; Staff (CSV)</h3>
                  <p className="text-[11px] text-slate-500">Zero-payroll HR &amp; CBSE OASIS staff directory import</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">1. Download Sample CSV Template</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Includes columns for Designation, CBSE OASIS ID, CTET status, Qualification &amp; Class Assignment.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={downloadTemplate}
                  className="inline-flex items-center gap-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl text-xs font-bold shadow-2xs transition cursor-pointer shrink-0"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  Template
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-2">
                  2. Select Completed CSV File
                </label>
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-emerald-500/60 rounded-xl p-6 cursor-pointer transition bg-slate-50/50 dark:bg-slate-900/30">
                  <Upload className="w-6 h-6 text-slate-400 mb-2" />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {fileName || "Click to choose a .csv file"}
                  </span>
                  <span className="text-[11px] text-slate-400 mt-0.5">
                    {parsedRows.length > 0 ? `${parsedRows.length} staff rows ready to import` : "Max 500 records per batch"}
                  </span>
                  <input type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
                </label>
              </div>

              {result && (
                <div className="p-3.5 rounded-xl border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      Imported {result.imported} staff record(s) • Skipped {result.skipped}
                    </span>
                  </div>
                  {result.errors.length > 0 && (
                    <div className="max-h-28 overflow-y-auto text-[11px] text-rose-600 dark:text-rose-400 space-y-1">
                      {result.errors.map((err, idx) => (
                        <div key={idx} className="flex items-start gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>{err}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 transition"
              >
                Close
              </button>
              <button
                type="button"
                disabled={loading || parsedRows.length === 0}
                onClick={handleImport}
                className="inline-flex items-center gap-2 bg-[#0F9D58] hover:bg-[#0d8a4d] disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                <span>Import {parsedRows.length > 0 ? `(${parsedRows.length})` : ""}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
