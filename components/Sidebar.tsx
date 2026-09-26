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
  History,
  Sparkles,
  CreditCard,
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
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 dark:border-strokedark dark:bg-boxdark min-h-screen">
      {/* Brand Header */}
      <div className="flex items-center justify-between gap-2 px-6 py-5.5 border-b border-slate-800 dark:border-strokedark">
        <div className="space-y-1">
          <img
            src="/echo-logo-white.png"
            alt="ECHO — DPS Kanpur Portal"
            className="h-9 w-auto object-contain"
          />
          <p className="text-[11px] font-medium text-slate-400 dark:text-bodydark truncate">
            {permissions?.roleDisplayName || "Staff Desk"}
          </p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-4 space-y-6 overflow-y-auto">
        {/* Overview */}
        <div>
          <h3 className="px-4 mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-bodydark2">
            Overview
          </h3>
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
            <div className="px-4 mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-bodydark2 flex items-center justify-between">
              <span>Students</span>
              {!canUpdateStudents && (
                <span className="text-[9px] text-amber-400 font-semibold bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/40">
                  view only
                </span>
              )}
            </div>
            <div className="space-y-1">
              <SidebarLink
                href="/students"
                icon={Users}
                label="Directory"
                active={pathname === "/students"}
              />

              {canUpdateStudents && (
                <>
                  <SidebarLink
                    href="/students/new"
                    icon={UserPlus}
                    label="Admissions"
                    active={pathname === "/students/new"}
                  />
                  <SidebarLink
                    href="/students/promotion"
                    icon={Sparkles}
                    label="Promotions"
                    active={pathname === "/students/promotion"}
                  />
                </>
              )}

              {canTc && (
                <SidebarLink
                  href="/tc"
                  icon={FileText}
                  label="Certificates"
                  active={pathname.startsWith("/tc")}
                />
              )}

              {canAlumni && (
                <SidebarLink
                  href="/alumni"
                  icon={GraduationCap}
                  label="Alumni"
                  active={pathname.startsWith("/alumni")}
                />
              )}
            </div>
          </div>
        )}

        {/* Fee & Finance */}
        {canFees && (
          <div>
            <div className="px-4 mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-bodydark2 flex items-center justify-between">
              <span>Fees</span>
              {!canUpdateFees && (
                <span className="text-[9px] text-amber-400 font-semibold bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/40">
                  view only
                </span>
              )}
            </div>
            <div className="space-y-1">
              <SidebarLink
                href="/fees/structures"
                icon={Layers}
                label="Structures"
                active={pathname.startsWith("/fees/structures")}
              />

              <SidebarLink
                href="/fees/invoices"
                icon={Receipt}
                label="Invoices"
                active={pathname.startsWith("/fees/invoices")}
              />

              <SidebarLink
                href="/fees/defaulters"
                icon={AlertTriangle}
                label="Defaulters"
                active={pathname.startsWith("/fees/defaulters")}
              />

              <SidebarLink
                href="/fees/razorpay"
                icon={CreditCard}
                label="Razorpay Settings"
                active={pathname.startsWith("/fees/razorpay")}
              />
            </div>
          </div>
        )}

        {/* Parent Communication */}
        {canNotifications && (
          <div>
            <h3 className="px-4 mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-bodydark2">
              Communication
            </h3>
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
            <h3 className="px-4 mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-bodydark2">
              Administration
            </h3>
            <div className="space-y-1">
              <SidebarLink
                href="/admin/rbac"
                icon={KeyRound}
                label="Settings"
                active={pathname.startsWith("/admin/rbac") || pathname.startsWith("/campuses")}
              />
              <SidebarLink
                href="/admin/audit-logs"
                icon={History}
                label="Audit"
                active={pathname.startsWith("/admin/audit-logs")}
              />
            </div>
          </div>
        )}
      </nav>

      {/* Footer Status */}
      <div className="p-4.5 border-t border-slate-800 dark:border-strokedark bg-slate-950/40 dark:bg-boxdark-2">
        <div className="flex items-center gap-2 text-xs text-slate-300 font-medium">
          <Building2 className="w-4 h-4 text-dps-gold" />
          <span className="truncate">DPS Kanpur Group</span>
        </div>
        <div className="mt-1 text-[11px] text-slate-400 dark:text-bodydark2">
          Session 2025-26 • 4 Campuses
        </div>
      </div>
    </aside>
  );
}
