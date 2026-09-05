"use client";

import { Printer } from "lucide-react";

interface PrintButtonProps {
  label?: string;
  className?: string;
}

export function PrintButton({
  label = "Print TC",
  className = "bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold px-4 py-2 rounded-lg transition flex items-center gap-2 shadow-xs cursor-pointer",
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
