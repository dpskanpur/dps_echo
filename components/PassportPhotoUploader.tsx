"use client";

import { useState, useRef, ChangeEvent } from "react";
import { Upload, User, CheckCircle2, AlertCircle, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PassportPhotoUploaderProps {
  value?: string | null;
  onChange?: (url: string | null) => void;
  name?: string;
  studentId?: string;
  employeeId?: string;
  required?: boolean;
  className?: string;
  layout?: "horizontal" | "vertical" | "auto";
  label?: string;
  helperText?: string;
}

export function PassportPhotoUploader({
  value,
  onChange,
  name = "photoUrl",
  studentId = "temp-new",
  employeeId,
  required = false,
  className,
  layout = "auto",
  label = "Passport Size Photo",
  helperText,
}: PassportPhotoUploaderProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(value || null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isVertical = layout === "vertical";
  const defaultHelper = employeeId
    ? "Upload clear front-facing staff photo (JPEG/PNG, max 5MB)."
    : "Upload clear front-facing student passport photo (JPEG/PNG, max 5MB).";
  const helper = helperText || defaultHelper;

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
      if (employeeId) {
        formData.append("employeeId", employeeId);
      } else {
        formData.append("studentId", studentId);
      }
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
    <div className={cn("space-y-2 w-full", className)}>
      <input type="hidden" name={name} value={previewUrl || ""} />
      <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      <div
        className={cn(
          isVertical
            ? "flex flex-col items-center text-center p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 gap-3 w-full"
            : "flex flex-col sm:flex-row items-start gap-4 w-full min-w-0"
        )}
      >
        {/* Photo Container */}
        <div className="relative group shrink-0">
          <div
            className={cn(
              "w-28 h-36 rounded-xl border-2 border-dashed flex flex-col items-center justify-center bg-white dark:bg-slate-900 overflow-hidden relative transition-all shadow-xs",
              previewUrl
                ? "border-emerald-500/80"
                : required && !previewUrl
                ? "border-red-400 dark:border-red-500/60 bg-red-50/20"
                : "border-slate-300 dark:border-slate-700 hover:border-emerald-500/60"
            )}
          >
            {previewUrl ? (
              <img
                src={previewUrl}
                alt={label}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-2 text-slate-400 dark:text-slate-500">
                <User className="w-9 h-9 mb-1 opacity-60" />
                <span className="text-[10px] font-medium leading-tight">
                  3.5 x 4.5 cm
                  <br />
                  Passport Photo
                </span>
              </div>
            )}

            {/* Loading Overlay */}
            {uploading && (
              <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex flex-col items-center justify-center text-white text-xs gap-1">
                <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                <span className="text-[10px] font-semibold">Uploading...</span>
              </div>
            )}
          </div>

          {/* Remove button */}
          {previewUrl && !uploading && (
            <button
              type="button"
              onClick={handleRemove}
              className="absolute -top-1.5 -right-1.5 bg-rose-500 hover:bg-rose-600 text-white p-1 rounded-full shadow-md transition-transform hover:scale-110 cursor-pointer"
              title="Remove photo"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Upload Controls & Instructions */}
        <div
          className={cn(
            "space-y-1.5 min-w-0",
            isVertical ? "w-full flex flex-col items-center text-center" : "flex-1"
          )}
        >
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              {previewUrl ? "Change Photo" : "Upload Photo"}
            </button>

            {previewUrl && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-3 h-3" /> Attached
              </span>
            )}
          </div>

          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal max-w-[220px]">
            {helper}
          </p>

          {error && (
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-2 rounded-xl border border-rose-200 dark:border-rose-900">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {required && !previewUrl && (
            <p className="text-[10px] font-medium text-rose-500">
              * Mandatory photo.
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
