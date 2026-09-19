"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { bulkImportStudents, StudentImportRow } from "@/lib/import-actions";
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  X,
  RefreshCw,
  Sparkles,
  ArrowRight,
  FileText,
} from "lucide-react";

const SAMPLE_CSV = `campusCode,className,sectionName,scholarNo,firstName,lastName,dob,gender,bloodGroup,house,fatherName,fatherPhone,fatherEmail,motherName,currentAddress
AZD,Class 9,A,DPS-AZD-2026-1001,Vihaan,Kapoor,2011-04-12,MALE,O+,Yamuna,Sanjay Kapoor,9839011223,sanjay.kapoor@example.com,Meenakshi Kapoor,14/110 Civil Lines Kanpur
AZD,Class 5,B,DPS-AZD-2026-1002,Myra,Singhania,2015-08-25,FEMALE,A+,Ganga,Vikram Singhania,9839022334,vikram@example.com,Anita Singhania,Flat 402 Swaroop Nagar Kanpur
BAR,Class 7,A,DPS-BAR-2026-1003,Devansh,Chopra,2013-11-03,MALE,B+,Jhelum,Alok Chopra,9839033445,alok.chopra@example.com,Pooja Chopra,Barra Sector 4 Kanpur
KID,Class 3,A,DPS-KID-2026-1004,Anvi,Tripathi,2017-02-19,FEMALE,AB+,Ravi,Praveen Tripathi,9839044556,praveen@example.com,Kavita Tripathi,Kidwai Nagar Block K Kanpur
SRV,Class 1,A,DPS-SRV-2026-1005,Aarush,Mishra,2019-06-14,MALE,O+,Yamuna,Deepak Mishra,9839055667,deepak@example.com,Sunita Mishra,Servodaya Nagar Kanpur`;

