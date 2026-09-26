"use client";

import { useState, useTransition } from "react";
import { MessageSquare, Send, X, AlertCircle, Info, Phone, User, CheckCircle2 } from "lucide-react";
import { sendIndividualSmsAction } from "@/lib/notification-actions";
import { calculateSmsCredits, SmsCreditEstimate } from "@/lib/sms-calculator";

interface SendParentSmsModalProps {
  studentId: string;
  studentName: string;
  scholarNo: string;
  parentName: string;
  parentPhone: string;
  isSmsEnabled?: boolean;
  smsDisabledReason?: string;
}

export function SendParentSmsModal({
  studentId,
  studentName,
  scholarNo,
  parentName,
  parentPhone,
  isSmsEnabled = true,
  smsDisabledReason = "",
}: SendParentSmsModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [phone, setPhone] = useState(parentPhone || "");
  const [recipientName, setRecipientName] = useState(parentName || `${studentName}'s Parent`);
  const [preset, setPreset] = useState("CUSTOM");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const smsEstimate: SmsCreditEstimate = calculateSmsCredits(message, 1);

  const applyPreset = (presetKey: string) => {
    setPreset(presetKey);
    switch (presetKey) {
      case "PTM":
        setMessage(
          `DPS Kanpur: Dear Parent, kindly attend the Parent-Teacher Meeting (PTM) for ${studentName} (${scholarNo}). Regards, School Office.`
        );
        break;
      case "DOC_REMINDER":
        setMessage(
          `DPS Kanpur: Dear Parent, kindly submit the pending documents (Aadhaar / TC) for ${studentName} (${scholarNo}) at the campus office.`
        );
        break;
      case "ABSENCE":
        setMessage(
          `DPS Kanpur: Dear Parent, this is to inform you regarding ${studentName}'s absence today. Kindly contact the school coordinator.`
        );
        break;
      default:
        setMessage("");
        break;
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 bg-[#0F9D58] hover:bg-emerald-700 text-white px-3.5 py-2 rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
      >
        <MessageSquare className="w-3.5 h-3.5" />
        <span>SMS Parent</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden space-y-4">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black tracking-wide text-white">
                    Send Individual Parent SMS
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    {studentName} ({scholarNo})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body */}
            <form action={sendIndividualSmsAction} className="p-6 space-y-4 pt-0">
              <input type="hidden" name="studentId" value={studentId} />
              <input type="hidden" name="returnUrl" value={`/students/${studentId}`} />

              {!isSmsEnabled && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-900 font-medium">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold">SMS Channel Disabled</strong>
                    <p className="text-[11px] text-rose-800 mt-0.5">
                      {smsDisabledReason || "SMS dispatches are currently paused by the administrator."}
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-400" /> Parent Name
                  </label>
                  <input
                    type="text"
                    name="recipientName"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" /> Mobile Number *
                  </label>
                  <input
                    type="text"
                    name="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    placeholder="10-digit mobile number"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Quick Message Presets
                </label>
                <select
                  value={preset}
                  onChange={(e) => applyPreset(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="CUSTOM">Custom Message</option>
                  <option value="PTM">Parent-Teacher Meeting (PTM) Request</option>
                  <option value="DOC_REMINDER">Document Submission Reminder</option>
                  <option value="ABSENCE">Student Absence Notice</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">Message Content *</label>
                  {message && (
                    <span className="text-[10px] font-bold text-slate-500">
                      {smsEstimate.isUnicode ? (
                        <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-bold">
                          Unicode — {smsEstimate.charCount}/70 chars
                        </span>
                      ) : (
                        <span>
                          {smsEstimate.charCount}/160 chars ({smsEstimate.partsPerMessage} part{smsEstimate.partsPerMessage > 1 ? "s" : ""})
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
                  maxLength={480}
                  placeholder="Type the message to send to the parent..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 flex items-center justify-between text-xs text-slate-600">
                <span className="flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-emerald-600" />
                  Cost: <strong>{smsEstimate.totalCreditsNeeded} SMS Credit(s)</strong>
                </span>
                <span className="text-[11px] text-slate-400">
                  Logged in Audit Trail
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || !isSmsEnabled || !message || !phone}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg bg-[#0F9D58] text-white hover:bg-emerald-700 transition shadow-xs disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isPending ? "Sending..." : "Dispatch SMS Now"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
