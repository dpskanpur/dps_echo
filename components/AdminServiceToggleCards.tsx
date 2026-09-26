"use client";

import { useState, useEffect } from "react";
import { CreditCard, MessageSquare, Mail, Sliders } from "lucide-react";

interface AdminServiceToggleCardsProps {
  campusName: string;
  campusCode: string;
  isOnlinePaymentEnabled: boolean;
  isSmsEnabled: boolean;
  isEmailEnabled: boolean;
}

export function AdminServiceToggleCards({
  campusName,
  campusCode,
  isOnlinePaymentEnabled: initialOnlinePay,
  isSmsEnabled: initialSms,
  isEmailEnabled: initialEmail,
}: AdminServiceToggleCardsProps) {
  const [onlinePay, setOnlinePay] = useState(initialOnlinePay);
  const [sms, setSms] = useState(initialSms);
  const [email, setEmail] = useState(initialEmail);

  // Sync state when campus selection changes
  useEffect(() => {
    setOnlinePay(initialOnlinePay);
    setSms(initialSms);
    setEmail(initialEmail);
  }, [initialOnlinePay, initialSms, initialEmail, campusCode]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 text-emerald-800">
          <Sliders className="w-4 h-4" />
          <span>1. Services &amp; Gateway Controls ({campusCode})</span>
        </h3>
        <span className="text-[11px] text-slate-400 font-medium">
          Toggle switch to enable or disable school services
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 bg-slate-50/80 p-5 rounded-2xl border border-slate-200/80">
        {/* 1. ONLINE FEE PAYMENT CARD */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-4 shadow-2xs">
          <input
            type="hidden"
            name="isOnlinePaymentEnabled"
            value={onlinePay ? "true" : "false"}
          />

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-800" />
                <span className="text-xs font-black text-slate-900">Online Fee Payment</span>
              </div>

              {/* Sliding Toggle Switch Button */}
              <button
                type="button"
                role="switch"
                aria-checked={onlinePay}
                onClick={() => setOnlinePay(!onlinePay)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  onlinePay ? "bg-emerald-600" : "bg-slate-300"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    onlinePay ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Razorpay online fee payment portal for parents of {campusName}.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Service Status
            </span>
            <span
              className={`text-[11px] font-bold px-3 py-1 rounded-full border transition-all flex items-center gap-1.5 ${
                onlinePay
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200 shadow-2xs"
                  : "bg-rose-50 text-rose-800 border-rose-200 shadow-2xs"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  onlinePay ? "bg-emerald-500" : "bg-rose-500"
                }`}
              />
              <span>{onlinePay ? "Enabled" : "Disabled by Admin"}</span>
            </span>
          </div>
        </div>

        {/* 2. SMS GATEWAY CHANNEL CARD */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-4 shadow-2xs">
          <input type="hidden" name="isSmsEnabled" value={sms ? "true" : "false"} />

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-800" />
                <span className="text-xs font-black text-slate-900">SMS Gateway Channel</span>
              </div>

              {/* Sliding Toggle Switch Button */}
              <button
                type="button"
                role="switch"
                aria-checked={sms}
                onClick={() => setSms(!sms)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  sms ? "bg-emerald-600" : "bg-slate-300"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    sms ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              SMS delivery for notices, fee receipts &amp; alerts for {campusName}.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Channel Status
            </span>
            <span
              className={`text-[11px] font-bold px-3 py-1 rounded-full border transition-all flex items-center gap-1.5 ${
                sms
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200 shadow-2xs"
                  : "bg-rose-50 text-rose-800 border-rose-200 shadow-2xs"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${sms ? "bg-emerald-500" : "bg-rose-500"}`}
              />
              <span>{sms ? "Enabled" : "Disabled by Admin"}</span>
            </span>
          </div>
        </div>

        {/* 3. EMAIL NOTIFICATION CHANNEL CARD */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-4 shadow-2xs">
          <input type="hidden" name="isEmailEnabled" value={email ? "true" : "false"} />

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-emerald-800" />
                <span className="text-xs font-black text-slate-900">Email Notification Channel</span>
              </div>

              {/* Sliding Toggle Switch Button */}
              <button
                type="button"
                role="switch"
                aria-checked={email}
                onClick={() => setEmail(!email)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  email ? "bg-emerald-600" : "bg-slate-300"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    email ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Email notifications for admissions &amp; circulars for {campusName}.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Channel Status
            </span>
            <span
              className={`text-[11px] font-bold px-3 py-1 rounded-full border transition-all flex items-center gap-1.5 ${
                email
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200 shadow-2xs"
                  : "bg-rose-50 text-rose-800 border-rose-200 shadow-2xs"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${email ? "bg-emerald-500" : "bg-rose-500"}`}
              />
              <span>{email ? "Enabled" : "Disabled by Admin"}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
