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
    <main className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-lg w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-7 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900">No Campuses Configured</h1>
            <p className="text-xs text-slate-500 mt-0.5">{context}</p>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          This database has no campus records, so there are no classes or fee structures to work
          with yet. Load the reference data for the four DPS Kanpur campuses:
        </p>

        <div className="p-3.5 bg-slate-900 rounded-xl flex items-center gap-2.5">
          <Terminal className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <code className="text-[11px] font-mono text-emerald-300">npm run db:seed</code>
        </div>

        <p className="text-[11px] text-slate-500 leading-relaxed">
          Or add one by hand from{" "}
          <Link href="/admin/rbac?tab=system" className="font-bold text-[#0F9D58] hover:underline">
            Admin &amp; System Settings → Add a New Campus
          </Link>
          , which also creates the standard class structure.
        </p>
      </div>
    </main>
  );
}
