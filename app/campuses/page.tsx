import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";
import { getCurrentUser, getUserPermissions } from "@/lib/auth";
import { updateCampusRegistrationFee } from "@/lib/actions";
import { Building2, Save, Sparkles, CheckCircle2, IndianRupee } from "lucide-react";
import Image from "next/image";

export const dynamic = "force-dynamic";

export default async function CampusesAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const { notice } = await searchParams;
  const user = await getCurrentUser();
  const permissions = await getUserPermissions(user);

  const campuses = await prisma.campus.findMany({
    include: {
      _count: {
        select: {
          students: true,
          classes: true,
          users: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar userEmail={user?.email} userRole={user?.role} permissions={permissions} />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar campuses={campuses} selectedCampusId={campuses[0]?.id || ""} user={user || undefined} permissions={permissions} />

        <main className="p-6 sm:p-8 space-y-6 flex-1 overflow-y-auto max-w-6xl mx-auto w-full">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="w-6 h-6 text-emerald-800" />
                <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                  DPS Kanpur Campuses & Registration Fee Settings
                </h1>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Manage campus registration fees, active school profiles, and institutional configurations.
              </p>
            </div>
          </div>

          {notice === "fee_updated" && (
            <div className="bg-emerald-500 text-white p-4 rounded-2xl font-bold text-xs shadow-md flex items-center gap-2 border border-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
              <span>Campus registration fee updated successfully across staff and public online portals.</span>
            </div>
          )}

          {/* Campus Settings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {campuses.map((campus) => (
              <div
                key={campus.id}
                className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-emerald-50 p-2 rounded-2xl border border-emerald-100">
                        <Image src="/dps_crest.png" alt="Crest" width={36} height={36} className="object-contain" />
                      </div>
                      <div>
                        <h2 className="text-base font-black text-slate-900">{campus.name}</h2>
                        <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Code: {campus.code}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500">{campus.address}, {campus.city}</p>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-slate-400 block font-bold text-[10px]">Students</span>
                      <strong className="text-slate-800 font-extrabold text-sm">{campus._count.students}</strong>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-slate-400 block font-bold text-[10px]">Classes</span>
                      <strong className="text-slate-800 font-extrabold text-sm">{campus._count.classes}</strong>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-slate-400 block font-bold text-[10px]">Staff</span>
                      <strong className="text-slate-800 font-extrabold text-sm">{campus._count.users}</strong>
                    </div>
                  </div>
                </div>

                {/* Edit Fixed Registration Fee Form */}
                <form action={updateCampusRegistrationFee} className="pt-4 border-t border-slate-100 space-y-3">
                  <input type="hidden" name="campusId" value={campus.id} />
                  <label className="block text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span>Fixed Registration Fee (₹) *</span>
                    <span className="text-[10px] text-emerald-700 font-semibold">Public & Staff Portal Fee</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <IndianRupee className="w-3.5 h-3.5" />
                      </div>
                      <input
                        type="number"
                        name="registrationFee"
                        defaultValue={campus.registrationFee}
                        required
                        min="0"
                        step="100"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                      />
                    </div>

                    <button
                      type="submit"
                      className="bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 text-white font-bold px-4 py-2 rounded-xl text-xs transition shadow-xs flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Update</span>
                    </button>
                  </div>
                </form>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
