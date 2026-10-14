"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { CalendarDays, ChevronDown } from "lucide-react";
import { getSessionCategory } from "@/lib/session-utils";

interface SessionOption {
  id: string;
  name: string;
  isCurrent: boolean;
}

/**
 * Per-user view filter. Changing it only narrows what this user sees — the
 * session new records are stamped with is set separately in Admin settings
 * and requires the `sessions` permission.
 */
export function SessionSwitcher({ sessions }: { sessions: SessionOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Active sessions in the portal: Current (ongoing) and Upcoming (advance admissions)
  const activeSessions = sessions
    .filter((s) => {
      const cat = getSessionCategory(s.name);
      return cat === "CURRENT" || cat === "UPCOMING";
    })
    .sort((a, b) => {
      const ya = parseInt(a.name.match(/^(\d{4})/)?.[1] || "0", 10);
      const yb = parseInt(b.name.match(/^(\d{4})/)?.[1] || "0", 10);
      return ya - yb;
    });

  const currentMatch =
    activeSessions.find((s) => getSessionCategory(s.name) === "CURRENT") ||
    activeSessions[0];

  const currentName = currentMatch?.name;
  const rawSelected = searchParams.get("session");
  const selectedSession =
    rawSelected && activeSessions.some((s) => s.name === rawSelected)
      ? rawSelected
      : currentName || "";

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    if (next) {
      params.set("session", next);
    } else {
      params.delete("session");
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  const getSessionLabel = (name: string) => {
    const cat = getSessionCategory(name);
    if (cat === "CURRENT") return `${name} (Current)`;
    if (cat === "UPCOMING") return `${name} (Upcoming)`;
    if (cat === "FUTURE") return `${name} (Future)`;
    return `${name} (Past)`;
  };

  if (activeSessions.length === 0) {
    return null;
  }

  return (
    <div className="relative hidden md:flex items-center gap-2 bg-slate-50/60 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-xl px-3 py-1.5 shadow-2xs transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-700">
      <CalendarDays className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
      <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Session:</span>
      <select
        value={selectedSession}
        onChange={handleChange}
        aria-label="Select academic session"
        className="text-xs font-semibold text-slate-800 dark:text-slate-200 bg-transparent border-none focus:outline-none focus:ring-0 cursor-pointer appearance-none pr-5"
      >
        {activeSessions.map((s) => (
          <option key={s.id} value={s.name} className="dark:bg-slate-900">
            {getSessionLabel(s.name)}
          </option>
        ))}
      </select>
      <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute right-2 pointer-events-none shrink-0" />
    </div>
  );
}
