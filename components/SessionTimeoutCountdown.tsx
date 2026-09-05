"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, ShieldAlert, LogOut, RefreshCw, Mail } from "lucide-react";

export function SessionTimeoutCountdown({ initialSeconds = 60 }: { initialSeconds?: number }) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const router = useRouter();

  useEffect(() => {
    if (secondsLeft <= 0) {
      // Auto logout and redirect to login
      window.location.href = "/api/auth/logout?reason=session_expired_unauthorized";
      return;
    }

    const timer = setInterval(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsLeft, router]);

  const progressPercent = Math.max(0, (secondsLeft / initialSeconds) * 100);

  return (
    <div className="w-full max-w-lg bg-white rounded-3xl p-8 border border-rose-200 shadow-xl space-y-6 text-center animate-in fade-in zoom-in-95 duration-300">
      {/* Icon */}
      <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto shadow-sm">
        <ShieldAlert className="w-8 h-8 text-rose-600" />
      </div>

      {/* Heading */}
      <div className="space-y-2">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
          Access Pending Approval
        </h2>
        <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
          Your Google account was authenticated successfully, but no module permissions (View/Update/Delete) have been assigned to your profile by the administrator yet.
        </p>
      </div>

      {/* 60-Second Auto-Expire Box */}
      <div className="bg-rose-50/70 border border-rose-200/80 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-rose-900">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-rose-600 animate-pulse" />
            <span>Automatic Session Timeout</span>
          </div>
          <span className="font-mono text-sm bg-rose-200/70 text-rose-900 px-2.5 py-0.5 rounded-full">
            {secondsLeft}s
          </span>
        </div>

        {/* Animated Progress Bar */}
        <div className="w-full bg-rose-200/60 h-2 rounded-full overflow-hidden">
          <div
            className="bg-rose-600 h-full transition-all duration-1000 ease-linear rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <p className="text-[11px] text-rose-700">
          For security reasons, unprivileged sessions are terminated in 1 minute.
        </p>
      </div>

      {/* Admin Contact Information */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs text-slate-600 space-y-1.5 text-left">
        <div className="font-bold text-slate-800 flex items-center gap-2">
          <Mail className="w-3.5 h-3.5 text-[#0F9D58]" />
          <span>Need access to Student or Fee modules?</span>
        </div>
        <p className="text-[11px] text-slate-500">
          Contact your Campus IT Administrator at{" "}
          <strong className="text-slate-900 font-mono">admin@dpskanpur.com</strong> to grant you role permissions on the RBAC management console.
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={() => window.location.reload()}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition active:scale-95 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Check Again</span>
        </button>

        <a
          href="/api/auth/logout"
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition shadow-sm active:scale-95 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </a>
      </div>
    </div>
  );
}
