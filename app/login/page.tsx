"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, ArrowRight, Quote } from "lucide-react";
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
      {/* LEFT COLUMN: Campus Photo & Slogan (Preserved) */}
      <div className="hidden lg:flex lg:w-3/5 xl:w-2/3 relative flex-col justify-between p-10 xl:p-14 overflow-hidden bg-slate-900">
        {/* Campus Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-75"
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

      {/* RIGHT COLUMN: Ultra-Clean, Intuitive & Minimal Login Panel */}
      <div className="w-full lg:w-2/5 xl:w-1/3 bg-white flex flex-col justify-between p-8 sm:p-12">
        {/* Mobile Header Logo */}
        <div className="flex lg:hidden items-center justify-between pb-6 border-b border-slate-100">
          <img
            src="/dps-logo-white.png"
            alt="DPS Logo"
            className="h-9 w-auto object-contain invert brightness-0"
          />
        </div>

        <div className="hidden lg:block" />

        {/* Login Card */}
        <div className="max-w-sm w-full mx-auto my-auto py-8 space-y-6">
          {/* ECHO Portal Brand Logo (Emblem + Text Side-by-Side) */}
          <div className="pb-2 flex justify-start">
            <img
              src="/echo-logo.png"
              alt="ECHO — DPS Kanpur Portal Logo"
              className="h-20 sm:h-24 w-auto object-contain transition-all"
            />
          </div>

          {/* Header */}
          <div className="space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Sign in
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Sign in with your official Google Workspace account.
            </p>
          </div>

          {/* Error Notice */}
          {errorParam && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-rose-900">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold">
                  {errorParam === "idle_timeout" ? "Session Expired" : errorParam === "tab_closed" ? "Tab Closed" : "Sign-in Notice"}
                </strong>
                <p className="text-[11px] text-rose-700 mt-0.5 leading-relaxed">
                  {errorParam === "idle_timeout"
                    ? "You were signed out after 10 minutes of inactivity."
                    : errorParam === "tab_closed"
                    ? "Your session ended because the tab was closed."
                    : errorParam === "domain_not_allowed"
                    ? `Account "${attemptedEmail || ""}" is unauthorized. Only @dpskanpur.com is permitted.`
                    : errorDetail
                    ? `Google Error: ${errorDetail}`
                    : "Could not authenticate your Google account. Please try again."}
                </p>
              </div>
            </div>
          )}

          {/* Google Sign-In Primary Action */}
          <div className="space-y-4">
            <a
              href={googleAuthHref}
              className="w-full bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 font-semibold py-3.5 px-4 rounded-xl text-xs sm:text-sm transition border border-slate-300 hover:border-emerald-600 shadow-xs flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                {/* 4-Color Google G */}
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
                <span>Sign in with Google</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition" />
            </a>

            {/* Minimal Allowed Domain Note */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
              <span>Allowed Domain</span>
              <span className="font-mono font-bold text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                @dpskanpur.com
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <span>© 2026 DPS Kanpur</span>
          <div className="flex items-center gap-3">
            <Link href="/pay" className="hover:text-slate-700 transition">
              Quick Pay ↗
            </Link>
            <span>•</span>
            <Link href="/verify-tc" className="hover:text-slate-700 transition">
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
          Loading DPS Echo...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
