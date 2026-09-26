"use client";

import {
  CreditCard,
  Building2,
  Zap,
  Save,
  MessageSquare,
  Mail,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import {
  updateMasterOnlinePaymentAction,
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
  masterIsOnlinePaymentEnabled: boolean;
  masterOnlinePaymentDisabledReason?: string;
  campuses: CampusToggleData[];
  canUpdate: boolean;
}

export function AdminSystemTogglesPanel({
  masterIsOnlinePaymentEnabled,
  masterOnlinePaymentDisabledReason = "",
  campuses,
  canUpdate,
}: AdminSystemTogglesPanelProps) {
  return (
    <div className="space-y-6">
      {/* SECTION 1: MASTER OVERALL INSTITUTION-WIDE TOGGLE */}
      <div className="bg-slate-900 text-white rounded-3xl border border-slate-800 p-6 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-wide">
                Master Online Payment Switch (Overall Institution-Wide)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Master override for online fee collection. Disabling here automatically disables online payments for all schools.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border ${
                masterIsOnlinePaymentEnabled
                  ? "bg-emerald-950/80 text-emerald-400 border-emerald-800"
                  : "bg-rose-950/80 text-rose-400 border-rose-800"
              }`}
            >
              Master Status: {masterIsOnlinePaymentEnabled ? "ONLINE PAYMENTS ENABLED" : "ONLINE PAYMENTS DISABLED"}
            </span>
          </div>
        </div>

        {canUpdate && (
          <form action={updateMasterOnlinePaymentAction} className="space-y-4 pt-2">
            <input type="hidden" name="returnUrl" value="/admin/rbac?tab=system" />
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Master Payment Status Toggle
                </label>
                <select
                  name="isOnlinePaymentEnabled"
                  defaultValue={masterIsOnlinePaymentEnabled ? "true" : "false"}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="true">Enable Online Fees Institution-Wide (Active)</option>
                  <option value="false">Disable Online Fees Institution-Wide (Disabled by Admin)</option>
                </select>
              </div>

              <div className="flex justify-end sm:self-end">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" /> Save Master Override
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* SECTION 2: SCHOOL-WISE ONLINE PAYMENT & CHANNEL TOGGLES MATRIX */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-800" />
            <h2 className="text-base font-black text-slate-900">
              School-Wise Online Payment &amp; Communication Channel Matrix ({campuses.length} Campuses)
            </h2>
          </div>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
            Per-Campus Controls
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {campuses.map((campus) => (
            <div
              key={campus.id}
              className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-5 flex flex-col justify-between"
            >
              <div className="space-y-4">
                {/* Card Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 font-mono font-bold text-xs flex items-center justify-center border border-emerald-200">
                      {campus.code}
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900">{campus.name}</h3>
                      <p className="text-[11px] text-slate-400">Campus Code: {campus.code}</p>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      campus.isOnlinePaymentEnabled
                        ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                        : "bg-rose-100 text-rose-800 border-rose-200"
                    }`}
                  >
                    {campus.isOnlinePaymentEnabled ? "ONLINE FEES ENABLED" : "DISABLED FOR THIS CAMPUS"}
                  </span>
                </div>

                {/* Form for Campus Payment Control */}
                <form action={updateCampusOnlinePaymentAction} className="space-y-3">
                  <input type="hidden" name="campusId" value={campus.id} />
                  <input type="hidden" name="returnUrl" value="/admin/rbac?tab=system" />

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Online Payment Status ({campus.code})
                    </label>
                    <select
                      name="isOnlinePaymentEnabled"
                      defaultValue={campus.isOnlinePaymentEnabled ? "true" : "false"}
                      disabled={!canUpdate || !masterIsOnlinePaymentEnabled}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 disabled:opacity-60"
                    >
                      <option value="true">Enable Online Fees (Active for Parents)</option>
                      <option value="false">Disable Online Fees for this Campus</option>
                    </select>
                    {!masterIsOnlinePaymentEnabled && (
                      <p className="text-[11px] text-rose-600 font-semibold mt-1">
                        * Overridden: Master Online Payment is currently Disabled globally.
                      </p>
                    )}
                  </div>

                  {canUpdate && masterIsOnlinePaymentEnabled && (
                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white transition shadow-xs cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" /> Save {campus.code} Payment Status
                      </button>
                    </div>
                  )}
                </form>

                {/* Form for Campus Channels Control */}
                <form action={updateCampusChannelAction} className="pt-3 border-t border-slate-100 space-y-3">
                  <input type="hidden" name="campusId" value={campus.id} />
                  <input type="hidden" name="returnUrl" value="/admin/rbac?tab=system" />

                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                    Communication Channels ({campus.code})
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                      <label className="block text-[11px] font-bold text-slate-700 flex items-center gap-1">
                        <MessageSquare className="w-3 h-3 text-emerald-700" /> SMS Channel
                      </label>
                      <select
                        name="isSmsEnabled"
                        defaultValue={campus.isSmsEnabled ? "true" : "false"}
                        disabled={!canUpdate}
                        className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-bold text-slate-800 focus:outline-none"
                      >
                        <option value="true">Active (Enabled)</option>
                        <option value="false">Disabled for School</option>
                      </select>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                      <label className="block text-[11px] font-bold text-slate-700 flex items-center gap-1">
                        <Mail className="w-3 h-3 text-emerald-700" /> Email Channel
                      </label>
                      <select
                        name="isEmailEnabled"
                        defaultValue={campus.isEmailEnabled ? "true" : "false"}
                        disabled={!canUpdate}
                        className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-bold text-slate-800 focus:outline-none"
                      >
                        <option value="true">Active (Enabled)</option>
                        <option value="false">Disabled for School</option>
                      </select>
                    </div>
                  </div>

                  {canUpdate && (
                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-900 text-white transition shadow-xs cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" /> Save {campus.code} Channels
                      </button>
                    </div>
                  )}
                </form>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
