import Link from "next/link";
import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";
import { Building2, Terminal } from "lucide-react";
import { UserPermissions } from "@/lib/permissions";

/**
 * Shown when a page needs at least one campus but none exist.
 *
 * Several pages derive their whole context from `campuses[0]`. On a freshly
 * migrated database that is `undefined`, which used to surface as
 * "Cannot read properties of undefined (reading 'id')" rather than telling
 * anyone what was actually missing.
 */
export function NoCampusState({
  user,
  permissions,
  context,
}: {
  user?: { name?: string; email?: string; role?: string } | null;
  permissions?: UserPermissions;
  context: string;
}) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar userEmail={user?.email} userRole={user?.role} permissions={permissions} />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar campuses={[]} user={user || undefined} permissions={permissions} />

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
      </div>
    </div>
  );
}
