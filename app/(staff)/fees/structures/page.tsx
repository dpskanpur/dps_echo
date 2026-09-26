import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";
import { NoCampusState } from "@/components/NoCampusState";
import { FeeTemplateImport } from "@/components/FeeTemplateImport";
import { FeeHeadRow } from "@/components/FeeHeadRow";
import {
  upsertFeeStructure,
  createFeeHead,
  updateFeeHead,
  deleteFeeHead,
} from "@/lib/fee-structure-actions";
import { FEE_FREQUENCIES, FEE_FREQUENCY_LABELS } from "@/lib/fee-constants";
import { listAcademicSessions, resolveSessionScope } from "@/lib/academic-session";
import { formatCurrency } from "@/lib/utils";
import { getCurrentUser, getUserPermissions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Layers, Building2, Plus, Info, ChevronDown } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function FeeStructuresPage({
  searchParams,
}: {
  searchParams: Promise<{
    campus?: string;
    session?: string;
    notice?: string;
    name?: string;
    removed?: string;
  }>;
}) {
  const {
    campus: campusId,
    session: sessionParam,
    notice,
    name: noticeName,
    removed: removedCount,
  } = await searchParams;
  const user = await getCurrentUser();
  const permissions = await getUserPermissions(user);

  if (!permissions.modules.fees.canView && !permissions.isAdmin) {
    redirect("/?error=unauthorized_fees");
  }

  const campuses = await prisma.campus.findMany({ orderBy: { name: "asc" } });

  const activeCampus =
    campuses.find((c) => c.id === campusId) || campuses[0];

  if (!activeCampus) {
    return (
      <NoCampusState
        context="Fee structures are defined per campus."
      />
    );
  }

  const feeHeads = await prisma.feeHead.findMany({
    where: { campusId: activeCampus.id },
    orderBy: { code: "asc" },
  });

  // Fee structures are per session as well as per campus, so the matrix and
  // every edit below are scoped to whichever session is selected in the header.
  const sessions = await listAcademicSessions();
  const scope = resolveSessionScope(sessionParam, sessions);
  const activeSession =
    sessions.find((x) => x.name === scope.name) || sessions.find((x) => x.isCurrent) || sessions[0];

  const classes = await prisma.class.findMany({
    where: { campusId: activeCampus.id },
    include: {
      feeStructures: {
        where: {
          campusId: activeCampus.id,
          ...(activeSession ? { academicYearId: activeSession.id } : {}),
        },
        include: { feeHead: true },
      },
    },
    orderBy: { sequence: "asc" },
  });

  return (
        <main className="p-8 space-y-6 flex-1 overflow-y-auto max-w-6xl mx-auto w-full">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-800" />
                <h1 className="text-xl font-black text-slate-900">
                  Fee Structure Matrix
                </h1>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Class-wise fee slabs for <strong className="text-slate-700">{activeCampus.name}</strong>{" "}
                ({activeCampus.code}), session{" "}
                <strong className="text-slate-700">{activeSession?.name || "—"}</strong>. Amounts
                apply to this campus and session only.
              </p>
            </div>
          </div>

          {/* Fee Heads — collapsed by default; reference data, not daily work */}
          <details
            open={notice === "head_deleted"}
            className="group bg-white rounded-xl border border-slate-200 shadow-xs open:pb-5"
          >
            <summary className="list-none [&::-webkit-details-marker]:hidden cursor-pointer select-none p-5 flex items-center justify-between gap-4 rounded-xl hover:bg-slate-50/70 transition">
              <div className="min-w-0">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-emerald-800 shrink-0" /> Institutional Fee Heads
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 rounded-full px-1.5 py-0.5 normal-case tracking-normal">
                    {feeHeads.length}
                  </span>
                </h2>
                <p className="text-[11px] text-slate-500 mt-1">
                  The levies a fee structure can charge. The code is what an uploaded template
                  matches on.
                </p>
              </div>
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 shrink-0 whitespace-nowrap">
                <span className="hidden sm:inline group-open:hidden">Manage</span>
                <span className="hidden sm:group-open:inline">Hide</span>
                <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
              </span>
            </summary>

            <div className="px-5 space-y-4">
            {notice === "head_deleted" && (
              <p className="text-[11px] text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-lg p-2.5">
                Fee head <strong>{noticeName}</strong> deleted.
              </p>
            )}

            {feeHeads.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">
                No fee heads defined yet. Add one below to start building the fee structure.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {feeHeads.map((fh) => (
                  <FeeHeadRow
                    key={fh.id}
                    head={{
                      id: fh.id,
                      code: fh.code,
                      name: fh.name,
                      description: fh.description,
                      isOptional: fh.isOptional,
                      isRefundable: fh.isRefundable,
                    }}
                  />
                ))}
              </ul>
            )}

            {/* Add a head — inline, always available, no disclosure needed */}
            <form
              action={createFeeHead}
              className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100"
            >
              <input type="hidden" name="campusId" value={activeCampus.id} />
              <input
                type="text"
                name="code"
                required
                placeholder="CODE"
                aria-label="New fee head code"
                className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-mono font-bold uppercase text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
              />
              <input
                type="text"
                name="name"
                required
                placeholder="New fee head name"
                aria-label="New fee head name"
                className="flex-1 min-w-[160px] bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
              />
              <button
                type="submit"
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition"
              >
                <Plus className="w-3 h-3" /> Add
              </button>
              </form>
            </div>
          </details>

          {/* Define: upload a template, or add one row at a time */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <FeeTemplateImport
              campusId={activeCampus.id}
              campusCode={activeCampus.code}
              academicYearId={activeSession?.id || ""}
              sessionName={activeSession?.name || ""}
              classes={classes.map((c) => ({ id: c.id, name: c.name }))}
              feeHeads={feeHeads.map((h) => ({ id: h.id, code: h.code, name: h.name }))}
            />

            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Define Manually</h2>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Sets one amount for one fee head in one class. Saving over an existing
                  combination updates it.
                </p>
              </div>

              <form action={upsertFeeStructure} className="space-y-3">
                <input type="hidden" name="campusId" value={activeCampus.id} />
                <input type="hidden" name="academicYearId" value={activeSession?.id || ""} />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Class</label>
                    <select
                      name="classId"
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                    >
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Fee Head</label>
                    <select
                      name="feeHeadId"
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                    >
                      {feeHeads.map((h) => (
                        <option key={h.id} value={h.id}>{h.name} ({h.code})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Amount (₹)</label>
                    <input
                      type="number"
                      name="amount"
                      required
                      min={0}
                      step={50}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Frequency</label>
                    <select
                      name="frequency"
                      defaultValue="QUARTERLY"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                    >
                      {FEE_FREQUENCIES.map((f) => (
                        <option key={f} value={f}>{FEE_FREQUENCY_LABELS[f] || f.replace("_", " ")}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold rounded-lg bg-[#0F9D58] text-white hover:bg-emerald-700 transition"
                >
                  <Plus className="w-3.5 h-3.5" /> Save fee structure row
                </button>
              </form>

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
                    {feeHeads.map((head) => (
                      <th key={head.id} className="py-3 px-4">
                        {head.name} ({head.code})
                      </th>
                    ))}
                    <th className="py-3 px-4 text-right">Annual Estimated Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {classes.map((cls) => {
                    let annualEstimated = 0;

                    return (
                      <tr key={cls.id} className="hover:bg-slate-50/80 border-b border-slate-100">
                        <td className="py-3 px-4 font-bold text-slate-900">{cls.name}</td>
                        {feeHeads.map((head) => {
                          const fs = cls.feeStructures.find(
                            (f) => f.feeHeadId === head.id || f.feeHead?.code === head.code
                          );
                          const amount = fs?.amount || 0;
                          const freq = fs?.frequency || "QUARTERLY";
                          const multiplier = freq === "QUARTERLY" ? 4 : freq === "SEMI_ANNUAL" ? 2 : 1;
                          annualEstimated += amount * multiplier;

                          return (
                            <td key={head.id} className="py-3 px-4 font-mono">
                              {amount > 0 ? (
                                <div>
                                  <span className="font-bold text-slate-800">{formatCurrency(amount)}</span>
                                  <span className="block text-[10px] text-slate-400 font-medium">
                                    {FEE_FREQUENCY_LABELS[freq] || freq}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="py-3 px-4 text-right font-mono font-black text-emerald-800 text-sm">
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
  );
}
