"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ShieldCheck, Lock, AlertCircle, ArrowRight, Quote, Monitor, Shield, CheckCircle2 } from "lucide-react";
import Link from "next/link";

function LoginForm() {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/";
  const errorParam = searchParams.get("error");
  const errorDetail = searchParams.get("detail");
  const attemptedEmail = searchParams.get("attempted");

  const googleAuthHref = `/api/auth/google?redirect=${encodeURIComponent(redirectUrl)}`;

  return (
    <div className="min-h-screen w-full bg-slate-950 flex items-stretch antialiased selection:bg-[#005A36] selection:text-white">
      {/* LEFT COLUMN: Campus Photo & Motivational Slogan (Preserved) */}
      <div className="hidden lg:flex lg:w-3/5 xl:w-2/3 relative flex-col justify-between p-10 xl:p-14 overflow-hidden bg-slate-900">
        {/* Campus Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 scale-100"
          style={{
            backgroundImage: `url('/dps-azad-nagar-real.png')`,
          }}
        />
        {/* Soft Contrast Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/30 to-slate-950/70" />

        {/* TOP LEFT: Official DPS Header Logo */}
        <div className="relative z-10">
          <div className="inline-block bg-slate-950/75 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/15 shadow-2xl">
            <img
              src="/dps-logo-white.png"
              alt="Delhi Public School - Azaad Nagar | Barra | Servodaya Nagar | Kidwai Nagar"
              className="h-12 xl:h-14 w-auto object-contain"
            />
          </div>
        </div>

        {/* BOTTOM LEFT: Motivational Slogan */}
        <div className="relative z-10 max-w-xl">
          <div className="bg-slate-950/80 backdrop-blur-md p-6 sm:p-8 rounded-3xl border border-white/15 shadow-2xl space-y-3">
            <div className="flex items-center gap-2 text-emerald-400">
              <Quote className="w-4 h-4" />
              <span className="text-xs uppercase tracking-widest font-bold">Inspiring Growth & Excellence</span>
            </div>
            <p className="text-white text-base xl:text-lg font-medium leading-relaxed">
              "Empowering inquisitive minds, fostering integrity, and nurturing tomorrow's global leaders through the transformative power of education."
            </p>
            <p className="text-xs text-slate-300 font-light pt-1">
              Where curiosity finds purpose and dedication builds the future.
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Executive Enterprise Redesigned Panel */}
      <div className="w-full lg:w-2/5 xl:w-1/3 bg-slate-50/50 flex flex-col justify-between p-8 sm:p-12 relative overflow-y-auto">
        {/* Top Header Row */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#005A36] text-white flex items-center justify-center font-black text-sm shadow-md">
              E
            </div>
            <div>
              <span className="block font-black text-slate-900 text-sm tracking-tight">DPS ECHO</span>
              <span className="block text-[10px] text-slate-500 font-medium">Enterprise Portal</span>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full text-[11px] font-semibold text-[#005A36]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Portal Active</span>
          </div>
        </div>

        {/* Center Card Container */}
        <div className="max-w-md w-full mx-auto my-auto py-8 space-y-7">
          {/* Section Title */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-semibold">
              <Shield className="w-3.5 h-3.5 text-[#005A36]" />
              <span>Official Faculty & Staff Single Sign-On</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight pt-1">
              Welcome back
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Sign in with your official DPS Google Workspace account (<span className="font-semibold text-slate-700">@dpskanpur.com</span>) to access your administrative dashboard.
            </p>
          </div>

          {/* Error Notice Card */}
          {errorParam && (
            <div className="bg-rose-50 border border-rose-200/90 rounded-2xl p-4 text-left flex items-start gap-3 text-xs text-rose-900 shadow-sm animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <strong className="block font-bold">
                  {errorParam === "idle_timeout" ? "Session Idle Timeout (10 Mins)" : errorParam === "tab_closed" ? "Tab Closed" : "Sign-in Notice"}
                </strong>
                <p className="text-[11px] text-rose-700 leading-relaxed">
                  {errorParam === "idle_timeout"
                    ? "You were automatically signed out after 10 minutes of idle inactivity. Please sign in with Google to resume."
                    : errorParam === "tab_closed"
                    ? "Your session ended because the browser tab was closed. Please sign in with Google to start a fresh session."
                    : errorParam === "session_expired_unauthorized"
                    ? "Your unprivileged session expired. Ask an administrator to grant access, then sign in again."
                    : errorParam === "domain_not_allowed"
                    ? `Account "${attemptedEmail || ""}" is unauthorized. Only @dpskanpur.com accounts are permitted.`
                    : errorParam === "google_oauth_missing"
                    ? "Google OAuth keys (GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET) are not configured in .env."
                    : errorDetail
                    ? `Google Auth Error: ${errorDetail}`
                    : "Could not authenticate your Google account. Please try again."}
                </p>
              </div>
            </div>
          )}

          {/* Main Actions Container */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xl shadow-slate-200/40 space-y-6">
            {/* Primary Action Button */}
            <a
              href={googleAuthHref}
              className="w-full bg-[#005A36] hover:bg-[#00472a] active:bg-[#003821] text-white font-bold py-4 px-5 rounded-2xl text-xs sm:text-sm transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                {/* White Container for Google G Logo */}
                <div className="w-7 h-7 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm">
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                </div>
                <span>Sign in with Google</span>
              </div>
              <ArrowRight className="w-4 h-4 text-emerald-300 group-hover:translate-x-1 transition-transform" />
            </a>

            {/* Allowed Domain & Security Features list */}
            <div className="space-y-3 pt-1">
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-700 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Authorized Domain</span>
                </div>
                <span className="font-mono font-bold text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] shadow-2xs">
                  @dpskanpur.com
                </span>
              </div>

              {/* Security Policy Features */}
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 font-medium pt-1">
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-xl p-2">
                  <Lock className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>10-Min Idle Out</span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-xl p-2">
                  <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>HMAC SHA-256</span>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop & Laptop Only Notice Banner */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3.5 flex items-center gap-3 text-xs text-amber-900">
            <Monitor className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-[11px] text-amber-800 font-medium leading-snug">
              <strong className="block text-amber-950 font-bold">Desktop & Laptop Workstation Required</strong>
              This portal is restricted to desktop and tablet web browsers (≥ 768px).
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-6 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
          <span className="font-medium">© 2026 DPS Kanpur</span>
          <div className="flex items-center gap-3 font-semibold">
            <Link href="/pay" className="hover:text-[#005A36] transition">
              Quick Pay ↗
            </Link>
            <span className="text-slate-300">•</span>
            <Link href="/verify-tc" className="hover:text-[#005A36] transition">
              Verify TC ↗
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-emerald-400 text-xs font-mono">
          Loading DPS Echo Portal...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
