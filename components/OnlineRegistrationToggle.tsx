"use client";

import { useState, useTransition } from "react";
import { toggleOnlineRegistrationPortal } from "@/lib/rbac-actions";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface OnlineRegistrationToggleProps {
  initialIsOpen: boolean;
  compact?: boolean;
}

export function OnlineRegistrationToggle({ initialIsOpen, compact = false }: OnlineRegistrationToggleProps) {
  const [isOpen, setIsOpen] = useState(initialIsOpen);
  const [isPending, startTransition] = useTransition();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleToggle = () => {
    const nextState = !isOpen;
    setIsOpen(nextState); // Optimistic UI update

    startTransition(async () => {
      try {
        await toggleOnlineRegistrationPortal(nextState);
        setToastMessage(nextState ? "Registration is OPEN" : "Registration is CLOSED");
        setTimeout(() => setToastMessage(null), 3000);
      } catch (err: any) {
        setIsOpen(!nextState); // Rollback on error
        setToastMessage(err.message || "Failed to update portal state");
        setTimeout(() => setToastMessage(null), 4000);
      }
    });
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          role="switch"
          aria-checked={isOpen}
          aria-label="Toggle online registration portal"
          disabled={isPending}
          onClick={handleToggle}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-60 ${
            isOpen ? "bg-emerald-600" : "bg-slate-300 dark:bg-slate-600"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
              isOpen ? "translate-x-5" : "translate-x-0"
            }`}
          >
            {isPending ? (
              <Loader2 className="w-2.5 h-2.5 text-slate-500 animate-spin" />
            ) : isOpen ? (
              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
            ) : (
              <XCircle className="w-2.5 h-2.5 text-slate-400" />
            )}
          </span>
        </button>
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
            isOpen
              ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300"
              : "bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300"
          }`}
        >
          {isOpen ? "OPEN" : "CLOSED"}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
      {/* Sliding Switch & Status Badge */}
      <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/80 p-2 sm:px-3 sm:py-2 rounded-2xl border border-slate-200 dark:border-slate-700">
        {/* Toggle Switch */}
        <button
          type="button"
          role="switch"
          aria-checked={isOpen}
          aria-label="Toggle online student registration portal"
          disabled={isPending}
          onClick={handleToggle}
          className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500/40 disabled:opacity-60 ${
            isOpen ? "bg-emerald-600" : "bg-slate-300 dark:bg-slate-600"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
              isOpen ? "translate-x-6" : "translate-x-0"
            }`}
          >
            {isPending ? (
              <Loader2 className="w-3.5 h-3.5 text-slate-500 animate-spin" />
            ) : isOpen ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-slate-400" />
            )}
          </span>
        </button>

        {/* Informative Status Badge */}
        <div
          onClick={handleToggle}
          className="cursor-pointer select-none flex items-center gap-2"
        >
          <span
            className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${
              isOpen
                ? "bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                : "bg-rose-100/80 dark:bg-rose-950/60 text-rose-900 dark:text-rose-300 border-rose-300 dark:border-rose-800"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isOpen ? "bg-emerald-600 animate-pulse" : "bg-rose-600"
              }`}
            />
            <span>{isOpen ? "Registration OPEN" : "Registration CLOSED"}</span>
          </span>
        </div>
      </div>

      {/* Dynamic Toast Feedback */}
      {toastMessage && (
        <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 animate-fadeIn">
          {toastMessage}
        </span>
      )}
    </div>
  );
}
