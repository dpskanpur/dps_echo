import Link from "next/link";
import { Building2, Terminal } from "lucide-react";

/**
 * Shown when a page needs at least one campus but none exist.
 *
 * Renders only the content panel — the sidebar and navbar come from the staff
 * layout, so rendering them here too would duplicate the whole shell.
 */
export function NoCampusState({ context }: { context: string }) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-lg w-full bg-white dark:bg-boxdark rounded-2xl border border-slate-200/80 dark:border-strokedark shadow-xs p-7 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">No Campuses Configured</h1>
            <p className="text-xs text-slate-500 dark:text-bodydark2 mt-0.5">{context}</p>
          </div>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          This database has no campus records, so there are no classes or fee structures to work
          with yet. Load the reference data for the four DPS Kanpur campuses:
        </p>

        <div className="p-3.5 bg-slate-900 dark:bg-slate-950 rounded-xl flex items-center gap-2.5 border border-slate-800">
          <Terminal className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <code className="text-[11px] font-mono text-emerald-300">npm run db:seed</code>
        </div>

        <p className="text-[11px] text-slate-500 dark:text-bodydark2 leading-relaxed">
          Or add one by hand from{" "}
          <Link href="/admin/rbac?tab=system" className="font-bold text-[#0F9D58] hover:underline">
            Admin &amp; System Settings → Add a New Campus
          </Link>
          , which also creates the standard class structure.
        </p>
      </div>
    </div>
  );
}
