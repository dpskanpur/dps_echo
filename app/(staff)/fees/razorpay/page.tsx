import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getCurrentUser, getUserPermissions } from "@/lib/auth";
import {
  getOnlinePaymentSettings,
  updateMasterOnlinePaymentAction,
  updateCampusOnlinePaymentAction,
  updateCampusChannelAction,
} from "@/lib/fee-settings-actions";
import {
  CreditCard,
  Building2,
  ShieldCheck,
  AlertTriangle,
  Save,
  CheckCircle2,
  Lock,
  MessageSquare,
  Mail,
  Zap,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function RazorpaySettingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    notice?: string;
    campus?: string;
  }>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const permissions = await getUserPermissions(user);

  if (!permissions.modules.fees.canView && !permissions.isAdmin) {
    redirect("/?error=unauthorized_fees");
  }

  const canUpdate = permissions.modules.fees.canUpdate || permissions.isAdmin;
  const { masterIsOnlinePaymentEnabled, masterOnlinePaymentDisabledReason, campuses } =
    await getOnlinePaymentSettings();

  return (
    <main className="p-6 sm:p-8 space-y-6 flex-1 overflow-y-auto max-w-7xl mx-auto w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-900 text-white flex items-center justify-center font-bold shadow-md">
            <CreditCard className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Razorpay Gateway &amp; School-Wise Payment Controls
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure online fee collection overall and school-wise per campus.
            </p>
          </div>
        </div>

        {params.notice && (
          <div className="px-3.5 py-2 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-950 text-xs font-bold flex items-center gap-2 shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>
              {params.notice === "master_payment_updated"
                ? "Overall institution-wide online payment controls updated."
                : params.notice === "campus_payment_updated"
                ? `Online payment settings for ${params.campus || "campus"} updated successfully.`
                : "Settings saved successfully."}
            </span>
          </div>
        )}
      </div>

      {/* SECTION 1: MASTER OVERALL ONLINE PAYMENT CONTROL */}
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
                Master override for online fee collection across all campuses.
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
                  className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm"
                >
                  <Save className="w-3.5 h-3.5" /> Save Master Override
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* SECTION 2: SCHOOL-WISE / CAMPUS-WISE ONLINE PAYMENT & RAZORPAY CONFIGURATION */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-800" />
            <h2 className="text-base font-black text-slate-900">
              School-Wise Online Payment &amp; Razorpay Credentials ({campuses.length} Campuses)
            </h2>
          </div>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
            Per-Campus Multi-Tenant Config
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

                {/* Form for Campus Controls */}
                <form action={updateCampusOnlinePaymentAction} className="space-y-4">
                  <input type="hidden" name="campusId" value={campus.id} />

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Online Payment Status for {campus.name}
                      </label>
                      <select
                        name="isOnlinePaymentEnabled"
                        defaultValue={campus.isOnlinePaymentEnabled ? "true" : "false"}
                        disabled={!canUpdate}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 disabled:opacity-60"
                      >
                        <option value="true">Enable Online Fees (Active for Parents)</option>
                        <option value="false">Disable Online Fees for this Campus</option>
                      </select>
                    </div>

                    <div className="pt-2 border-t border-slate-100 space-y-3">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                        Razorpay API Key Credentials ({campus.code})
                      </span>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Razorpay Key ID
                        </label>
                        <input
                          type="text"
                          name="razorpayKeyId"
                          defaultValue={campus.razorpayKeyId || ""}
                          placeholder="rzp_live_... (Default: System Environment Variable)"
                          disabled={!canUpdate}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 disabled:opacity-60"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Razorpay Key Secret
                        </label>
                        <input
                          type="password"
                          name="razorpayKeySecret"
                          defaultValue={campus.razorpayKeySecret || ""}
                          placeholder="•••••••••••••••• (Leave blank to keep current)"
                          disabled={!canUpdate}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 disabled:opacity-60"
                        />
                      </div>
                    </div>
                  </div>

                  {canUpdate && (
                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-[#0F9D58] hover:bg-emerald-700 text-white transition shadow-sm"
                      >
                        <Save className="w-3.5 h-3.5" /> Save {campus.code} Settings
                      </button>
                    </div>
                  )}
                </form>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 3: SCHOOL-WISE SMS & EMAIL CHANNEL CONTROLS MATRIX */}
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-800" />
            <h2 className="text-base font-black text-slate-900">
              School-Wise SMS &amp; Email Channel Controls Matrix
            </h2>
          </div>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
            Per-Campus Communication Toggles
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {campuses.map((campus) => (
            <div key={campus.id} className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-slate-100 text-slate-800 font-mono font-bold text-xs flex items-center justify-center border border-slate-200">
                    {campus.code}
                  </span>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">{campus.name} Channels</h3>
                    <p className="text-[11px] text-slate-400">Campus Code: {campus.code}</p>
                  </div>
                </div>
              </div>

              <form action={updateCampusChannelAction} className="space-y-4">
                <input type="hidden" name="campusId" value={campus.id} />

                <div className="space-y-3">
                  {/* SMS Control */}
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-700" /> SMS Channel ({campus.code})
                      </span>
                      <select
                        name="isSmsEnabled"
                        defaultValue={campus.isSmsEnabled ? "true" : "false"}
                        disabled={!canUpdate}
                        className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none"
                      >
                        <option value="true">Active (Enabled)</option>
                        <option value="false">Disabled for this School</option>
                      </select>
                    </div>
                  </div>

                  {/* Email Control */}
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-emerald-700" /> Email Channel ({campus.code})
                      </span>
                      <select
                        name="isEmailEnabled"
                        defaultValue={campus.isEmailEnabled ? "true" : "false"}
                        disabled={!canUpdate}
                        className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none"
                      >
                        <option value="true">Active (Enabled)</option>
                        <option value="false">Disabled for this School</option>
                      </select>
                    </div>
                  </div>
                </div>

                {canUpdate && (
                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-900 text-white transition shadow-sm"
                    >
                      <Save className="w-3.5 h-3.5" /> Save {campus.code} Channels
                    </button>
                  </div>
                )}
              </form>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
