"use client";

import { useEffect, useState } from "react";
import { Laptop, Smartphone, ShieldAlert, Monitor, ArrowUpRight } from "lucide-react";

export function MobileDeviceGuard() {
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [currentWidth, setCurrentWidth] = useState<number>(0);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    const checkDevice = () => {
      const width = window.innerWidth;
      setCurrentWidth(width);
      const isMobileAgent = /Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
      // Restrict screens smaller than 768px (standard mobile screens)
      setIsMobile(width < 768 || isMobileAgent);
    };

    checkDevice();
    window.addEventListener("resize", checkDevice);
    return () => window.removeEventListener("resize", checkDevice);
  }, []);

  if (!mounted || !isMobile) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-6 text-white antialiased">
      {/* Background Subtle Gradient Blobs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Top Restricted Device Icon Graphic */}
        <div className="relative mx-auto w-20 h-20 rounded-3xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center shadow-inner">
          <div className="flex items-center gap-2">
            <Laptop className="w-8 h-8 text-emerald-400" />
            <span className="text-slate-600 font-bold">/</span>
            <Smartphone className="w-6 h-6 text-rose-400" />
          </div>
          <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-md">
            <ShieldAlert className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Headline */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] font-semibold uppercase tracking-wider">
            Mobile Access Restricted
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Desktop & Larger Screen Only
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed pt-1">
            <strong className="text-slate-200">DPS Echo</strong> is an enterprise administrative portal designed exclusively for laptop, desktop, and tablet workstations.
          </p>
        </div>

        {/* Resolution Indicator Badge */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-left space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Monitor className="w-3.5 h-3.5 text-emerald-400" />
              Your Screen Width:
            </span>
            <span className="font-mono font-bold text-amber-400">{currentWidth}px</span>
          </div>
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/80">
            <span className="text-slate-400">Required Screen Width:</span>
            <span className="font-mono font-bold text-emerald-400">≥ 768px (Tablet / Laptop)</span>
          </div>
        </div>

        {/* Action Hint */}
        <div className="pt-2 text-xs text-slate-400 space-y-3">
          <p>
            Please open this URL on your laptop, Mac, PC workstation, or iPad/Tablet to log in:
          </p>
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl py-2 px-3 text-slate-300 font-mono text-[11px] flex items-center justify-center gap-2 select-all">
            <span>http://localhost:8088</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
          </div>
        </div>

        {/* Footer Security Note */}
        <div className="text-[11px] text-slate-400 font-medium">
          Official Administrative Portal • Delhi Public School Kanpur
        </div>
      </div>
    </div>
  );
}
