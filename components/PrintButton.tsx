"use client";

import { Printer } from "lucide-react";

interface PrintButtonProps {
  label?: string;
  className?: string;
}

export function PrintButton({
  label = "Print TC",
  className = "bg-emerald-700 hover:bg-emerald-600 active:scale-[0.98] text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all flex items-center gap-2 shadow-2xs cursor-pointer",
}: PrintButtonProps) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={className}
    >
      <Printer className="w-4 h-4" />
      <span>{label}</span>
    </button>
  );
}
