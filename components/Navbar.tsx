import { Suspense } from "react";
import { CampusSwitcher } from "./CampusSwitcher";
import { SessionSwitcher } from "./SessionSwitcher";
import { listAcademicSessions } from "@/lib/academic-session";
import { Search, UserCheck, LogOut, Shield, UserPlus, CreditCard, QrCode } from "lucide-react";
import Link from "next/link";
import { UserPermissions } from "@/lib/permissions";

/** Parent-facing pages, reachable from the staff header as icons. */
const PUBLIC_PORTALS = [
  { href: "/public-registration", label: "Online Registration", icon: UserPlus },
  { href: "/pay", label: "Quick Pay Fees", icon: CreditCard },
  { href: "/verify-tc", label: "Verify TC (QR)", icon: QrCode },
] as const;

interface CampusOption {
  id: string;
  code: string;
  name: string;
}

interface SessionOption {
  id: string;
  name: string;
  isCurrent: boolean;
}

interface UserInfo {
  name?: string;
  email?: string;
  role?: string;
}

export async function Navbar({
  campuses,
  user,
  permissions,
}: {
  campuses: CampusOption[];
  user?: UserInfo;
  permissions?: UserPermissions;
}) {
  // The switcher reads the selected value from the URL itself.
  let sessions: SessionOption[] = [];
  try {
    sessions = await listAcademicSessions();
  } catch {
    // A session list failure must not take the whole shell down.
  }

  const userName = user?.name || "DPS Staff";
  const userRole = permissions?.roleDisplayName || user?.role || "ADMIN";
  const userEmail = user?.email || "admin@dpskanpur.com";
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-10 shadow-xs">
      {/* Campus Selector & Academic Year */}
      <div className="flex items-center gap-4">
        <Suspense fallback={<div className="h-8 w-44 bg-slate-100 rounded-lg animate-pulse" />}>
          <CampusSwitcher campuses={campuses} />
        </Suspense>
        <Suspense fallback={<div className="h-8 w-40 bg-slate-100 rounded-lg animate-pulse" />}>
          <SessionSwitcher sessions={sessions} />
        </Suspense>

        {/* Public portals — icon only. These open the parent-facing pages in a
            new tab, so they never interrupt whatever staff are working on.
            title/aria-label carry the meaning the labels used to. */}
        <div className="hidden sm:flex items-center gap-1 pl-3 border-l border-slate-200">
          {PUBLIC_PORTALS.map((portal) => (
            <a
              key={portal.href}
              href={portal.href}
              target="_blank"
              rel="noopener noreferrer"
              title={`${portal.label} (opens in a new tab)`}
              aria-label={`${portal.label} — public page, opens in a new tab`}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-emerald-800 hover:bg-emerald-50 transition"
            >
              <portal.icon className="w-4 h-4" />
            </a>
          ))}
        </div>
      </div>

      {/* Right User & Quick Search */}
      <div className="flex items-center gap-3">
        <div className="relative hidden lg:block w-56">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Quick search student or TC..."
            className="w-full bg-slate-50 text-xs border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
          />
        </div>

        {/* Staff Profile Badge */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-emerald-800 text-white flex items-center justify-center font-bold text-xs shadow-xs">
            {initials}
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[140px]">{userName}</div>
            <div className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1 font-mono">
              <Shield className="w-2.5 h-2.5 text-emerald-600" /> {userRole}
            </div>
          </div>

          <a
            href="/api/auth/logout"
            title="Sign out of DPS Echo"
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" />
          </a>
        </div>
      </div>
    </header>
  );
}
