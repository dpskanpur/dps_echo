"use client";

import { Printer } from "lucide-react";

export function PrintReportButton({ label = "Export PDF Report" }: { label?: string }) {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition cursor-pointer print:hidden"
    >
      <Printer className="w-4 h-4" />
      <span>{label}</span>
    </button>
  );
}
