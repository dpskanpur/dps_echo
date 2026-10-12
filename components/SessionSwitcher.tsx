"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { CalendarDays, ChevronDown } from "lucide-react";

interface SessionOption {
  id: string;
  name: string;
  isCurrent: boolean;
}

export function SessionSwitcher({ sessions }: { sessions: SessionOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
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
    <div className="relative hidden md:flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-xs transition-colors">
      <CalendarDays className="w-3.5 h-3.5 text-slate-500 shrink-0" />
      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
        Session:
      </span>
      <select
        value={selectedSession || "ALL"}
        onChange={handleChange}
        aria-label="Select academic session"
        className="text-xs font-medium text-slate-800 dark:text-slate-200 bg-transparent border-none focus:outline-none focus:ring-0 cursor-pointer appearance-none pr-4"
      >
        <option value="ALL" className="dark:bg-slate-900">
          All Sessions
        </option>
        {sessions.map((s) => (
          <option key={s.id} value={s.name} className="dark:bg-slate-900">
            {s.name}
            {s.isCurrent ? " (active)" : ""}
          </option>
        ))}
      </select>
      <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 pointer-events-none shrink-0" />
    </div>
  );
}
