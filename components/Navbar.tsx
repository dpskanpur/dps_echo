import { Suspense } from "react";
import { CampusSwitcher } from "./CampusSwitcher";
import { SessionSwitcher } from "./SessionSwitcher";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { BreadcrumbTrail } from "./BreadcrumbTrail";
import { listAcademicSessions } from "@/lib/academic-session";
import { Search, LogOut, Bell, Shield, UserPlus, QrCode } from "lucide-react";
import Link from "next/link";
import { UserPermissions } from "@/lib/permissions";

/** Parent-facing pages, reachable from the staff header as icons. */
const PUBLIC_PORTALS = [
  { href: "/public-registration", label: "Online Registration", icon: UserPlus },
  /* { href: "/pay", label: "Quick Pay Fees" }, -- Fee module temporarily disabled */
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
  let sessions: SessionOption[] = [];
  try {
    sessions = await listAcademicSessions();
  } catch {
    // Fail safe
  }

  const userName = user?.name || "DPS Staff";
  const userRole = permissions?.roleDisplayName || user?.role || "ADMIN";
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-20 flex h-[48px] w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 md:px-4 items-center justify-between select-none">
      {/* Left: Campus & Session Selectors + Breadcrumb Trail */}
      <div className="flex items-center gap-2.5 min-w-0">
        <Suspense fallback={<div className="h-7 w-32 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />}>
          <CampusSwitcher campuses={campuses} />
        </Suspense>
        <Suspense fallback={<div className="h-7 w-28 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />}>
          <SessionSwitcher sessions={sessions} />
        </Suspense>

        <div className="hidden xl:block h-4 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1" />
        <BreadcrumbTrail />
      </div>

      {/* Right Utility: Global Command Search + PROD badge + Notifications + Profile */}
      <div className="flex items-center gap-2">
        {/* Global Command Search (Cmd + K) Trigger */}
        <div className="hidden md:flex items-center gap-2 h-7 px-2.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs text-slate-400 w-48 justify-between cursor-pointer hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
          <div className="flex items-center gap-1.5 truncate">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">Quick search...</span>
          </div>
          <kbd className="font-mono text-[10px] text-slate-400 bg-white dark:bg-slate-900 px-1 py-0.2 rounded border border-slate-200 dark:border-slate-700">
            ⌘K
          </kbd>
        </div>

        {/* Environment Badge */}
        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-slate-200 text-slate-600 bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">
          PROD
        </span>

        {/* Public portal quick links */}
        <div className="hidden sm:flex items-center gap-1">
          {PUBLIC_PORTALS.map((portal) => (
            <a
              key={portal.href}
              href={portal.href}
              target="_blank"
              rel="noopener noreferrer"
              title={`${portal.label} (new tab)`}
              aria-label={portal.label}
              className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              <portal.icon className="w-3.5 h-3.5" />
            </a>
          ))}
        </div>

        {/* Notification Bell */}
        <Link
          href="/notifications"
          title="Notifications"
          className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors relative"
        >
          <Bell className="w-3.5 h-3.5" />
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 absolute top-1.5 right-1.5" />
        </Link>

        {/* Theme Switcher */}
        <ThemeSwitcher />

        <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800 mx-0.5" />

        {/* User Profile Trigger */}
        <div className="flex items-center gap-2 pl-1">
          <div className="w-7 h-7 rounded bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 flex items-center justify-center font-bold text-xs select-none">
            {initials}
          </div>
          <div className="hidden sm:block text-left leading-none">
            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[110px]">
              {userName}
            </div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
              {userRole}
            </div>
          </div>

          <a
            href="/api/auth/logout"
            title="Sign out of ERP"
            aria-label="Sign out"
            className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </header>
  );
}
