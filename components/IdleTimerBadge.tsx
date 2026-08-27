"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Clock, RefreshCw } from "lucide-react";
import { IDLE_TIMEOUT_MS } from "@/lib/permissions";
import { usePathname } from "next/navigation";

const PUBLIC_PATHS = ["/login", "/pay", "/verify-tc"];
const ACTIVITY_EVENTS = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "click"] as const;
const PING_THROTTLE_MS = 60 * 1000;

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function formatTime(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function IdleTimerBadge({ showFullLabel = false }: { showFullLabel?: boolean }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const lastActivityRef = useRef<number>(Date.now());
  const lastPingRef = useRef<number>(0);
  const [remainingMs, setRemainingMs] = useState<number>(IDLE_TIMEOUT_MS);

  useEffect(() => {
    setMounted(true);
  }, []);

  const pingActivity = useCallback(async () => {
    const now = Date.now();
    if (now - lastPingRef.current < PING_THROTTLE_MS) return;
    lastPingRef.current = now;
    try {
      await fetch("/api/auth/activity", { method: "POST", credentials: "same-origin" });
    } catch {
      // Ignore network errors
    }
  }, []);

  const markActivity = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    setRemainingMs(IDLE_TIMEOUT_MS);
    void pingActivity();
  }, [pingActivity]);

  useEffect(() => {
    if (!mounted || isPublicPath(pathname)) return;

    lastActivityRef.current = Date.now();

    const onActivity = () => markActivity();
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, onActivity, { passive: true }));

    const tick = window.setInterval(() => {
      const idleFor = Date.now() - lastActivityRef.current;
      const remaining = Math.max(0, IDLE_TIMEOUT_MS - idleFor);
      setRemainingMs(remaining);
    }, 1000);

    return () => {
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, onActivity));
      window.clearInterval(tick);
    };
  }, [mounted, pathname, markActivity]);

  if (!mounted || isPublicPath(pathname)) return null;

  const remainingMinutes = remainingMs / (60 * 1000);
  let colorClasses = "bg-slate-100 text-slate-700 border-slate-200/80 hover:bg-slate-200/70";
  let iconColor = "text-emerald-600";

  if (remainingMinutes <= 2) {
    colorClasses = "bg-rose-50 text-rose-700 border-rose-200 animate-pulse";
    iconColor = "text-rose-600";
  } else if (remainingMinutes <= 5) {
    colorClasses = "bg-amber-50 text-amber-800 border-amber-200";
    iconColor = "text-amber-600";
  }

  return (
    <div
      onClick={markActivity}
      title="30-Minute Idle Session Counter — click or move mouse/press key to reset timer"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono font-medium transition cursor-pointer select-none ${colorClasses}`}
    >
      <Clock className={`w-3.5 h-3.5 ${iconColor}`} />
      {showFullLabel && <span className="font-sans text-[11px] font-semibold text-slate-500">Idle Session:</span>}
      <span className="font-bold tracking-tight">{formatTime(remainingMs)}</span>
      <RefreshCw className="w-3 h-3 text-slate-400 hover:text-slate-600 transition ml-0.5" />
    </div>
  );
}
