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
        "group relative flex items-center gap-2.5 rounded-sm px-4 py-2.5 font-medium text-slate-300 duration-200 ease-in-out hover:bg-slate-800 hover:text-white dark:hover:bg-meta-4",
        active
          ? "bg-slate-800 text-white dark:bg-meta-4 shadow-sm font-semibold border-l-4 border-dps-gold"
          : "text-slate-300 hover:text-white",
        className
      )}
    >
      <NavIcon Icon={icon} />
      <span className="truncate">{label}</span>
      {trailing}
    </Link>
  );
}
