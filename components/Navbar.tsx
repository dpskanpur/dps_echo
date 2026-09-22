import { Suspense } from "react";
import { CampusSwitcher } from "./CampusSwitcher";
import { SessionSwitcher } from "./SessionSwitcher";
import { ThemeSwitcher } from "./ThemeSwitcher";
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
    <header className="sticky top-0 z-10 flex w-full bg-white dark:bg-boxdark drop-shadow-1 border-b border-stroke dark:border-strokedark px-4 py-3 md:px-6 2xl:px-11 items-center justify-between">
      {/* Campus Selector & Academic Year */}
      <div className="flex items-center gap-3 md:gap-4">
        <Suspense fallback={<div className="h-8 w-44 bg-whiten dark:bg-meta-4 rounded-sm animate-pulse" />}>
          <CampusSwitcher campuses={campuses} />
        </Suspense>
        <Suspense fallback={<div className="h-8 w-40 bg-whiten dark:bg-meta-4 rounded-sm animate-pulse" />}>
          <SessionSwitcher sessions={sessions} />
        </Suspense>

        {/* Public portals */}
        <div className="hidden sm:flex items-center gap-1.5 pl-3 border-l border-stroke dark:border-strokedark">
          {PUBLIC_PORTALS.map((portal) => (
            <a
              key={portal.href}
              href={portal.href}
              target="_blank"
              rel="noopener noreferrer"
              title={`${portal.label} (opens in a new tab)`}
              aria-label={`${portal.label} — public page, opens in a new tab`}
              className="w-8 h-8 rounded-sm flex items-center justify-center text-body hover:text-dps-green dark:text-bodydark dark:hover:text-white hover:bg-whiten dark:hover:bg-meta-4 transition"
            >
              <portal.icon className="w-4 h-4" />
            </a>
          ))}
        </div>
      </div>

      {/* Right User, Theme Switcher & Quick Search */}
      <div className="flex items-center gap-3 md:gap-4">
        <div className="relative hidden lg:block w-56">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-body dark:text-bodydark" />
          <input
            type="text"
            placeholder="Quick search student or TC..."
            className="w-full bg-whiten dark:bg-form-input text-xs border border-stroke dark:border-strokedark rounded-sm pl-9 pr-3 py-2 text-black dark:text-white placeholder-body dark:placeholder-bodydark focus:outline-none focus:border-dps-green dark:focus:border-dps-gold"
          />
        </div>

        {/* Dark Mode Theme Switcher */}
        <ThemeSwitcher />

        {/* Staff Profile Badge */}
        <div className="flex items-center gap-3 pl-3 border-l border-stroke dark:border-strokedark">
          <div className="w-8 h-8 rounded-full bg-dps-green text-white flex items-center justify-center font-bold text-xs shadow-xs">
            {initials}
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-bold text-black dark:text-white leading-tight truncate max-w-[140px]">{userName}</div>
            <div className="text-[10px] text-dps-green dark:text-dps-gold font-semibold flex items-center gap-1 font-mono">
              <Shield className="w-2.5 h-2.5" /> {userRole}
            </div>
          </div>

          <a
            href="/api/auth/logout"
            title="Sign out of DPS Echo"
            className="p-1.5 text-body hover:text-meta-1 hover:bg-whiten dark:text-bodydark dark:hover:bg-meta-4 rounded-sm transition"
          >
            <LogOut className="w-4 h-4" />
          </a>
        </div>
      </div>
    </header>
  );
}
