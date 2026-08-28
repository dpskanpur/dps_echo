"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Clock, LogOut } from "lucide-react";
import { IDLE_TIMEOUT_MS, IDLE_WARNING_MS } from "@/lib/permissions";

const PUBLIC_PATHS = ["/login", "/pay", "/verify-tc", "/public-registration", "/api/v1"];
const ACTIVITY_EVENTS = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "click"] as const;
const PING_THROTTLE_MS = 60 * 1000;

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function formatCountdown(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function IdleSessionGuard() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const lastActivityRef = useRef(Date.now());
  const lastPingRef = useRef(0);
  const [warningMs, setWarningMs] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const logoutIdle = useCallback((reason = "idle_timeout") => {
    window.location.href = `/api/auth/logout?reason=${reason}`;
  }, []);

  const pingActivity = useCallback(async () => {
    const now = Date.now();
    if (now - lastPingRef.current < PING_THROTTLE_MS) return;
    lastPingRef.current = now;
    try {
      const res = await fetch("/api/auth/activity", { method: "POST", credentials: "same-origin" });
      if (res.status === 401) {
        logoutIdle("idle_timeout");
      }
    } catch {
      // Network errors should not force logout; idle timer still applies locally.
    }
  }, [logoutIdle]);

  const markActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    setWarningMs((prev) => (prev === null ? prev : null));
    void pingActivity();
  }, [pingActivity]);

  useEffect(() => {
    if (!mounted || isPublicPath(pathname)) {
      if (pathname === "/login" && typeof window !== "undefined") {
        sessionStorage.removeItem("dps_session_tab_token");
      }
      return;
    }

    // Tab Closure Guard: Validate tab-scoped session token in sessionStorage
    const isLoginRedirect = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("login_success");
    if (isLoginRedirect) {
      sessionStorage.setItem("dps_session_tab_token", Date.now().toString());
    } else if (!sessionStorage.getItem("dps_session_tab_token")) {
      logoutIdle("tab_closed");
      return;
    }

    lastActivityRef.current = Date.now();
    void pingActivity();

    const onActivity = () => markActivity();
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, onActivity, { passive: true }));

    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastActivityRef.current >= IDLE_TIMEOUT_MS) {
        logoutIdle("idle_timeout");
        return;
      }
      markActivity();
    };
    document.addEventListener("visibilitychange", onVisibility);

    const tick = window.setInterval(() => {
      const idleFor = Date.now() - lastActivityRef.current;
      if (idleFor >= IDLE_TIMEOUT_MS) {
        logoutIdle("idle_timeout");
        return;
      }
      const remaining = IDLE_TIMEOUT_MS - idleFor;
      setWarningMs((prev) => {
        const next = remaining <= IDLE_WARNING_MS ? remaining : null;
        if (next === null) return prev === null ? prev : null;
        return next;
      });
    }, 1000);

    return () => {
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, onActivity));
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(tick);
    };
  }, [mounted, pathname, markActivity, pingActivity, logoutIdle]);

  if (!mounted || isPublicPath(pathname) || warningMs === null) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm rounded-2xl border border-amber-200 bg-white p-4 shadow-xl">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
          <Clock className="h-5 w-5" />
        </div>
        <div className="min-w-0 space-y-2">
          <p className="text-sm font-bold text-slate-900">Session idle timeout</p>
          <p className="text-xs text-slate-600">
            You will be signed out in{" "}
            <span className="font-mono font-bold text-amber-800">{formatCountdown(warningMs)}</span> due to inactivity.
          </p>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={markActivity}
              className="rounded-lg bg-[#0F9D58] px-3 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-700"
            >
              Stay signed in
            </button>
            <a
              href="/api/auth/logout"
              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-bold text-slate-500 hover:bg-slate-100 hover:text-rose-600"
            >
              <LogOut className="h-3 w-3" />
              Sign out
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
