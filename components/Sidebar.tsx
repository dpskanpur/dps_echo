"use client";

import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  FileText,
  GraduationCap,
  Layers,
  Receipt,
  AlertTriangle,
  Building2,
  KeyRound,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SidebarLink } from "./SidebarLink";
import { UserPermissions } from "@/lib/permissions";

export function Sidebar({
  userEmail,
  userRole,
  permissions,
}: {
  userEmail?: string;
  userRole?: string;
  permissions?: UserPermissions;
}) {
  const pathname = usePathname();

  const canStudents = permissions?.modules?.students?.canView ?? true;
  const canFees = permissions?.modules?.fees?.canView ?? true;
  const canTc = permissions?.modules?.tc?.canView ?? true;
  const canAlumni = permissions?.modules?.alumni?.canView ?? true;
  const canRbac = (permissions?.modules?.rbac?.canView || permissions?.isAdmin) ?? false;
  const canNotifications = (permissions?.modules?.notifications?.canView || permissions?.isAdmin) ?? false;

  const canUpdateStudents = permissions?.modules?.students?.canUpdate ?? false;
  const canUpdateFees = permissions?.modules?.fees?.canUpdate ?? false;

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 min-h-screen">
      {/* Brand Header — white-on-transparent variant of the ECHO lockup, so
          it sits directly on the dark rail with no panel behind it. The gold
          flame is kept; the greens and wordmark are white. */}
      <div className="p-5 border-b border-slate-800 space-y-2.5">
        <img
          src="/echo-logo-white.png"
          alt="ECHO — DPS Kanpur Portal"
          className="h-10 w-auto object-contain"
        />
        <p className="text-xs text-slate-400 truncate">
          {permissions?.roleDisplayName || "Staff Desk"}
        </p>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
        {/* Overview */}
        <div>
          <div className="px-3 mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Overview
          </div>
          <div className="space-y-1">
            <SidebarLink
                href="/"
                icon={LayoutDashboard}
                label="Dashboard"
                active={pathname === "/"}
              />
          </div>
        </div>

        {/* Student Management */}
        {canStudents && (
          <div>
            <div className="px-3 mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Student Management</span>
              {!canUpdateStudents && (
                <span className="text-[9px] text-amber-400 font-semibold bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-800/40">
                  view only
                </span>
              )}
            </div>
            <div className="space-y-1">
              <SidebarLink
                href="/students"
                icon={Users}
                label="Student Directory"
                active={pathname === "/students"}
              />

              {canUpdateStudents && (
                <>
                  <SidebarLink
                href="/students/new"
                icon={UserPlus}
                label="New Admission"
                active={pathname === "/students/new"}
              />
                </>
              )}

              {canTc && (
                <SidebarLink
                href="/tc"
                icon={FileText}
                label="Transfer Certificate (TC)"
                active={pathname.startsWith("/tc")}
              />
              )}

              {canAlumni && (
                <SidebarLink
                href="/alumni"
                icon={GraduationCap}
                label="Alumni Archive"
                active={pathname.startsWith("/alumni")}
              />
              )}
            </div>
          </div>
        )}

        {/* Fee & Finance */}
        {canFees && (
          <div>
            <div className="px-3 mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Fee & Finance</span>
              {!canUpdateFees && (
                <span className="text-[9px] text-amber-400 font-semibold bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-800/40">
                  view only
                </span>
              )}
            </div>
            <div className="space-y-1">

              <SidebarLink
                href="/fees/structures"
                icon={Layers}
                label="Fee Structures"
                active={pathname.startsWith("/fees/structures")}
              />

              <SidebarLink
                href="/fees/invoices"
                icon={Receipt}
                label={<>Invoices & Ledger</>}
                active={pathname.startsWith("/fees/invoices")}
              />

              <SidebarLink
                href="/fees/defaulters"
                icon={AlertTriangle}
                label={<>Defaulters & Dues</>}
                active={pathname.startsWith("/fees/defaulters")}
              />
            </div>
          </div>
        )}

        {/* Parent Communication */}
        {canNotifications && (
          <div>
            <div className="px-3 mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Parent Communication
            </div>
            <div className="space-y-1">
              <SidebarLink
                href="/notifications"
                icon={Bell}
                label="Notifications"
                active={pathname.startsWith("/notifications")}
              />
            </div>
          </div>
        )}

        {/* Administration & Access */}
        {canRbac && (
          <div>
            <div className="px-3 mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Administration & Access
            </div>
            <div className="space-y-1">
              <SidebarLink
                href="/admin/rbac"
                icon={KeyRound}
                label={<>Admin & System Settings</>}
                active={pathname.startsWith("/admin/rbac") || pathname.startsWith("/campuses")}
              />
            </div>
          </div>
        )}

      </nav>

      {/* Footer Institution Status */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <Building2 className="w-4 h-4 text-[#34A853]" />
          <span className="truncate">DPS Kanpur Group</span>
        </div>
        <div className="mt-1 text-[11px] text-slate-500">
          Session 2025-26 • 4 Campuses
        </div>
      </div>
    </aside>
  );
}
