import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";
import { formatCurrency } from "@/lib/utils";
import { getCurrentUser, getUserPermissions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Layers, Building2, Plus, Info } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function FeeStructuresPage({
  searchParams,
}: {
  searchParams: Promise<{ campus?: string }>;
}) {
  const { campus: campusId } = await searchParams;
  const user = await getCurrentUser();
  const permissions = await getUserPermissions(user);

  if (!permissions.modules.fees.canView && !permissions.isAdmin) {
    redirect("/?error=unauthorized_fees");
  }

  const campuses = await prisma.campus.findMany({ orderBy: { name: "asc" } });

  const activeCampus =
    campuses.find((c) => c.id === campusId) || campuses[0];

  const feeHeads = await prisma.feeHead.findMany({
    where: { campusId: activeCampus.id },
    orderBy: { code: "asc" },
  });

  const classes = await prisma.class.findMany({
    where: { campusId: activeCampus.id },
    include: {
      feeStructures: {
        where: { campusId: activeCampus.id },
        include: { feeHead: true },
      },
    },
    orderBy: { sequence: "asc" },
  });

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar userEmail={user?.email} userRole={user?.role} permissions={permissions} />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar campuses={campuses} selectedCampusId={activeCampus.id} user={user || undefined} permissions={permissions} />

        <main className="p-8 space-y-6 flex-1 overflow-y-auto max-w-6xl mx-auto w-full">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-800" />
                <h1 className="text-xl font-black text-slate-900">
                  Fee Structure Matrix (Session 2025-26)
                </h1>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Class-wise fee head slabs for {activeCampus.name} ({activeCampus.code}).
              </p>
            </div>
          </div>

          {/* Fee Heads Summary */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-emerald-800" /> Standard Institutional Fee Heads
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-xs">
              {feeHeads.map((fh) => (
                <div key={fh.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="font-mono font-bold text-slate-800 block">{fh.name} ({fh.code})</span>
                  <span className="text-[11px] text-slate-400">{fh.description || "Standard levy"}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Class-Wise Fee Structure Matrix Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">Class-wise Fee Breakdown</h3>
              <span className="text-xs text-slate-500 font-medium">Amounts in INR (₹)</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500">
                    <th className="py-3 px-4">Class</th>
                    <th className="py-3 px-4">Tuition (Quarterly)</th>
                    <th className="py-3 px-4">Development (Annual)</th>
                    <th className="py-3 px-4">Activity Fee</th>
                    <th className="py-3 px-4">Lab / Computer</th>
                    <th className="py-3 px-4 text-right">Annual Estimated Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {classes.map((cls) => {
                    const tuition = cls.feeStructures.find((f) => f.feeHead.code === "TUI")?.amount || 0;
                    const dev = cls.feeStructures.find((f) => f.feeHead.code === "DEV")?.amount || 0;
                    const act = cls.feeStructures.find((f) => f.feeHead.code === "ACT")?.amount || 0;
                    const lab = cls.feeStructures.find((f) => f.feeHead.code === "LAB")?.amount || 0;

                    const annualEstimated = tuition * 4 + dev + act + lab * 4;

                    return (
                      <tr key={cls.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 font-bold text-slate-900">{cls.name}</td>
                        <td className="py-3 px-4 font-mono">{formatCurrency(tuition)}</td>
                        <td className="py-3 px-4 font-mono">{formatCurrency(dev)}</td>
                        <td className="py-3 px-4 font-mono">{formatCurrency(act)}</td>
                        <td className="py-3 px-4 font-mono">{lab > 0 ? formatCurrency(lab) : "-"}</td>
                        <td className="py-3 px-4 text-right font-mono font-black text-emerald-800">
                          {formatCurrency(annualEstimated)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
