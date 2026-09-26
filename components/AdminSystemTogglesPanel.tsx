"use client";

import { useState } from "react";
import {
  CreditCard,
  Building2,
  Save,
  MessageSquare,
  Mail,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import {
  updateCampusOnlinePaymentAction,
  updateCampusChannelAction,
} from "@/lib/fee-settings-actions";

interface CampusToggleData {
  id: string;
  code: string;
  name: string;
  isOnlinePaymentEnabled: boolean;
  onlinePaymentDisabledReason?: string | null;
  isSmsEnabled: boolean;
  smsDisabledReason?: string | null;
  isEmailEnabled: boolean;
  emailDisabledReason?: string | null;
}

interface AdminSystemTogglesPanelProps {
  campuses: CampusToggleData[];
  canUpdate: boolean;
}

export function AdminSystemTogglesPanel({
  campuses,
  canUpdate,
}: AdminSystemTogglesPanelProps) {
  const [activeCampusId, setActiveCampusId] = useState<string>(
    campuses[0]?.id || ""
  );

  const selectedCampus =
    campuses.find((c) => c.id === activeCampusId) || campuses[0];

  if (!selectedCampus) return null;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-900 text-white flex items-center justify-center font-bold shadow-md">
            <Building2 className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900 tracking-tight">
              School-Wise Services &amp; Channel Control Matrix
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select a school tab below to configure online fee payment and communication channels.
            </p>
          </div>
        </div>

        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3.5 py-1.5 rounded-full border border-slate-200 shrink-0">
          Per-School Multi-Tenant Config
        </span>
      </div>

      {/* COMPACT SCHOOL TABS NAVIGATION */}
      <div className="bg-slate-100 p-1.5 rounded-2xl flex flex-wrap items-center gap-2">
        {campuses.map((c) => {
          const isActive = c.id === selectedCampus.id;
          const isFullyActive = c.isOnlinePaymentEnabled && c.isSmsEnabled && c.isEmailEnabled;

          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveCampusId(c.id)}
              className={`flex-1 min-w-[140px] px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between gap-2 border cursor-pointer ${
                isActive
                  ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                  : "bg-white text-slate-700 hover:bg-slate-50 border-slate-200"
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    isFullyActive ? "bg-emerald-400" : "bg-amber-400"
                  }`}
                />
                <span className="truncate">{c.name}</span>
              </div>
              <span
                className={`font-mono text-[10px] px-1.5 py-0.5 rounded shrink-0 ${
                  isActive ? "bg-slate-800 text-amber-300" : "bg-slate-100 text-slate-600"
                }`}
              >
                {c.code}
              </span>
            </button>
          );
        })}
      </div>

      {/* ACTIVE SCHOOL CONFIGURATION PANEL */}
      <div className="bg-slate-50/80 rounded-2xl border border-slate-200/90 p-5 sm:p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-emerald-900 text-amber-300 font-mono font-bold text-xs flex items-center justify-center border border-emerald-800 shadow-xs">
              {selectedCampus.code}
            </span>
            <div>
              <h3 className="text-sm font-black text-slate-900">{selectedCampus.name} Settings</h3>
              <p className="text-[11px] text-slate-500">School Code: {selectedCampus.code}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                selectedCampus.isOnlinePaymentEnabled
                  ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                  : "bg-rose-100 text-rose-800 border-rose-200"
              }`}
            >
              Fee Payment: {selectedCampus.isOnlinePaymentEnabled ? "ACTIVE" : "DISABLED"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* SECTION A: ONLINE FEE PAYMENT CONTROL */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4 shadow-2xs">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <CreditCard className="w-4 h-4 text-emerald-800" />
              <h4 className="text-xs font-black uppercase tracking-wide text-slate-900">
                Online Fee Payment ({selectedCampus.code})
              </h4>
            </div>

            <form action={updateCampusOnlinePaymentAction} className="space-y-4">
              <input type="hidden" name="campusId" value={selectedCampus.id} />
              <input type="hidden" name="returnUrl" value="/admin/rbac?tab=system" />

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Online Payment Gateway Status
                </label>
                <select
                  name="isOnlinePaymentEnabled"
                  defaultValue={selectedCampus.isOnlinePaymentEnabled ? "true" : "false"}
                  disabled={!canUpdate}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 disabled:opacity-60"
                >
                  <option value="true">Enable Online Fee Payment (Active for Parents)</option>
                  <option value="false">Disable Online Fee Payment (Disabled by Admin)</option>
                </select>
              </div>

              {canUpdate && (
                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white transition shadow-xs cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" /> Save Fee Payment Status
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* SECTION B: COMMUNICATION CHANNELS CONTROL */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4 shadow-2xs">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <MessageSquare className="w-4 h-4 text-emerald-800" />
              <h4 className="text-xs font-black uppercase tracking-wide text-slate-900">
                Communication Channels ({selectedCampus.code})
              </h4>
            </div>

            <form action={updateCampusChannelAction} className="space-y-4">
              <input type="hidden" name="campusId" value={selectedCampus.id} />
              <input type="hidden" name="returnUrl" value="/admin/rbac?tab=system" />

              <div className="space-y-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-700" /> SMS Broadcast Channel
                  </label>
                  <select
                    name="isSmsEnabled"
                    defaultValue={selectedCampus.isSmsEnabled ? "true" : "false"}
                    disabled={!canUpdate}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-900 focus:outline-none"
                  >
                    <option value="true">Active (Enabled)</option>
                    <option value="false">Disabled by Admin</option>
                  </select>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-emerald-700" /> Email Broadcast Channel
                  </label>
                  <select
                    name="isEmailEnabled"
                    defaultValue={selectedCampus.isEmailEnabled ? "true" : "false"}
                    disabled={!canUpdate}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-900 focus:outline-none"
                  >
                    <option value="true">Active (Enabled)</option>
                    <option value="false">Disabled by Admin</option>
                  </select>
                </div>
              </div>

              {canUpdate && (
                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition shadow-xs cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" /> Save Communication Channels
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
