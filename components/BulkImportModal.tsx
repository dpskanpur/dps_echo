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
  FileText,
} from "lucide-react";
import { Button } from "@/components/tremor";

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

      headers.forEach((header, index) => {
        rowObj[header] = values[index] || "";
      });

      // Basic field sanitation
      if (rowObj.scholarNo && rowObj.firstName && rowObj.campusCode) {
        parsedRows.push({
          campusCode: rowObj.campusCode.toUpperCase(),
          className: rowObj.className || "Class 1",
          sectionName: rowObj.sectionName || "A",
          scholarNo: rowObj.scholarNo,
          firstName: rowObj.firstName,
          lastName: rowObj.lastName || "",
          dob: rowObj.dob || "2015-01-01",
          gender: rowObj.gender ? rowObj.gender.toUpperCase() : "MALE",
          bloodGroup: rowObj.bloodGroup,
          house: rowObj.house,
          fatherName: rowObj.fatherName,
          fatherPhone: rowObj.fatherPhone,
          fatherEmail: rowObj.fatherEmail,
          motherName: rowObj.motherName,
          currentAddress: rowObj.currentAddress,
        });
      }
    }

    if (parsedRows.length === 0) {
      setFileError("No valid student rows found. Verify required columns: campusCode, scholarNo, firstName.");
      setRows([]);
    } else {
      setFileError(null);
      setRows(parsedRows);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith(".csv")) {
      setFileError("Invalid file type. Please upload a standard .CSV file.");
      setFile(null);
      setRows([]);
      return;
    }

    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseCSVText(text);
    };
    reader.readAsText(selectedFile);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (!droppedFile) return;

    if (!droppedFile.name.endsWith(".csv")) {
      setFileError("Invalid file type. Please drop a valid .csv file.");
      return;
    }

    setFile(droppedFile);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseCSVText(text);
    };
    reader.readAsText(droppedFile);
  };

  const loadSampleData = () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
    const sampleFile = new File([blob], "dps_sample_students.csv", { type: "text/csv" });
    setFile(sampleFile);
    parseCSVText(SAMPLE_CSV);
  };

  const downloadSampleTemplate = () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "dps_student_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetState = () => {
    setFile(null);
    setRows([]);
    setFileError(null);
    setProgress(0);
    setStatusMessage("");
    setImportResult(null);
    setIsProcessing(false);
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
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => setIsOpen(true)}
      >
        <UploadCloud className="w-3.5 h-3.5 text-slate-500" />
        <span>Bulk Import (CSV)</span>
      </Button>

      {/* Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 animate-in fade-in duration-150">
          <div className="bg-white rounded-md shadow-lg border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 border border-slate-200">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    Bulk Student Import (.CSV)
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Batch register students across Azad Nagar, Barra, Kidwai Nagar, Servodaya Nagar.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClose}
                disabled={isProcessing}
                className="w-7 h-7 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 overflow-y-auto space-y-4 flex-1">
              {/* Error Alert */}
              {fileError && (
                <div className="p-3 rounded border border-rose-200 bg-rose-50 text-rose-900 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{fileError}</span>
                </div>
              )}

              {/* Progress View when importing */}
              {isProcessing && (
                <div className="p-4 bg-slate-50 rounded border border-slate-200 space-y-3 text-center">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
                    <span className="flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 text-slate-600 animate-spin" />
                      {statusMessage}
                    </span>
                    <span className="font-mono text-slate-900">{progress}%</span>
                  </div>

                  <div className="w-full h-2 bg-slate-200 rounded overflow-hidden">
                    <div
                      className="h-full bg-slate-900 transition-all duration-300 rounded"
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
                  className={`p-4 rounded border ${
                    importResult.success
                      ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                      : "bg-rose-50 border-rose-200 text-rose-950"
                  } space-y-3`}
                >
                  <div className="flex items-center gap-2.5">
                    {importResult.success ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0" />
                    )}
                    <div>
                      <h3 className="text-sm font-semibold">
                        {importResult.success ? "Upload Successful" : "Import Completed with Errors"}
                      </h3>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {importResult.success
                          ? `Successfully imported ${importResult.importedCount} student record(s) into institutional database.`
                          : `${importResult.importedCount} record(s) imported, but some rows had validation errors.`}
                      </p>
                    </div>
                  </div>

                  {importResult.errors.length > 0 && (
                    <div className="p-3 bg-white rounded border border-rose-200 text-xs text-rose-800 space-y-1">
                      <strong className="block font-semibold">Error Breakdown:</strong>
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
                      className="text-xs text-slate-600 hover:text-slate-900 underline"
                    >
                      Upload Another File
                    </button>

                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={handleClose}
                    >
                      Done & View Directory
                    </Button>
                  </div>
                </div>
              )}

              {/* Upload Dropzone */}
              {!isProcessing && !importResult && (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  className="bg-white rounded border border-dashed border-slate-300 p-6 text-center space-y-3 hover:border-slate-400 transition"
                >
                  <div className="w-10 h-10 rounded bg-slate-50 text-slate-600 mx-auto flex items-center justify-center border border-slate-200">
                    <UploadCloud className="w-5 h-5" />
                  </div>

                  <div className="space-y-0.5">
                    <h3 className="text-xs font-semibold text-slate-900">
                      Upload Formatted CSV File
                    </h3>
                    <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                      Drag and drop your <strong>.csv</strong> file here, or browse from your computer.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,text/csv"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="primary"
                      size="xs"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Browse CSV File</span>
                    </Button>

                    <Button
                      type="button"
                      variant="secondary"
                      size="xs"
                      onClick={loadSampleData}
                    >
                      Load Sample Batch
                    </Button>
                  </div>

                  {file && (
                    <div className="pt-1">
                      <div className="text-xs text-slate-700 font-mono bg-slate-50 border border-slate-200 inline-flex items-center gap-1.5 px-2.5 py-1 rounded">
                        <FileText className="w-3.5 h-3.5 text-slate-500" />
                        <span>
                          File: <strong>{file.name}</strong> ({rows.length} rows parsed)
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Data Preview Table */}
              {!isProcessing && !importResult && rows.length > 0 && (
                <div className="bg-white rounded border border-slate-200 overflow-hidden space-y-2">
                  <div className="px-3 py-2 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-slate-900 text-xs">
                        Parsed Records Preview ({rows.length} Students)
                      </h4>
                      <p className="text-[10px] text-slate-500">
                        Review parsed rows before committing database write.
                      </p>
                    </div>
                  </div>

                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-[10px] font-semibold uppercase text-slate-500">
                        <tr>
                          <th className="py-1.5 px-2">#</th>
                          <th className="py-1.5 px-2">Campus</th>
                          <th className="py-1.5 px-2">Student Name</th>
                          <th className="py-1.5 px-2">Class</th>
                          <th className="py-1.5 px-2">Guardian</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {rows.map((r, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-1.5 px-2 font-mono text-slate-400 text-[11px]">{idx + 1}</td>
                            <td className="py-1.5 px-2">
                              <span className="font-semibold text-slate-700 bg-slate-100 px-1 py-0.5 rounded text-[10px] font-mono border border-slate-200">
                                {r.campusCode}
                              </span>
                            </td>
                            <td className="py-1.5 px-2 font-medium text-slate-900">
                              {r.firstName} {r.lastName}
                            </td>
                            <td className="py-1.5 px-2 text-slate-600">{r.className}</td>
                            <td className="py-1.5 px-2 text-slate-600">{r.fatherName || r.motherName || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-4 py-2.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={downloadSampleTemplate}
                className="text-slate-600 hover:text-slate-900 text-xs font-medium flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Download Sample CSV</span>
              </button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
                  disabled={isProcessing}
                >
                  Cancel
                </Button>

                {!importResult && (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    disabled={isProcessing || rows.length === 0}
                    onClick={executeImport}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Start Import ({rows.length})</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