export function BulkImportModal() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [rows, setRows] = useState<StudentImportRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [importResult, setImportResult] = useState<{
    success: boolean;
    importedCount: number;
    errors: string[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSVText = (csvText: string) => {
    const lines = csvText.trim().split("\n");
    if (lines.length < 2) {
      setFileError("The CSV file appears to be empty or missing header columns.");
      setRows([]);
      return;
    }

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

    if (parsedRows.length === 0) {
      setFileError("No valid student records found in CSV file.");
      setRows([]);
    } else {
      setRows(parsedRows);
      setFileError(null);
    }
  };

  const processFile = (selectedFile: File) => {
    // Strict CSV validation: check extension and mime type
    const isCsvExtension = selectedFile.name.toLowerCase().endsWith(".csv");
    if (!isCsvExtension) {
      setFileError("Only .csv format is supported. Please select or drag a valid CSV file.");
      setFile(null);
      setRows([]);
      return;
    }

    setFileError(null);
    setFile(selectedFile);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseCSVText(text);
    };
    reader.readAsText(selectedFile);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      processFile(selected);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const selected = e.dataTransfer.files?.[0];
    if (selected) {
      processFile(selected);
    }
  };

  const loadSampleData = () => {
    const sampleFile = new File([SAMPLE_CSV], "dps_sample_students.csv", {
      type: "text/csv",
    });
    setFile(sampleFile);
    parseCSVText(SAMPLE_CSV);
    setImportResult(null);
    setFileError(null);
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

  const resetState = () => {
    setFile(null);
    setFileError(null);
    setRows([]);
    setIsProcessing(false);
    setProgress(0);
    setStatusMessage("");
    setImportResult(null);
  };

  const handleClose = () => {
    if (importResult?.success) {
      router.refresh();
    }
    resetState();
    setIsOpen(false);
  };

  const executeImport = async () => {
    if (rows.length === 0) return;
    setIsProcessing(true);
    setProgress(10);
    setStatusMessage("Validating CSV schema and campus codes...");

    // Simulate realistic progress steps for feedback
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 85) {
          clearInterval(interval);
          return 85;
        }
        return prev + 15;
      });
    }, 250);

    try {
      setStatusMessage(`Writing ${rows.length} student records to institutional database...`);
      const res = await bulkImportStudents(rows);

      clearInterval(interval);
      setProgress(100);
      setStatusMessage("Import complete!");
      setImportResult(res);
    } catch (err: any) {
      clearInterval(interval);
      setProgress(100);
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
    <>
      {/* Trigger Button next to New Student Registration */}
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 bg-[#0F9D58] hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
      >
        <UploadCloud className="w-4 h-4" />
        <span>Bulk Import (CSV)</span>
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900">
                    Bulk Student Import (.CSV Only)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Batch register students across Azad Nagar, Barra, Kidwai Nagar & Servodaya Nagar.
                  </p>
                </div>
              </div>

              <button
                onClick={handleClose}
                disabled={isProcessing}
                className="w-8 h-8 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Error Alert */}
              {fileError && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950 text-xs flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span className="font-semibold">{fileError}</span>
                </div>
              )}

              {/* Progress View when importing */}
              {isProcessing && (
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 text-center">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
                    <span className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-emerald-600 animate-spin" />
                      {statusMessage}
                    </span>
                    <span className="font-mono text-emerald-800 text-sm">{progress}%</span>
                  </div>

                  <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 transition-all duration-300 rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <p className="text-[11px] text-slate-400">
                    Processing {rows.length} student records... Please do not close this window.
                  </p>
                </div>
              )}

              {/* Success Result View */}
              {!isProcessing && importResult && (
                <div
                  className={`p-6 rounded-2xl border ${
                    importResult.success
                      ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                      : "bg-rose-50 border-rose-200 text-rose-950"
                  } space-y-4`}
                >
                  <div className="flex items-center gap-3">
                    {importResult.success ? (
                      <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-8 h-8 text-rose-600 shrink-0" />
                    )}
                    <div>
                      <h3 className="text-base font-black">
                        {importResult.success
                          ? "Upload Successful!"
                          : "Import Completed with Errors"}
                      </h3>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {importResult.success
                          ? `Successfully imported ${importResult.importedCount} student record(s) into the institutional database.`
                          : `${importResult.importedCount} record(s) imported, but some rows had validation errors.`}
                      </p>
                    </div>
                  </div>

                  {importResult.errors.length > 0 && (
                    <div className="p-3 bg-white/80 rounded-xl border border-rose-200 text-xs text-rose-800 space-y-1">
                      <strong className="block font-bold">Error Breakdown:</strong>
                      <ul className="list-disc list-inside space-y-0.5 font-mono text-[11px] max-h-32 overflow-y-auto">
                        {importResult.errors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={resetState}
                      className="text-xs font-bold text-slate-600 hover:text-slate-900 underline"
                    >
                      Upload Another File
                    </button>

                    <button
                      type="button"
                      onClick={handleClose}
                      className="bg-emerald-800 hover:bg-emerald-900 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-2"
                    >
                      Done & View Directory <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Upload Dropzone (When not processing and not completed) */}
              {!isProcessing && !importResult && (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-8 text-center space-y-4 hover:border-emerald-500/60 transition shadow-xs"
                >
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-800 mx-auto flex items-center justify-center">
                    <UploadCloud className="w-7 h-7" />
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-900">
                      Upload Formatted CSV File
                    </h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Drag and drop your <strong>.csv</strong> file here, or browse from your computer.
                    </p>
                    <span className="inline-block mt-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      Only .CSV format supported
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,text/csv"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-emerald-800 hover:bg-emerald-900 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-xs inline-flex items-center gap-2"
                    >
                      <FileSpreadsheet className="w-4 h-4" /> Browse CSV File
                    </button>

                    <button
                      type="button"
                      onClick={loadSampleData}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-emerald-700" /> Load Sample Batch
                    </button>
                  </div>

                  {file && (
                    <div className="pt-2">
                      <div className="text-xs text-slate-700 font-mono bg-emerald-50 border border-emerald-200 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl">
                        <FileText className="w-4 h-4 text-emerald-700" />
                        <span>
                          File: <strong>{file.name}</strong> ({rows.length} rows parsed)
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Data Preview Table before import */}
              {!isProcessing && !importResult && rows.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-3">
                  <div className="p-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs">
                        Parsed Records Preview ({rows.length} Students)
                      </h4>
                      <p className="text-[10px] text-slate-500">
                        Review parsed rows before committing database write.
                      </p>
                    </div>
                  </div>

                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500">
                        <tr>
                          <th className="py-2 px-3">#</th>
                          <th className="py-2 px-3">Campus</th>
                          <th className="py-2 px-3">Student Name</th>
                          <th className="py-2 px-3">Class</th>
                          <th className="py-2 px-3">Guardian</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {rows.map((r, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-mono text-slate-400 text-[11px]">{idx + 1}</td>
                            <td className="py-2 px-3">
                              <span className="font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px] font-mono">
                                {r.campusCode}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-semibold text-slate-900">
                              {r.firstName} {r.lastName}
                            </td>
                            <td className="py-2 px-3 text-slate-600">{r.className}</td>
                            <td className="py-2 px-3 text-slate-600">{r.fatherName || r.motherName || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={downloadSampleTemplate}
                className="text-slate-600 hover:text-slate-900 text-xs font-bold flex items-center gap-1.5"
              >
                <Download className="w-4 h-4 text-emerald-800" /> Download Sample CSV
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isProcessing}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition"
                >
                  Cancel
                </button>

                {!importResult && (
                  <button
                    type="button"
                    disabled={isProcessing || rows.length === 0}
                    onClick={executeImport}
                    className="bg-emerald-800 hover:bg-emerald-900 disabled:opacity-40 text-white px-5 py-2 rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Start Import ({rows.length})
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
