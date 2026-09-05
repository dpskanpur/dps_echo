"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";
import { bulkImportStudents, StudentImportRow } from "@/lib/import-actions";
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Users,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";

const SAMPLE_CSV = `campusCode,className,sectionName,scholarNo,firstName,lastName,dob,gender,bloodGroup,house,fatherName,fatherPhone,fatherEmail,motherName,currentAddress
AZD,Class 9,A,DPS-AZD-2026-1001,Vihaan,Kapoor,2011-04-12,MALE,O+,Yamuna,Sanjay Kapoor,9839011223,sanjay.kapoor@example.com,Meenakshi Kapoor,14/110 Civil Lines Kanpur
AZD,Class 5,B,DPS-AZD-2026-1002,Myra,Singhania,2015-08-25,FEMALE,A+,Ganga,Vikram Singhania,9839022334,vikram@example.com,Anita Singhania,Flat 402 Swaroop Nagar Kanpur
BAR,Class 7,A,DPS-BAR-2026-1003,Devansh,Chopra,2013-11-03,MALE,B+,Jhelum,Alok Chopra,9839033445,alok.chopra@example.com,Pooja Chopra,Barra Sector 4 Kanpur
KID,Class 3,A,DPS-KID-2026-1004,Anvi,Tripathi,2017-02-19,FEMALE,AB+,Ravi,Praveen Tripathi,9839044556,praveen@example.com,Kavita Tripathi,Kidwai Nagar Block K Kanpur
SRV,Class 1,A,DPS-SRV-2026-1005,Aarush,Mishra,2019-06-14,MALE,O+,Yamuna,Deepak Mishra,9839055667,deepak@example.com,Sunita Mishra,Servodaya Nagar Kanpur`;

export default function BulkImportStudentsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<StudentImportRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    importedCount: number;
    errors: string[];
  } | null>(null);

  // Parse CSV text into array of objects
  const parseCSVText = (csvText: string) => {
    const lines = csvText.trim().split("\n");
    if (lines.length < 2) return;

    const headers = lines[0].split(",").map((h) => h.trim());
    const parsedRows: StudentImportRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(",").map((v) => v.trim());
      const rowObj: any = {};

      headers.forEach((h, index) => {
        rowObj[h] = values[index] || "";
      });

      if (rowObj.firstName && rowObj.lastName) {
        parsedRows.push(rowObj);
      }
    }

    setRows(parsedRows);
    setImportResult(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseCSVText(text);
    };
    reader.readAsText(file);
  };

  const loadSampleData = () => {
    setFileName("sample_dps_students.csv");
    parseCSVText(SAMPLE_CSV);
  };

  const downloadSampleTemplate = () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "dps_students_bulk_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const executeImport = async () => {
    if (rows.length === 0) return;
    setIsProcessing(true);
    try {
      const res = await bulkImportStudents(rows);
      setImportResult(res);
      if (res.success && res.errors.length === 0) {
        setTimeout(() => {
          router.refresh();
        }, 1500);
      }
    } catch (err: any) {
      setImportResult({
        success: false,
        importedCount: 0,
        errors: [err.message || "Bulk import failed."],
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          campuses={[
            { id: "ALL", code: "ALL", name: "All Campuses" },
            { id: "1", code: "AZD", name: "DPS Azad Nagar" },
            { id: "2", code: "BAR", name: "DPS Barra" },
            { id: "3", code: "KID", name: "DPS Kidwai Nagar" },
            { id: "4", code: "SRV", name: "DPS Servodaya Nagar" },
          ]}
        />

        <main className="p-8 space-y-6 flex-1 overflow-y-auto max-w-6xl mx-auto w-full">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-800" />
                <h1 className="text-xl font-black text-slate-900">
                  Bulk Student CSV / Excel Importer
                </h1>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Batch register new admissions and student cohorts across DPS Azad Nagar, Barra, Kidwai Nagar, and Servodaya Nagar.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={downloadSampleTemplate}
                className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
              >
                <Download className="w-4 h-4 text-emerald-800" /> Download Sample CSV
              </button>
            </div>
          </div>

          {/* Import Result Banner */}
          {importResult && (
            <div
              className={`p-5 rounded-2xl border ${
                importResult.success
                  ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                  : "bg-rose-50 border-rose-200 text-rose-950"
              } space-y-3`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {importResult.success ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-rose-600" />
                  )}
                  <div>
                    <h3 className="text-sm font-bold">
                      {importResult.success
                        ? `Successfully Imported ${importResult.importedCount} Students!`
                        : "Import Errors Encountered"}
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {importResult.success
                        ? "All student records and guardian links have been written to the institutional database."
                        : "Some rows failed validation. Review error breakdown below."}
                    </p>
                  </div>
                </div>

                {importResult.success && (
                  <Link
                    href="/students"
                    className="bg-emerald-800 hover:bg-emerald-900 text-white px-4 py-2 rounded-lg text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                  >
                    View in Student Directory <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>

              {importResult.errors.length > 0 && (
                <div className="pt-2 border-t border-rose-200/60 text-xs text-rose-800 space-y-1">
                  <span className="font-bold block">Error Log:</span>
                  <ul className="list-disc list-inside space-y-0.5 font-mono text-[11px]">
                    {importResult.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Upload Dropzone */}
          <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-8 text-center space-y-4 hover:border-emerald-500/60 transition shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-800 mx-auto flex items-center justify-center">
              <UploadCloud className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">
                Upload Student CSV File
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Drag and drop your formatted CSV file here, or click to browse from your computer.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <label className="cursor-pointer bg-emerald-800 hover:bg-emerald-900 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-sm inline-flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4" /> Browse CSV File
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={loadSampleData}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4 text-emerald-700" /> Load Sample 5-Student Batch
              </button>
            </div>

            {fileName && (
              <div className="text-xs text-slate-600 font-mono bg-slate-50 border border-slate-200 inline-block px-3 py-1 rounded-full">
                Selected File: <strong>{fileName}</strong> ({rows.length} rows parsed)
              </div>
            )}
          </div>

          {/* Preview & Validation Table */}
          {rows.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4">
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Pre-Import Data Preview ({rows.length} Records)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Verify student details before executing batch database write.
                  </p>
                </div>

                <button
                  disabled={isProcessing}
                  onClick={executeImport}
                  className="bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs font-black transition shadow-md flex items-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Importing Records...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> Commit & Import {rows.length} Students
                    </>
                  )}
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-4">#</th>
                      <th className="py-3 px-4">Campus</th>
                      <th className="py-3 px-4">Student Name</th>
                      <th className="py-3 px-4">Class & Sec</th>
                      <th className="py-3 px-4">DOB & Gender</th>
                      <th className="py-3 px-4">Father / Guardian</th>
                      <th className="py-3 px-4">Phone</th>
                      <th className="py-3 px-4">House</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((r, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-mono">
                            {r.campusCode}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <strong className="text-slate-900">
                            {r.firstName} {r.lastName}
                          </strong>
                          {r.scholarNo && (
                            <span className="block text-[10px] font-mono text-slate-400">
                              {r.scholarNo}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-700">
                          {r.className} {r.sectionName ? `(${r.sectionName})` : ""}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-slate-800 block">{r.dob}</span>
                          <span className="text-[10px] text-slate-400">{r.gender || "MALE"}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-800 font-medium">{r.fatherName || r.motherName || "-"}</td>
                        <td className="py-3 px-4 font-mono text-slate-600">{r.fatherPhone || r.motherPhone || "-"}</td>
                        <td className="py-3 px-4">
                          <span className="bg-slate-100 text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded">
                            {r.house || "Ganga"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
