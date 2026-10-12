"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import { Loader2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

function NavIcon({ Icon }: { Icon: LucideIcon }) {
  const { pending } = useLinkStatus();

  return pending ? (
    <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin text-slate-700 dark:text-slate-300" aria-hidden />
  ) : (
    <Icon className="w-3.5 h-3.5 shrink-0 text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200" aria-hidden />
  );
}

export function SidebarLink({
  href,
  icon,
  label,
  active,
  target,
  trailing,
  className,
}: {
  href: string;
  icon: LucideIcon;
  label: ReactNode;
  active?: boolean;
  target?: string;
  trailing?: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      target={target}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors select-none",
        active
          ? "bg-slate-200/70 text-slate-900 dark:bg-slate-800 dark:text-white border-l-2 border-slate-900 dark:border-emerald-500 rounded-l-none pl-2"
          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60",
        className
      )}
    >
      <NavIcon Icon={icon} />
      <span className="truncate flex-1">{label}</span>
      {trailing}
    </Link>
  );
}
