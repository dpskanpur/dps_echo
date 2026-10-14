"use client";

import { useState, useTransition } from "react";
import { toggleAcademicSession, createAcademicSession } from "@/lib/session-actions";
import {
  Calendar,
  Lock,
  Plus,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  Sparkles,
  Info,
} from "lucide-react";
import { getSessionCategory, getCurrentAcademicStartYear } from "@/lib/session-utils";

interface SessionOption {
  id: string;
  name: string;
  isCurrent: boolean;
}

export function AcademicSessionsManager({ sessions }: { sessions: SessionOption[] }) {
  const [sessionList, setSessionList] = useState<SessionOption[]>(sessions);
  const [newSessionName, setNewSessionName] = useState("");
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const currentAcademicStartYear = getCurrentAcademicStartYear();

  const categorizeSession = (name: string): "PAST" | "CURRENT" | "UPCOMING" | "FUTURE" => {
    return getSessionCategory(name);
  };

  // Compute suggested next session
  const highestStartYear = sessionList.reduce((max, s) => {
    const match = s.name.match(/^(\d{4})/);
    const yr = match ? parseInt(match[1], 10) : 0;
    return yr > max ? yr : max;
  }, currentAcademicStartYear);

  const suggestedNext = `${highestStartYear + 1}-${highestStartYear + 2}`;

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setFeedback({ text, type });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleToggle = (sessionId: string, currentState: boolean, category: string) => {
    if (category === "PAST") {
      showToast("Past sessions remain permanently disabled once the year passes.", "error");
      return;
    }

    if (category === "FUTURE") {
      showToast("Future sessions beyond next year cannot be enabled yet.", "error");
      return;
    }

    const nextState = !currentState;

    if (nextState) {
      // Check concurrency: at most 2 active sessions
      const activeCount = sessionList.filter((s) => s.isCurrent && s.id !== sessionId).length;
      if (activeCount >= 2) {
        showToast(
          "At most two sessions can be active simultaneously (Current Year and Next Year). Please disable one first.",
          "error"
        );
        return;
      }
    } else {
      // Ensure at least 1 session remains active
      const remainingActive = sessionList.filter((s) => s.isCurrent && s.id !== sessionId).length;
      if (remainingActive === 0) {
        showToast("At least one academic session must remain active in the system.", "error");
        return;
      }
    }

    // Optimistic update
    setSessionList((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, isCurrent: nextState } : s))
    );

    startTransition(async () => {
      try {
        await toggleAcademicSession(sessionId, nextState);
        showToast(nextState ? "Session activated successfully!" : "Session deactivated.");
      } catch (err: any) {
        // Rollback
        setSessionList((prev) =>
          prev.map((s) => (s.id === sessionId ? { ...s, isCurrent: currentState } : s))
        );
        showToast(err.message || "Failed to update session status.", "error");
      }
    });
  };

  // Sanitize dash input in real-time
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Automatically convert en-dash, em-dash, and spaces to standard ASCII hyphen
    const clean = e.target.value.replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D\s]/g, "-");
    setNewSessionName(clean);
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2.5 transition-all shadow-sm ${
            feedback.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-900"
              : "bg-rose-50 border border-rose-200 text-rose-900"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* 1. Academic Sessions List & Sliding Toggles Card */}
      <div className="bg-white dark:bg-boxdark rounded-3xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white">
              Institutional Academic Sessions
            </h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Toggle sessions active or inactive. At most two sessions can be active simultaneously (current year and next year). Past sessions remain permanently disabled once the year passes.
            </p>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-mono font-bold shrink-0">
            <Clock className="w-3.5 h-3.5 text-emerald-700" />
            <span>Active: {sessionList.filter((s) => s.isCurrent).length}/2</span>
          </div>
        </div>

        {/* Sessions Roster */}
        <div className="space-y-3">
          {sessionList.map((session) => {
            const category = categorizeSession(session.name);
            const isPast = category === "PAST";
            const isFuture = category === "FUTURE";
            const isEligible = !isPast && !isFuture;

            return (
              <div
                key={session.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  session.isCurrent
                    ? "bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 shadow-2xs"
                    : isPast
                    ? "bg-slate-50/50 border-slate-200/60 opacity-80"
                    : "bg-white dark:bg-boxdark border-slate-200"
                }`}
              >
                {/* Session Meta */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                      session.isCurrent
                        ? "bg-emerald-600 text-white shadow-xs"
                        : isPast
                        ? "bg-slate-200 text-slate-500"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {isPast ? <Lock className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-base font-black text-slate-900 dark:text-white">
                        {session.name}
                      </span>

                      {/* Category Tag */}
                      {category === "CURRENT" && (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-200">
                          Current Session
                        </span>
                      )}
                      {category === "UPCOMING" && (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md border border-amber-200">
                          Upcoming Session
                        </span>
                      )}
                      {category === "FUTURE" && (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200">
                          Future Session
                        </span>
                      )}
                      {category === "PAST" && (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Past Session (Closed)
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {category === "PAST"
                        ? "Archived past academic year. Closed to new admissions."
                        : category === "FUTURE"
                        ? "Future session. Can be enabled when within next-year admissions window."
                        : session.isCurrent
                        ? "Currently ACTIVE for student admissions, invoices, and records."
                        : "Eligible for activation. Toggle switch to open for admissions."}
                    </p>
                  </div>
                </div>

                {/* Sliding Toggle Control */}
                <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                  {/* Status Indicator Pill */}
                  <span
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-xl border flex items-center gap-1.5 ${
                      session.isCurrent
                        ? "bg-emerald-100/90 text-emerald-900 border-emerald-300"
                        : "bg-slate-100 text-slate-600 border-slate-200"
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        session.isCurrent ? "bg-emerald-600 animate-pulse" : "bg-slate-400"
                      }`}
                    />
                    <span>{session.isCurrent ? "ACTIVE" : "INACTIVE"}</span>
                  </span>

                  {/* Sliding Switch Button */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={session.isCurrent}
                    disabled={!isEligible || isPending}
                    onClick={() => handleToggle(session.id, session.isCurrent, category)}
                    title={
                      isPast
                        ? "Past sessions remain permanently disabled once the year passes"
                        : isFuture
                        ? "Future sessions beyond next year cannot be enabled yet"
                        : "Click to toggle session active status"
                    }
                    className={`relative inline-flex h-7 w-13 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      !isEligible
                        ? "bg-slate-200 dark:bg-slate-700 opacity-60 cursor-not-allowed"
                        : session.isCurrent
                        ? "bg-emerald-600 cursor-pointer"
                        : "bg-slate-300 dark:bg-slate-600 cursor-pointer"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
                        session.isCurrent ? "translate-x-6" : "translate-x-0"
                      }`}
                    >
                      {isPast ? (
                        <Lock className="w-3 h-3 text-slate-400" />
                      ) : session.isCurrent ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      ) : null}
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Open a New Session Card */}
      <div className="bg-white dark:bg-boxdark rounded-3xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-4">
        <div>
          <h2 className="text-sm font-black text-slate-900 dark:text-white">
            Open a New Academic Session
          </h2>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Create an upcoming session in advance. Once created, it can be enabled when it enters the immediate next-year admission window.
          </p>
        </div>

        {/* Quick Suggestion Button */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Quick suggest:</span>
          <button
            type="button"
            onClick={() => setNewSessionName(suggestedNext)}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>+ Pre-fill {suggestedNext}</span>
          </button>
        </div>

        <form action={createAcademicSession} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Session Name *
            </label>
            <input
              type="text"
              name="name"
              required
              value={newSessionName}
              onChange={handleInputChange}
              placeholder="e.g. 2027-2028"
              pattern="[0-9]{4}[-–—\u2010-\u2015][0-9]{4}"
              title="Consecutive four-digit years separated by a hyphen, e.g. 2027-2028"
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
            />
          </div>

          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-emerald-800 text-white hover:bg-emerald-900 transition shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4 text-amber-300" />
            <span>Create Session</span>
          </button>
        </form>

        <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>April to March format. Consecutive years only (e.g. 2027-2028). Standard hyphens and copy-pasted en-dashes are both supported.</span>
        </p>
      </div>
    </div>
  );
}
