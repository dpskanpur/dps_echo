"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, Trash2, ExternalLink, Loader2, ShieldCheck } from "lucide-react";
import { deleteEmployeeDocument } from "@/lib/employee-actions";

interface EmployeeDocItem {
  id: string;
  docType: string;
  title: string;
  fileName: string;
  fileUrl: string;
  fileSize: string | null;
  uploadedAt: Date | string;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  AADHAAR_PAN: "Aadhaar / PAN ID Proof",
  DEGREE_BED: "Academic & B.Ed. / CTET Certificates",
  APPOINTMENT_LETTER: "Appointment / Confirmation Letter",
  POLICE_VERIFICATION: "Police Verification Report",
  EXPERIENCE_CERT: "Prior Experience / Relieving Letter",
  OTHER: "Other HR Document",
};

export function EmployeeDocumentSection({
  employeeId,
  documents,
  canEdit,
}: {
  employeeId: string;
  documents: EmployeeDocItem[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [docType, setDocType] = useState("AADHAAR_PAN");
  const [title, setTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("employeeId", employeeId);
      formData.append("targetType", "DOCUMENT");
      formData.append("docType", docType);
      formData.append("title", title.trim() || DOC_TYPE_LABELS[docType] || docType);

      const res = await fetch("/api/v1/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setTitle("");
      e.target.value = "";
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "Failed to upload document.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(docId: string, docTitle: string) {
    if (!confirm(`Delete document "${docTitle}"?`)) return;
    await deleteEmployeeDocument(docId, employeeId);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {canEdit && (
        <div className="bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                Upload Staff Verification / HR Document
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Supported formats: PDF, JPG, PNG, WEBP (Max 10 MB per document)
              </p>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <ShieldCheck className="w-3.5 h-3.5" />
              Encrypted Vault
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                Document Category
              </label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200"
              >
                {Object.entries(DOC_TYPE_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                Custom Label / Remarks (Optional)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., B.Ed. Degree - Kanpur University"
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200"
              />
            </div>

            <div className="flex items-end">
              <label className="w-full inline-flex items-center justify-center gap-2 bg-[#0F9D58] hover:bg-[#0d8a4d] text-white px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer shadow-xs">
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Select File &amp; Upload</span>
                  </>
                )}
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  disabled={uploading}
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {error && (
            <p className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-3 py-2 rounded-xl">
              {error}
            </p>
          )}
        </div>
      )}

      {/* Document List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {documents.length === 0 ? (
          <div className="col-span-full py-12 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400">
            <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
            <p className="text-xs font-semibold">No HR or verification documents uploaded yet.</p>
          </div>
        ) : (
          documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-boxdark hover:border-emerald-500/40 transition"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{doc.title}</p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {DOC_TYPE_LABELS[doc.docType] || doc.docType} • {doc.fileSize || "Document"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 ml-3">
                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-slate-600 dark:text-slate-300 hover:text-emerald-700 transition"
                  title="View / Download Document"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => handleDelete(doc.id, doc.title)}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/60 text-slate-500 hover:text-rose-600 transition cursor-pointer"
                    title="Delete Document"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
