"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import { Loader2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

/**
 * Navigation link that shows its own pending state.
 *
 * Every page here is server-rendered on demand, so a click produces nothing
 * visible until the server responds — which reads as the app being stuck.
 * `useLinkStatus` reports that in-flight state per link, so the item you
 * clicked swaps its icon for a spinner immediately.
 *
 * A route-level loading.tsx would be the usual answer, but the sidebar and
 * navbar are rendered inside each page rather than in a shared layout, so it
 * would blank the whole shell on every navigation.
 */
function NavIcon({ Icon }: { Icon: LucideIcon }) {
  // Must be called inside <Link> — it reads that link's navigation state.
  const { pending } = useLinkStatus();

  return pending ? (
    <Loader2 className="w-4 h-4 shrink-0 animate-spin text-[#34A853]" aria-hidden />
  ) : (
    <Icon className="w-4 h-4 shrink-0" aria-hidden />
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
        "group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 font-medium text-xs text-slate-400 transition-all duration-200 ease-in-out hover:bg-slate-800/70 hover:text-white dark:hover:bg-slate-800/50",
        active
          ? "bg-emerald-500/10 text-emerald-400 dark:bg-emerald-500/15 dark:text-emerald-300 font-bold shadow-xs border-l-2 border-emerald-500"
          : "hover:translate-x-0.5",
        className
      )}
    >
      <NavIcon Icon={icon} />
      <span className="truncate">{label}</span>
      {trailing}
    </Link>
  );
}
