"use client";

import { useState, useEffect } from "react";
import { MessageSquare, RefreshCw, Zap, ShieldCheck, AlertCircle } from "lucide-react";
import { fetchSmsBalanceAction } from "@/lib/notification-actions";
import { SmsBalanceResult } from "@/lib/sms";

export function SmsBalanceCard() {
  const [balanceState, setBalanceState] = useState<SmsBalanceResult | null>(null);
  const [loading, setLoading] = useState(false);

  const loadBalance = async () => {
    setLoading(true);
    try {
      const res = await fetchSmsBalanceAction();
      setBalanceState(res);
    } catch (err) {
      console.error("Failed to load SMS balance:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBalance();
  }, []);

  return (
    <div className="bg-gradient-to-br from-slate-900 to-emerald-950 text-white rounded-2xl p-5 shadow-sm border border-emerald-900/50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-black tracking-wide uppercase text-emerald-300">
              SMS Gateway Credits
            </h3>
            <p className="text-[11px] text-slate-400">
              Transactional Route (173.45.76.227)
            </p>
          </div>
        </div>

        <button
          onClick={loadBalance}
          disabled={loading}
          className="p-1.5 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 rounded-lg border border-slate-700/60 transition disabled:opacity-50"
          title="Refresh Balance"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Active Balance
          </span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-3xl font-black text-white">
              {balanceState?.success
                ? balanceState.balance.toLocaleString("en-IN")
                : loading
                ? "..."
                : "0"}
            </span>
            <span className="text-xs font-semibold text-emerald-400">Credits</span>
          </div>
        </div>

        <div className="border-t sm:border-t-0 sm:border-l border-slate-800 pt-3 sm:pt-0 sm:pl-4">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Route Status
          </span>
          <div className="flex items-center gap-2 mt-1">
            {balanceState?.success ? (
              <>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" /> Active (trans1)
                </span>
              </>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded-full">
                <AlertCircle className="w-3 h-3" />
                {balanceState?.error || "Offline / Unconfigured"}
              </span>
            )}
          </div>
        </div>

        <div className="border-t sm:border-t-0 sm:border-l border-slate-800 pt-3 sm:pt-0 sm:pl-4">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Features
          </span>
          <p className="text-[11px] text-slate-300 mt-1 leading-snug">
            DLT Compliant • Unicode Hindi • Delivery Reports (✓✓)
          </p>
        </div>
      </div>
    </div>
  );
}
