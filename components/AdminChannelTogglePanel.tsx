"use client";

import { ShieldAlert, MessageSquare, Mail } from "lucide-react";

interface AdminChannelTogglePanelProps {
  isSmsEnabled: boolean;
  smsDisabledReason: string;
  isEmailEnabled: boolean;
  emailDisabledReason: string;
}

export function AdminChannelTogglePanel({
  isSmsEnabled,
  smsDisabledReason,
  isEmailEnabled,
  emailDisabledReason,
}: AdminChannelTogglePanelProps) {
  return (
    <div className="bg-slate-900 text-white rounded-2xl border border-slate-800 p-4 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
          <ShieldAlert className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-xs font-black tracking-wide uppercase text-slate-200">
            Communication Channel Route Status
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Real-time route operational status. Service toggles are configured under Administration Settings.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* SMS Status */}
        <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-bold">
          <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
          <span>SMS Route:</span>
          <span className={isSmsEnabled ? "text-emerald-400" : "text-rose-400"}>
            {isSmsEnabled ? "Active" : "Disabled"}
          </span>
        </div>

        {/* Email Status */}
        <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-bold">
          <Mail className="w-3.5 h-3.5 text-slate-400" />
          <span>Email Route:</span>
          <span className={isEmailEnabled ? "text-emerald-400" : "text-rose-400"}>
            {isEmailEnabled ? "Active" : "Disabled"}
          </span>
        </div>
      </div>
    </div>
  );
}
