"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Database } from "lucide-react";

/**
 * Route-level error boundary.
 *
 * Without this file Next cannot render a failure and falls back to
 * "missing required error components, refreshing…", which hides the actual
 * cause. In development the real message is shown; in production only a
 * neutral message and the error digest for correlating with server logs.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app error]", error);
  }, [error]);

  const isDev = process.env.NODE_ENV !== "production";
  const message = error?.message || "";

  // Database problems are by far the most common cause here, and the raw
  // Prisma text is not obvious unless you already know what to look for.
  const looksLikeDbIssue =
    /P1001|P1000|P1003|ECONNREFUSED|Can't reach database|database server|prisma/i.test(message);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-7 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            {looksLikeDbIssue ? <Database className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900">
              {looksLikeDbIssue ? "Database Unavailable" : "Something Went Wrong"}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {looksLikeDbIssue
                ? "The portal could not reach its database."
                : "This page could not be rendered."}
            </p>
          </div>
        </div>

        {looksLikeDbIssue && (
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 leading-relaxed space-y-1.5">
            <p className="font-bold text-slate-700">Check, in order:</p>
            <p>
              1. PostgreSQL is running — <code className="font-mono">docker compose up -d</code>
            </p>
            <p>
              2. The schema exists — <code className="font-mono">npx prisma migrate dev</code>
            </p>
            <p>
              3. <code className="font-mono">DATABASE_URL</code> in <code className="font-mono">.env</code>{" "}
              points at that database
            </p>
          </div>
        )}

        {isDev && message && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
            <p className="text-[10px] font-bold uppercase tracking-wider text-rose-700 mb-1">
              Development detail
            </p>
            <p className="text-[11px] text-rose-900 font-mono break-words leading-relaxed">{message}</p>
          </div>
        )}

        {error?.digest && (
          <p className="text-[10px] text-slate-400 font-mono">Error digest: {error.digest}</p>
        )}

        <button
          onClick={reset}
          className="w-full bg-[#0F9D58] hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition shadow-sm flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Try Again
        </button>
      </div>
    </div>
  );
}
