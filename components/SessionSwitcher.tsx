"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { CalendarDays } from "lucide-react";

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
  // No ?session= means the current session, not every session at once —
  // a school works in one session at a time.
  const currentName = sessions.find((s) => s.isCurrent)?.name;
  const selectedSession = searchParams.get("session") || currentName || "ALL";

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    if (next && next !== "ALL") {
      params.set("session", next);
    } else {
      params.delete("session");
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  return (
    <div className="hidden md:flex items-center gap-2 bg-slate-50 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 rounded-xl px-3 py-1.5 shadow-2xs transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-700">
      <CalendarDays className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Session:</span>
      <select
        value={selectedSession || "ALL"}
        onChange={handleChange}
        aria-label="Select academic session"
        className="text-xs font-bold text-slate-800 dark:text-slate-200 bg-transparent border-none focus:outline-none focus:ring-0 cursor-pointer pr-3"
      >
        <option value="ALL" className="dark:bg-slate-900">All Sessions</option>
        {sessions.map((s) => (
          <option key={s.id} value={s.name} className="dark:bg-slate-900">
            {s.name}
            {s.isCurrent ? " (current)" : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
