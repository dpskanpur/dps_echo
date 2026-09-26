"use client";

import { useState } from "react";
import { ShieldAlert, ToggleLeft, ToggleRight, Save, Info } from "lucide-react";
import { updateChannelSettingsAction } from "@/lib/notification-actions";

interface AdminChannelTogglePanelProps {
  isSmsEnabled: boolean;
  smsDisabledReason: string;
  isEmailEnabled: boolean;
  emailDisabledReason: string;
}

export function AdminChannelTogglePanel({
  isSmsEnabled: initialSmsEnabled,
  smsDisabledReason: initialSmsReason,
  isEmailEnabled: initialEmailEnabled,
  emailDisabledReason: initialEmailReason,
}: AdminChannelTogglePanelProps) {
  const [smsEnabled, setSmsEnabled] = useState(initialSmsEnabled);
  const [smsReason, setSmsReason] = useState(initialSmsReason);
  const [emailEnabled, setEmailEnabled] = useState(initialEmailEnabled);
  const [emailReason, setEmailReason] = useState(initialEmailReason);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-md overflow-hidden">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-800/60 transition"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-black tracking-wide uppercase text-slate-200">
              Admin Channel Control &amp; Maintenance Override
            </h3>
            <p className="text-[11px] text-slate-400">
              Enable/Disable SMS &amp; Email channels institution-wide with custom status reasons.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-[11px] font-bold">
            <span className={smsEnabled ? "text-emerald-400" : "text-rose-400"}>
              SMS: {smsEnabled ? "Active" : "Disabled"}
            </span>
            <span className="text-slate-600">•</span>
            <span className={emailEnabled ? "text-emerald-400" : "text-rose-400"}>
              Email: {emailEnabled ? "Active" : "Disabled"}
            </span>
          </div>

          <button
            type="button"
            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            {isOpen ? "Hide Controls" : "Configure Controls"}
          </button>
        </div>
      </div>

      {isOpen && (
        <form action={updateChannelSettingsAction} className="p-5 border-t border-slate-800 bg-slate-950/60 space-y-4">
          <input type="hidden" name="isSmsEnabled" value={smsEnabled ? "true" : "false"} />
          <input type="hidden" name="isEmailEnabled" value={emailEnabled ? "true" : "false"} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* SMS Channel Controls */}
            <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  SMS Broadcast Channel
                </span>
                <button
                  type="button"
                  onClick={() => setSmsEnabled(!smsEnabled)}
                  className="flex items-center gap-1.5 text-xs font-bold transition focus:outline-none"
                >
                  {smsEnabled ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <ToggleRight className="w-6 h-6 text-emerald-400" /> Enabled
                    </span>
                  ) : (
                    <span className="text-rose-400 flex items-center gap-1">
                      <ToggleLeft className="w-6 h-6 text-rose-400" /> Disabled
                    </span>
                  )}
                </button>
              </div>

              {!smsEnabled && (
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-rose-300">
                    Reason for Disabling (Visible to Staff) *
                  </label>
                  <input
                    type="text"
                    name="smsDisabledReason"
                    value={smsReason}
                    onChange={(e) => setSmsReason(e.target.value)}
                    required={!smsEnabled}
                    placeholder="e.g. SMS quota refill in progress until 5:00 PM"
                    className="w-full bg-slate-950 border border-rose-900/60 rounded-lg p-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>
              )}
            </div>

            {/* Email Channel Controls */}
            <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  Email Broadcast Channel
                </span>
                <button
                  type="button"
                  onClick={() => setEmailEnabled(!emailEnabled)}
                  className="flex items-center gap-1.5 text-xs font-bold transition focus:outline-none"
                >
                  {emailEnabled ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <ToggleRight className="w-6 h-6 text-emerald-400" /> Enabled
                    </span>
                  ) : (
                    <span className="text-rose-400 flex items-center gap-1">
                      <ToggleLeft className="w-6 h-6 text-rose-400" /> Disabled
                    </span>
                  )}
                </button>
              </div>

              {!emailEnabled && (
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-rose-300">
                    Reason for Disabling (Visible to Staff) *
                  </label>
                  <input
                    type="text"
                    name="emailDisabledReason"
                    value={emailReason}
                    onChange={(e) => setEmailReason(e.target.value)}
                    required={!emailEnabled}
                    placeholder="e.g. SMTP server maintenance by IT desk"
                    className="w-full bg-slate-950 border border-rose-900/60 rounded-lg p-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-slate-500" />
              Toggling a channel OFF immediately blocks sub-admins from queuing or sending messages on that channel.
            </p>
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition"
            >
              <Save className="w-3.5 h-3.5" /> Save Channel Controls
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
