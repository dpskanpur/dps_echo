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
  const canFees = permissions?.modules?.fees?.canView ?? true;
  const canTc = permissions?.modules?.tc?.canView ?? true;
  
  const userCampusCode = (permissions?.campusCode || "").toUpperCase();
  const isJuniorCampus = userCampusCode === "DPSKID" || userCampusCode === "KID" || userCampusCode === "DPSSRV" || userCampusCode === "SRV";
  const canAlumni = (permissions?.modules?.alumni?.canView ?? true) && (!isJuniorCampus || permissions?.isAdmin);

  const canRbac = (permissions?.modules?.rbac?.canView || permissions?.isAdmin) ?? false;
  const canAudit = (permissions?.modules?.audit?.canView || permissions?.modules?.rbac?.canView || permissions?.isAdmin) ?? false;
  const canNotifications = (permissions?.modules?.notifications?.canView || permissions?.isAdmin) ?? false;

  const canUpdateStudents = permissions?.modules?.students?.canUpdate ?? false;
  const canUpdateFees = permissions?.modules?.fees?.canUpdate ?? false;

  return (
    <aside className="w-64 bg-slate-950 dark:bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800/80 dark:border-slate-800 min-h-screen select-none">
      {/* Brand Header */}
      <div className="flex items-center justify-between gap-2 px-6 py-5 border-b border-slate-800/80 dark:border-slate-800 relative">
        <div className="space-y-1">
          <img
            src="/echo-logo-white.png"
            alt="ECHO — DPS Kanpur Portal"
            className="h-8 w-auto object-contain"
          />
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/90 truncate">
            {permissions?.roleDisplayName || "Staff Desk"}
          </p>
        </div>
        <div className="absolute bottom-0 left-6 right-6 h-[1px] bg-gradient-to-r from-emerald-500/30 via-transparent to-transparent" />
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3.5 py-5 space-y-6 overflow-y-auto">
        {/* Overview */}
        <div>
          <h3 className="px-3.5 mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
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
            <div className="px-3.5 mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center justify-between">
              <span>Students</span>
              {!canUpdateStudents && (
                <span className="text-[9px] text-amber-400 font-bold bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-800/40">
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
            <div className="px-3.5 mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center justify-between">
              <span>Fees &amp; Billing</span>
              {!canUpdateFees && (
                <span className="text-[9px] text-amber-400 font-bold bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-800/40">
                  view only
                </span>
              )}
            </div>
            <div className="space-y-1">
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

        {/* Parent Communication */}
        {canNotifications && (
          <div>
            <h3 className="px-3.5 mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
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
        {(canRbac || canAudit) && (
          <div>
            <h3 className="px-3.5 mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
              Administration
            </h3>
            <div className="space-y-1">
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

      {/* Footer Status */}
      <div className="p-4 border-t border-slate-800/80 dark:border-slate-800 bg-slate-900/60">
        <div className="flex items-center gap-2 text-xs text-slate-200 font-bold">
          <Building2 className="w-4 h-4 text-emerald-400" />
          <span className="truncate">DPS Kanpur Group</span>
        </div>
        <div className="mt-0.5 text-[10px] font-medium text-slate-400">
          4 Offical Campuses • Unified Portal
        </div>
      </div>
    </aside>
  );
}
