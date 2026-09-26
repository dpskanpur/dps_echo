"use client";

import { useState, useTransition } from "react";
import { Megaphone, Send, Mail, MessageSquare, AlertCircle, Info, Calculator, CheckCircle2 } from "lucide-react";
import { sendAnnouncement } from "@/lib/notification-actions";
import { calculateSmsCredits, SmsCreditEstimate } from "@/lib/sms-calculator";

interface CampusOption {
  id: string;
  name: string;
}

interface ClassOption {
  id: string;
  name: string;
}

interface SmsAnnouncementComposerProps {
  campuses: CampusOption[];
  classes: ClassOption[];
  scopeCampusId?: string | null;
  lockedCampus?: boolean;
  isSmsEnabled?: boolean;
  smsDisabledReason?: string;
  isEmailEnabled?: boolean;
  emailDisabledReason?: string;
}

export function SmsAnnouncementComposer({
  campuses,
  classes,
  scopeCampusId,
  lockedCampus = false,
  isSmsEnabled = true,
  smsDisabledReason = "",
  isEmailEnabled = true,
  emailDisabledReason = "",
}: SmsAnnouncementComposerProps) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sendEmail, setSendEmail] = useState(isEmailEnabled);
  const [sendSms, setSendSms] = useState(isSmsEnabled);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Estimate SMS credits locally
  // Assuming estimated recipient count per class ~ 40, or 200 for campus, or 1000 for all
  const recipientEst = 100; 
  const smsEstimate: SmsCreditEstimate = calculateSmsCredits(
    message ? `DPS Kanpur: ${subject} — ${message}` : "",
    recipientEst
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (sendSms && !showConfirmModal) {
      e.preventDefault();
      setShowConfirmModal(true);
    }
  };

  const confirmAndSubmit = () => {
    setShowConfirmModal(false);
    const form = document.getElementById("announcement-form") as HTMLFormElement;
    if (form) {
      startTransition(() => {
        form.requestSubmit();
      });
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-[#0F9D58]" />
          <h2 className="text-sm font-black text-slate-900">Send an Announcement</h2>
        </div>
        <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
          Audit Enabled
        </span>
      </div>

      <form id="announcement-form" action={sendAnnouncement} onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Campus</label>
            <select
              name="campusId"
              defaultValue={scopeCampusId || "ALL"}
              disabled={lockedCampus}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 disabled:opacity-70"
            >
              {!lockedCampus && <option value="ALL">All Campuses</option>}
              {campuses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Class Scope</label>
            <select
              name="classId"
              defaultValue="ALL"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            >
              <option value="ALL">All Classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Subject *</label>
          <input
            type="text"
            name="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
            maxLength={120}
            placeholder="e.g. Annual Sports Meet — 15 December"
            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-bold text-slate-700">Message *</label>
            {sendSms && message && (
              <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1.5">
                {smsEstimate.isUnicode ? (
                  <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-bold">
                    Unicode (Hindi/Special) — {smsEstimate.charCount}/70 chars per SMS
                  </span>
                ) : (
                  <span className="text-slate-600">
                    {smsEstimate.charCount}/160 chars per SMS ({smsEstimate.partsPerMessage} part{smsEstimate.partsPerMessage > 1 ? "s" : ""})
                  </span>
                )}
              </span>
            )}
          </div>
          <textarea
            name="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            rows={4}
            maxLength={1000}
            placeholder="Keep it concise for SMS delivery. DLT templates and Unicode are supported."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
          />
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-4">
            <label
              className={`flex items-center gap-2 text-xs font-semibold ${
                !isEmailEnabled ? "text-slate-400 cursor-not-allowed" : "text-slate-700 cursor-pointer"
              }`}
            >
              <input
                type="checkbox"
                name="channelEmail"
                checked={sendEmail && isEmailEnabled}
                disabled={!isEmailEnabled}
                onChange={(e) => setSendEmail(e.target.checked)}
                className="accent-[#0F9D58]"
              />
              <Mail className="w-3.5 h-3.5 text-slate-400" /> Email Channel
              {!isEmailEnabled && <span className="text-[10px] text-rose-600 font-bold">(Disabled)</span>}
            </label>
            <label
              className={`flex items-center gap-2 text-xs font-semibold ${
                !isSmsEnabled ? "text-slate-400 cursor-not-allowed" : "text-slate-700 cursor-pointer"
              }`}
            >
              <input
                type="checkbox"
                name="channelSms"
                checked={sendSms && isSmsEnabled}
                disabled={!isSmsEnabled}
                onChange={(e) => setSendSms(e.target.checked)}
                className="accent-[#0F9D58]"
              />
              <MessageSquare className="w-3.5 h-3.5 text-slate-400" /> SMS Channel
              {!isSmsEnabled && <span className="text-[10px] text-rose-600 font-bold">(Disabled)</span>}
            </label>
          </div>

          <button
            type="submit"
            disabled={isPending || ((!sendEmail || !isEmailEnabled) && (!sendSms || !isSmsEnabled))}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-lg bg-[#0F9D58] text-white hover:bg-emerald-700 transition shadow-sm disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" /> {isPending ? "Queuing..." : "Queue & Dispatch"}
          </button>
        </div>
      </form>

      {/* Pre-Send Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-50 text-[#0F9D58] rounded-xl border border-emerald-100">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">Pre-Send Credit Summary</h3>
                <p className="text-xs text-slate-500">Confirm SMS dispatch calculation</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 text-xs space-y-2.5 border border-slate-200">
              <div className="flex justify-between text-slate-600">
                <span>Message Format:</span>
                <span className="font-bold text-slate-800">
                  {smsEstimate.isUnicode ? "Unicode (Hindi)" : "Standard English ASCII"}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total Characters:</span>
                <span className="font-bold text-slate-800">{smsEstimate.charCount} chars</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Parts per SMS:</span>
                <span className="font-bold text-slate-800">{smsEstimate.partsPerMessage} part(s)</span>
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-slate-900 text-sm">
                <span>Estimated Credits / SMS:</span>
                <span className="text-[#0F9D58]">{smsEstimate.partsPerMessage} Credit(s)</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Every SMS broadcast is logged in the system Audit Trail with your staff credentials.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              >
                Edit Message
              </button>
              <button
                type="button"
                onClick={confirmAndSubmit}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-[#0F9D58] text-white hover:bg-emerald-700 shadow-sm"
              >
                Confirm &amp; Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
