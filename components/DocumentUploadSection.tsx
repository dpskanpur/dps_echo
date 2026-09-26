"use client";

import { useState, useRef, ChangeEvent } from "react";
import { FileText, Upload, CheckCircle2, AlertCircle, Loader2, ExternalLink, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

import { useRouter } from "next/navigation";

export interface StudentDocItem {
  id?: string;
  docType: string;
  title: string;
  fileName: string;
  fileUrl: string;
  fileSize?: string | null;
}

const DOCUMENT_CATEGORIES = [
  { type: "BIRTH_CERTIFICATE", label: "Birth Certificate" },
  { type: "AADHAAR_CARD", label: "Aadhaar Card (Student/Parent)" },
  { type: "PREVIOUS_MARKSHEET", label: "Previous School Marksheet" },
  { type: "TRANSFER_CERTIFICATE", label: "Transfer Certificate (TC)" },
  { type: "CASTE_CERTIFICATE", label: "Caste / Category Certificate" },
  { type: "IMMUNIZATION_RECORD", label: "Medical / Immunization Record" },
];

interface DocumentUploadSectionProps {
  studentId?: string;
  documents: StudentDocItem[];
  onChange?: (updatedDocs: StudentDocItem[]) => void;
  readOnly?: boolean;
}

export function DocumentUploadSection({
  studentId = "temp-new",
  documents = [],
  onChange,
  readOnly = false,
}: DocumentUploadSectionProps) {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState(DOCUMENT_CATEGORIES[0].type);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError("Document size must be under 10MB.");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const selectedCategory = DOCUMENT_CATEGORIES.find((c) => c.type === selectedType);
      const title = selectedCategory?.label || selectedType;

      const formData = new FormData();
      formData.append("file", file);
      formData.append("studentId", studentId);
      formData.append("targetType", "DOCUMENT");
      formData.append("docType", selectedType);
      formData.append("title", title);

      const res = await fetch("/api/v1/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Document upload failed");
      }

      const newDoc: StudentDocItem = {
        id: data.documentId || `temp-${Date.now()}`,
        docType: selectedType,
        title,
        fileName: file.name,
        fileUrl: data.url,
        fileSize: data.fileSize,
      };

      const updated = [...documents, newDoc];
      if (onChange) {
        onChange(updated);
      } else {
        router.refresh();
      }
    } catch (err: any) {
      setError(err?.message || "Failed to upload document.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = (index: number) => {
    const updated = documents.filter((_, i) => i !== index);
    if (onChange) {
      onChange(updated);
    } else {
      router.refresh();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-dps-gold" />
          Admission Documents & Certificates
        </h4>
        <span className="text-xs text-slate-500 font-medium">
          {documents.length} document(s) attached
        </span>
      </div>

      {!readOnly && (
        <div className="bg-slate-50 dark:bg-slate-900 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex-1">
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Select Document Category
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-dps-gold/50"
              >
                {DOCUMENT_CATEGORIES.map((cat) => (
                  <option key={cat.type} value={cat.type}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-md bg-slate-900 text-white hover:bg-slate-800 dark:bg-dps-gold dark:text-slate-950 dark:hover:bg-amber-400 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    Upload File
                  </>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 p-2 rounded border border-red-200 dark:border-red-900">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileSelected}
          />
        </div>
      )}

      {/* Document List */}
      {documents.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {documents.map((doc, idx) => (
            <div
              key={doc.id || idx}
              className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="p-2 rounded bg-slate-100 dark:bg-slate-800 text-dps-gold shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                    {doc.title || doc.docType}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {doc.fileName} {doc.fileSize ? `• ${doc.fileSize}` : ""}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0 ml-2">
                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                  title="View / Download Document"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => handleRemove(idx)}
                    className="p-1.5 rounded text-red-400 hover:text-red-600 transition-colors"
                    title="Delete document"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
          <p className="text-xs text-slate-400">No admission documents attached yet.</p>
        </div>
      )}
    </div>
  );
}
