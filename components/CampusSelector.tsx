"use client";

import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";

export function CampusSelector({
  campuses,
  selectedCampusId,
  mode = "registration",
  baseUrl,
  showFee = false,
}: {
  campuses: { id: string; name: string; code: string; registrationFee?: number }[];
  selectedCampusId: string;
  mode?: string;
  baseUrl?: string;
  showFee?: boolean;
}) {
  const router = useRouter();

  return (
    <div className="relative">
      <select
        value={selectedCampusId}
        onChange={(e) => {
          const campusId = e.target.value;
          if (baseUrl) {
            router.push(`${baseUrl}?campus=${campusId}`);
          } else {
            router.push(`/students/new?campus=${campusId}&mode=${mode}`);
          }
        }}
        className="w-full appearance-none bg-slate-50/50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-xl pl-3 pr-9 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 dark:focus:border-emerald-500 cursor-pointer shadow-2xs transition-all"
      >
        {campuses.map((c) => (
          <option key={c.id} value={c.id} className="dark:bg-slate-900 text-slate-900 dark:text-white py-1">
            {c.name} ({c.code})
            {showFee && c.registrationFee ? ` — Fee: ₹${c.registrationFee.toLocaleString("en-IN")}` : ""}
          </option>
        ))}
      </select>
      <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none shrink-0" />
    </div>
  );
}
