"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Building2, ChevronDown } from "lucide-react";

interface CampusOption {
  id: string;
  code: string;
  name: string;
}

const SINGLE_CAMPUS_PATHS = [
  "/fees/defaulters",
  "/fees/invoices",
  "/fees/structures",
  "/students/new",
  "/notifications",
];

export function CampusSwitcher({ campuses }: { campuses: CampusOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const azadNagar =
    campuses.find((c) => c.code === "AZD" || c.code === "DPSAZD") || campuses[0];
  const requiresOneCampus = SINGLE_CAMPUS_PATHS.some((p) => pathname.startsWith(p));
  const selectedCampusId =
    searchParams.get("campus") ?? (requiresOneCampus ? azadNagar?.id : null);

  const handleCampusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCampusId = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    if (newCampusId && newCampusId !== "ALL") {
      params.set("campus", newCampusId);
    } else {
      params.delete("campus");
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="relative flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-xs transition-colors">
      <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider hidden sm:inline">
        Campus:
      </span>
      <select
        value={selectedCampusId || "ALL"}
        onChange={handleCampusChange}
        aria-label="Select Campus"
        className="text-xs font-medium text-slate-800 dark:text-slate-200 bg-transparent border-none focus:outline-none focus:ring-0 cursor-pointer appearance-none pr-4"
      >
        {!requiresOneCampus && (
          <option value="ALL" className="dark:bg-slate-900">
            All Campuses (Combined)
          </option>
        )}
        {campuses.map((c) => (
          <option key={c.id} value={c.id} className="dark:bg-slate-900">
            {c.name} ({c.code})
          </option>
        ))}
      </select>
      <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 pointer-events-none shrink-0" />
    </div>
  );
}
