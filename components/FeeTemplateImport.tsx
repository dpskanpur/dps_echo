"use client";

import { useRef, useState } from "react";
import { UploadCloud, Download, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { importFeeStructures } from "@/lib/fee-structure-actions";
import { FeeStructureImportRow } from "@/lib/fee-constants";

interface ClassOption {
  id: string;
  name: string;
}
interface HeadOption {
  id: string;
  code: string;
  name: string;
}

/**
 * Fee template upload.
 *
 * The template is generated from this campus's own classes and fee heads, so
 * what the user downloads already contains valid identifiers — the common
 * import failure is a spreadsheet naming classes the database doesn't have.
 */
export function FeeTemplateImport({
  campusId,
  campusCode,
  academicYearId,
  sessionName,
  classes,
  feeHeads,
}: {
  campusId: string;
  campusCode: string;
  academicYearId: string;
  sessionName: string;
  classes: ClassOption[];
  feeHeads: HeadOption[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<FeeStructureImportRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [parseError, setParseError] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ applied: number; errors: string[] } | null>(null);

  function downloadTemplate() {
    const header = "className,feeHeadCode,amount,frequency";
    const lines = [header];

    // Pre-fill every class × fee head pair at zero, so the school fills
    // amounts rather than inventing the structure.
    for (const cls of classes) {
      for (const head of feeHeads) {
        lines.push(`"${cls.name}",${head.code},0,QUARTERLY`);
      }
    }

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fee-template-${campusCode}-${sessionName || "session"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setResult(null);
    setParseError("");
    setRows([]);
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || "");
        const lines = text.trim().split(/\r?\n/);
        if (lines.length < 2) {
          setParseError("The file has a header but no rows.");
          return;
        }

        const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
        const need = ["classname", "feeheadcode", "amount"];
        const missing = need.filter((h) => !headers.includes(h));
        if (missing.length) {
          setParseError(`Missing column(s): ${missing.join(", ")}. Download the template above.`);
          return;
        }

        const parsed: FeeStructureImportRow[] = [];
        for (let i = 1; i < lines.length; i++) {
          const raw = lines[i].trim();
          if (!raw) continue;
          // Handles quoted class names containing commas.
          const cells = raw.match(/("[^"]*"|[^,]+)/g)?.map((c) => c.replace(/^"|"$/g, "").trim()) || [];
          const get = (name: string) => cells[headers.indexOf(name)] ?? "";
          parsed.push({
            className: get("classname"),
            feeHeadCode: get("feeheadcode"),
            amount: get("amount"),
            frequency: get("frequency") || "QUARTERLY",
          });
        }

        if (!parsed.length) setParseError("No usable rows found.");
        setRows(parsed);
      } catch {
        setParseError("Could not read that file. It must be a plain CSV.");
      }
    };
    reader.readAsText(file);
  }

  async function apply() {
    setBusy(true);
    setResult(null);
    try {
      const res = await importFeeStructures(campusId, rows, academicYearId);
      setResult({ applied: res.applied, errors: res.errors });
      if (res.success) {
        setRows([]);
        setFileName("");
        if (inputRef.current) inputRef.current.value = "";
      }
    } catch (err: any) {
      setResult({ applied: 0, errors: [err?.message || "Import failed."] });
    } finally {
      setBusy(false);
    }
  }

  const blocked = feeHeads.length === 0 || classes.length === 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Upload a Fee Template</h2>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Fill amounts into the template and upload it. Applies to{" "}
            <strong className="text-slate-700">{campusCode}</strong> for session{" "}
            <strong className="text-slate-700">{sessionName || "—"}</strong> only. Re-uploading
            updates existing amounts rather than creating duplicates.
          </p>
        </div>
        <button
          type="button"
          onClick={downloadTemplate}
          disabled={blocked}
          className="shrink-0 flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition"
        >
          <Download className="w-3.5 h-3.5" /> Template
        </button>
      </div>

      {blocked ? (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
          Define at least one class and one fee head before importing.
        </p>
      ) : (
        <>
          <label className="flex items-center gap-3 p-3.5 border border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/40 transition">
            <UploadCloud className="w-5 h-5 text-slate-400 shrink-0" />
            <div className="min-w-0">
              <span className="block text-xs font-semibold text-slate-700">
                {fileName || "Choose a CSV file"}
              </span>
              <span className="block text-[11px] text-slate-400">
                Columns: className, feeHeadCode, amount, frequency
              </span>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFile}
              className="hidden"
            />
          </label>

          {parseError && (
            <p className="text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-lg p-3">
              {parseError}
            </p>
          )}

          {rows.length > 0 && !result && (
            <div className="flex items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-xs text-slate-600">
                <strong className="text-slate-900">{rows.length}</strong> rows ready to apply
              </span>
              <button
                type="button"
                onClick={apply}
                disabled={busy}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg bg-[#0F9D58] text-white hover:bg-emerald-700 disabled:opacity-60 transition"
              >
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                {busy ? "Applying…" : "Apply to fee structure"}
              </button>
            </div>
          )}

          {result && result.errors.length === 0 && (
            <p className="text-xs text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              Applied {result.applied} fee structure rows to {sessionName}.
            </p>
          )}

          {result && result.errors.length > 0 && (
            <div className="text-xs text-rose-900 bg-rose-50 border border-rose-200 rounded-lg p-3 space-y-1.5">
              <p className="flex items-center gap-2 font-bold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Nothing was applied — fix these and re-upload:
              </p>
              <ul className="list-disc pl-5 space-y-0.5 max-h-40 overflow-y-auto">
                {result.errors.slice(0, 25).map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
              {result.errors.length > 25 && (
                <p className="text-[11px]">…and {result.errors.length - 25} more.</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
