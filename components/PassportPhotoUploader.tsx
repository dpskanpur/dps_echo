"use client";

import { useState, useRef, ChangeEvent } from "react";
import { Camera, Upload, User, CheckCircle2, AlertCircle, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PassportPhotoUploaderProps {
  value?: string | null;
  onChange?: (url: string | null) => void;
  name?: string;
  studentId?: string;
  required?: boolean;
  className?: string;
}

export function PassportPhotoUploader({
  value,
  onChange,
  name = "photoUrl",
  studentId = "temp-new",
  required = false,
  className,
}: PassportPhotoUploaderProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(value || null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError("Photo size must be under 5MB.");
      return;
    }

    // Immediate preview
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);
    setError(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("studentId", studentId);
      formData.append("targetType", "PHOTO");

      const res = await fetch("/api/v1/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Upload failed");
      }

      setPreviewUrl(data.url);
      onChange?.(data.url);
    } catch (err: any) {
      setError(err?.message || "Failed to upload photo. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    onChange?.(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <input type="hidden" name={name} value={previewUrl || ""} />
      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
        Passport Size Photo {required && <span className="text-red-500">*</span>}
      </label>

      <div className="flex items-start gap-4">
        {/* Photo Container */}
        <div className="relative group">
          <div
            className={cn(
              "w-28 h-36 rounded-lg border-2 border-dashed flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 overflow-hidden relative transition-all shadow-sm",
              previewUrl
                ? "border-emerald-500/80 bg-white"
                : required && !previewUrl
                ? "border-red-400 dark:border-red-500/60 bg-red-50/20"
                : "border-slate-300 dark:border-slate-700 hover:border-dps-gold"
            )}
          >
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Student Passport Photo"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-2 text-slate-400 dark:text-slate-500">
                <User className="w-10 h-10 mb-1 opacity-70" />
                <span className="text-[10px] font-medium leading-tight">
                  3.5 x 4.5 cm
                  <br />
                  Passport Size
                </span>
              </div>
            )}

            {/* Loading Overlay */}
            {uploading && (
              <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs flex flex-col items-center justify-center text-white text-xs gap-1">
                <Loader2 className="w-6 h-6 animate-spin text-dps-gold" />
                <span className="text-[10px]">Uploading...</span>
              </div>
            )}
          </div>

          {/* Remove button */}
          {previewUrl && !uploading && (
            <button
              type="button"
              onClick={handleRemove}
              className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full shadow-md transition-transform hover:scale-110"
              title="Remove photo"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Upload Controls & Instructions */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-slate-900 text-white hover:bg-slate-800 dark:bg-dps-gold dark:text-slate-950 dark:hover:bg-amber-400 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              {previewUrl ? "Change Photo" : "Upload Photo"}
            </button>

            {previewUrl && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" /> Photo Attached
              </span>
            )}
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Upload clear front-facing student passport photo (JPEG/PNG, max 5MB).
          </p>

          {error && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 p-2 rounded border border-red-200 dark:border-red-900">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {required && !previewUrl && (
            <p className="text-[11px] font-medium text-red-500">
              * Mandatory for full admission record.
            </p>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
