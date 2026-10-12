"use client";

import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  FileText,
  GraduationCap,
  Building2,
  KeyRound,
  Bell,
  History,
  Sparkles,
  CreditCard,
  FileSpreadsheet,
  FileCheck,
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
  /* const canFees = permissions?.modules?.fees?.canView ?? true; -- Fee module temporarily disabled */
  const canFees = false;
  const canTc = permissions?.modules?.tc?.canView ?? true;
  
  const userCampusCode = (permissions?.campusCode || "").toUpperCase();
  const isJuniorCampus = userCampusCode === "DPSKID" || userCampusCode === "KID" || userCampusCode === "DPSSRV" || userCampusCode === "SRV";
  const canAlumni = (permissions?.modules?.alumni?.canView ?? true) && (!isJuniorCampus || permissions?.isAdmin);

  const canRbac = (permissions?.modules?.rbac?.canView || permissions?.isAdmin) ?? false;
  const canAudit = (permissions?.modules?.audit?.canView || permissions?.modules?.rbac?.canView || permissions?.isAdmin) ?? false;
  const canNotifications = (permissions?.modules?.notifications?.canView || permissions?.isAdmin) ?? false;

  const canUpdateStudents = permissions?.modules?.students?.canUpdate ?? false;
  /* const canUpdateFees = permissions?.modules?.fees?.canUpdate ?? false; -- Fee module temporarily disabled */
  const canUpdateFees = false;

  return (
    <aside className="w-[220px] bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 flex flex-col shrink-0 border-r border-slate-200 dark:border-slate-800 min-h-screen select-none">
      {/* Brand Header (h-[48px] ERP utility height) */}
      <div className="h-[48px] flex items-center justify-between px-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-bold text-xs flex items-center justify-center">
            E
          </div>
          <span className="font-semibold text-xs tracking-tight text-slate-900 dark:text-white">
            DPS ECHO
          </span>
        </div>
        <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-500">
          ERP
        </span>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 px-2 py-3 space-y-4 overflow-y-auto">
        {/* Main / Overview */}
        <div>
          <div className="px-2 mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Overview
          </div>
          <div className="space-y-0.5">
            <SidebarLink
              href="/"
              icon={LayoutDashboard}
              label="Dashboard"
              active={pathname === "/"}
            />
          </div>
        </div>

        {/* Student Management / Operations */}
        {canStudents && (
          <div>
            <div className="px-2 mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Operations</span>
              {!canUpdateStudents && (
                <span className="text-[9px] text-slate-400 font-mono">
                  read-only
                </span>
              )}
            </div>
            <div className="space-y-0.5">
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

        {/* Fee & Finance - TEMPORARILY DISABLED */}
        {/*
        {canFees && (
          <div>
            <div className="px-2 mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Fees &amp; Billing</span>
              {!canUpdateFees && (
                <span className="text-[9px] text-slate-400 font-mono">
                  read-only
                </span>
              )}
            </div>
            <div className="space-y-0.5">
              <SidebarLink
                href="/fees/demands"
                icon={FileSpreadsheet}
                label="Quarterly Demands"
                active={pathname.startsWith("/fees/demands")}
              />

              <SidebarLink
                href="/fees/online-payments"
                icon={FileCheck}
                label="Online Paid Receipts"
                active={pathname.startsWith("/fees/online-payments")}
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
        */}

        {/* Communication */}
        {canNotifications && (
          <div>
            <div className="px-2 mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Communication
            </div>
            <div className="space-y-0.5">
              <SidebarLink
                href="/notifications"
                icon={Bell}
                label="Notifications"
                active={pathname.startsWith("/notifications")}
              />
            </div>
          </div>
        )}

        {/* Administration */}
        {(canRbac || canAudit) && (
          <div>
            <div className="px-2 mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Administration
            </div>
            <div className="space-y-0.5">
              {canRbac && (
                <SidebarLink
                  href="/admin/rbac"
                  icon={KeyRound}
                  label="Settings"
                  active={pathname.startsWith("/admin/rbac") || pathname.startsWith("/campuses")}
                />
              )}
              {canAudit && (
                <SidebarLink
                  href="/admin/audit-logs"
                  icon={History}
                  label="Audit Logs"
                  active={pathname.startsWith("/admin/audit-logs")}
                />
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Footer Info */}
      <div className="px-3 py-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60">
        <div className="flex items-center gap-1.5 text-xs text-slate-800 dark:text-slate-200 font-semibold truncate">
          <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="truncate">DPS Kanpur Group</span>
        </div>
        <div className="mt-0.5 text-[10px] font-mono text-slate-400">
          v2.4.0 • 4 Campuses
        </div>
      </div>
    </aside>
  );
}
