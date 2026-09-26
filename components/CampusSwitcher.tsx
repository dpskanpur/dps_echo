"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Building2 } from "lucide-react";

interface CampusOption {
  id: string;
  code: string;
  name: string;
}

/**
 * Pages whose records belong to exactly one campus. Fee structures, fee heads
 * and admissions are defined per school, so a combined view would show one
 * campus's data under a label claiming to show all of them.
 */
const SINGLE_CAMPUS_PATHS = ["/fees/structures", "/students/new", "/notifications"];

export function CampusSwitcher({ campuses }: { campuses: CampusOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const requiresOneCampus = SINGLE_CAMPUS_PATHS.some((p) => pathname.startsWith(p));
  const selectedCampusId =
    searchParams.get("campus") ?? (requiresOneCampus ? campuses[0]?.id : null);

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
    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm">
      <Building2 className="w-4 h-4 text-emerald-700" />
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Campus:</span>
      <select
        value={selectedCampusId || "ALL"}
        onChange={handleCampusChange}
        aria-label="Select Campus"
        className="text-sm font-semibold text-slate-800 bg-transparent border-none focus:outline-none focus:ring-0 cursor-pointer pr-4"
      >
        {!requiresOneCampus && <option value="ALL">🏢 All Campuses (Combined)</option>}
        {campuses.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} ({c.code})
          </option>
        ))}
      </select>
    </div>
  );
}
