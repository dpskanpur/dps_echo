"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  FileText,
  GraduationCap,
  CreditCard,
  Layers,
  Receipt,
  AlertTriangle,
  Coins,
  QrCode,
  ExternalLink,
  Building2,
  UploadCloud,
  Lock,
  KeyRound,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
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

  const canUpdateStudents = permissions?.modules?.students?.canUpdate ?? false;
  const canUpdateFees = permissions?.modules?.fees?.canUpdate ?? false;

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 min-h-screen">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#0F9D58] flex items-center justify-center font-bold text-white text-lg shadow-md shadow-emerald-950/40">
          DE
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="font-bold text-white tracking-wide">DPS Echo</h1>
            <span className="text-[10px] font-semibold bg-emerald-500/20 text-[#34A853] px-1.5 py-0.5 rounded border border-emerald-500/30">
              v1.0
            </span>
          </div>
          <p className="text-xs text-slate-400 truncate max-w-[140px]">
            {permissions?.roleDisplayName || "Staff Desk"}
          </p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
        {/* Overview */}
        <div>
          <div className="px-3 mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Overview
          </div>
          <div className="space-y-1">
            <Link
              href="/"
              className={cn(
                "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all",
                pathname === "/"
                  ? "bg-[#0F9D58] text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
              )}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              <span>Dashboard</span>
            </Link>
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
              <Link
                href="/students"
                className={cn(
                  "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all",
                  pathname === "/students"
                    ? "bg-[#0F9D58] text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
                )}
              >
                <Users className="w-4 h-4 shrink-0" />
                <span>Student Directory</span>
              </Link>

              {canUpdateStudents && (
                <>
                  <Link
                    href="/students/new"
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all",
                      pathname === "/students/new"
                        ? "bg-[#0F9D58] text-white shadow-sm"
                        : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
                    )}
                  >
                    <UserPlus className="w-4 h-4 shrink-0" />
                    <span>New Admission</span>
                  </Link>

                  <Link
                    href="/students/import"
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all",
                      pathname === "/students/import"
                        ? "bg-[#0F9D58] text-white shadow-sm"
                        : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
                    )}
                  >
                    <UploadCloud className="w-4 h-4 shrink-0" />
                    <span>Bulk Import (CSV)</span>
                  </Link>
                </>
              )}

              {canTc && (
                <Link
                  href="/tc"
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all",
                    pathname.startsWith("/tc")
                      ? "bg-[#0F9D58] text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
                  )}
                >
                  <FileText className="w-4 h-4 shrink-0" />
                  <span>Transfer Certificate (TC)</span>
                </Link>
              )}

              {canAlumni && (
                <Link
                  href="/alumni"
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all",
                    pathname.startsWith("/alumni")
                      ? "bg-[#0F9D58] text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
                  )}
                >
                  <GraduationCap className="w-4 h-4 shrink-0" />
                  <span>Alumni Archive</span>
                </Link>
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
              <Link
                href="/fees/collect"
                className={cn(
                  "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all",
                  pathname.startsWith("/fees/collect")
                    ? "bg-[#0F9D58] text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60",
                  !canUpdateFees && "opacity-60"
                )}
              >
                <CreditCard className="w-4 h-4 shrink-0" />
                <span>Fee Collection Desk</span>
                {!canUpdateFees && (
                  <span className="ml-auto text-[9px] text-slate-500 bg-slate-800 px-1 rounded flex items-center gap-0.5">
                    <Lock className="w-2.5 h-2.5" /> Read
                  </span>
                )}
              </Link>

              <Link
                href="/fees/structures"
                className={cn(
                  "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all",
                  pathname.startsWith("/fees/structures")
                    ? "bg-[#0F9D58] text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
                )}
              >
                <Layers className="w-4 h-4 shrink-0" />
                <span>Fee Structures</span>
              </Link>

              <Link
                href="/fees/invoices"
                className={cn(
                  "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all",
                  pathname.startsWith("/fees/invoices")
                    ? "bg-[#0F9D58] text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
                )}
              >
                <Receipt className="w-4 h-4 shrink-0" />
                <span>Invoices & Ledger</span>
              </Link>

              <Link
                href="/fees/defaulters"
                className={cn(
                  "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all",
                  pathname.startsWith("/fees/defaulters")
                    ? "bg-[#0F9D58] text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
                )}
              >
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Defaulters & Dues</span>
              </Link>

              {canUpdateFees && (
                <Link
                  href="/fees/cashier"
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all",
                    pathname.startsWith("/fees/cashier")
                      ? "bg-[#0F9D58] text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
                  )}
                >
                  <Coins className="w-4 h-4 shrink-0" />
                  <span>Daily Cashier Register</span>
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Administration & RBAC */}
        {canRbac && (
          <div>
            <div className="px-3 mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Administration & Access
            </div>
            <div className="space-y-1">
              <Link
                href="/admin/rbac"
                className={cn(
                  "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all",
                  pathname.startsWith("/admin/rbac")
                    ? "bg-[#0F9D58] text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
                )}
              >
                <KeyRound className="w-4 h-4 shrink-0 text-[#34A853]" />
                <span>RBAC Permissions</span>
              </Link>
            </div>
          </div>
        )}

        {/* Public Portals */}
        <div>
          <div className="px-3 mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Public Portals
          </div>
          <div className="space-y-1">
            <Link
              href="/pay"
              target="_blank"
              className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all text-emerald-400/90 hover:text-emerald-300 hover:bg-slate-800/60"
            >
              <ExternalLink className="w-4 h-4 shrink-0" />
              <span>Quick Pay Fees</span>
              <span className="ml-auto text-[10px] bg-slate-800 text-slate-400 px-1 rounded">
                Public
              </span>
            </Link>

            <Link
              href="/verify-tc"
              target="_blank"
              className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all text-emerald-400/90 hover:text-emerald-300 hover:bg-slate-800/60"
            >
              <QrCode className="w-4 h-4 shrink-0" />
              <span>Verify TC (QR)</span>
              <span className="ml-auto text-[10px] bg-slate-800 text-slate-400 px-1 rounded">
                Public
              </span>
            </Link>
          </div>
        </div>
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
