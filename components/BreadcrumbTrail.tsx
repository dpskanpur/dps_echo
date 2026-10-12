"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

export function BreadcrumbTrail() {
  const pathname = usePathname();

  const getBreadcrumbs = () => {
    if (pathname === "/") return [{ label: "Dashboard", href: "/" }];
    if (pathname.startsWith("/students/new")) {
      return [
        { label: "Operations", href: "/students" },
        { label: "Directory", href: "/students" },
        { label: "New Admission", href: "/students/new" },
      ];
    }
    if (pathname.startsWith("/students/promotion")) {
      return [
        { label: "Operations", href: "/students" },
        { label: "Promotions", href: "/students/promotion" },
      ];
    }
    if (pathname.startsWith("/students/")) {
      return [
        { label: "Operations", href: "/students" },
        { label: "Directory", href: "/students" },
        { label: "Student Dossier", href: pathname },
      ];
    }
    if (pathname.startsWith("/students")) {
      return [
        { label: "Operations", href: "/students" },
        { label: "Directory", href: "/students" },
      ];
    }
    if (pathname.startsWith("/tc")) {
      return [
        { label: "Operations", href: "/students" },
        { label: "Certificates", href: "/tc" },
      ];
    }
    if (pathname.startsWith("/alumni")) {
      return [
        { label: "Operations", href: "/students" },
        { label: "Alumni Roster", href: "/alumni" },
      ];
    }
    if (pathname.startsWith("/notifications")) {
      return [
        { label: "Communication", href: "/notifications" },
        { label: "Notifications", href: "/notifications" },
      ];
    }
    if (pathname.startsWith("/admin/rbac")) {
      return [
        { label: "Administration", href: "/admin/rbac" },
        { label: "Settings", href: "/admin/rbac" },
      ];
    }
    if (pathname.startsWith("/admin/audit-logs")) {
      return [
        { label: "Administration", href: "/admin/rbac" },
        { label: "Audit Logs", href: "/admin/audit-logs" },
      ];
    }
    return [{ label: "Console", href: "/" }];
  };

  const crumbs = getBreadcrumbs();

  return (
    <nav aria-label="Breadcrumbs" className="hidden lg:flex items-center gap-1.5 text-xs select-none">
      <Link
        href="/"
        className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 font-medium"
      >
        DPS Echo
      </Link>
      {crumbs.map((crumb, idx) => (
        <span key={crumb.href + idx} className="flex items-center gap-1.5">
          <span className="text-slate-400">/</span>
          {idx === crumbs.length - 1 ? (
            <span className="text-slate-900 dark:text-white font-medium">
              {crumb.label}
            </span>
          ) : (
            <Link
              href={crumb.href}
              className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            >
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
