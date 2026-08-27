"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ShieldCheck, Lock, AlertCircle, ArrowRight, Quote } from "lucide-react";
import Link from "next/link";

function LoginForm() {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/";
  const errorParam = searchParams.get("error");
  const attemptedEmail = searchParams.get("attempted");
  const [loadingDev, setLoadingDev] = useState(false);

  const googleAuthHref = `/api/auth/google?redirect=${encodeURIComponent(redirectUrl)}`;

  const handleDevLogin = async () => {
    setLoadingDev(true);
    try {
      const res = await fetch("/api/auth/dev-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "admin@dpskanpur.com",
          name: "System Administrator",
          role: "SUPER_ADMIN",
          redirectUrl,
        }),
      });
      const data = await res.json();
      if (data.success) {
        window.location.href = data.redirectUrl || "/";
      } else {
        alert(data.error || "Login failed");
      }
    } catch (err: any) {
      alert("Dev login failed: " + err.message);
    } finally {
      setLoadingDev(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex items-stretch antialiased selection:bg-[#34A853] selection:text-white">
      {/* LEFT COLUMN: Campus Photo & Motivational Slogan */}
      <div className="hidden lg:flex lg:w-3/5 xl:w-2/3 relative flex-col justify-between p-10 xl:p-14 overflow-hidden bg-slate-900">
        {/* Campus Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 scale-100"
          style={{
            backgroundImage: `url('/dps-azad-nagar-real.png')`,
          }}
        />
        {/* Soft Contrast Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-slate-950/70" />

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
          <div className="bg-slate-950/75 backdrop-blur-md p-6 rounded-2xl border border-white/15 shadow-2xl space-y-2">
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

      {/* RIGHT COLUMN: Ultra-Clean Pristine White & Google Green Login Panel */}
      <div className="w-full lg:w-2/5 xl:w-1/3 bg-white flex flex-col justify-between p-8 sm:p-12">
        {/* Mobile Logo Fallback */}
        <div className="flex lg:hidden items-center justify-between pb-6 border-b border-slate-100">
          <img
            src="/dps-logo-white.png"
            alt="DPS Logo"
            className="h-10 w-auto object-contain invert brightness-0"
          />
        </div>

        {/* Top Verified Badge */}
        <div className="hidden lg:flex items-center justify-end">
          <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full text-[11px] font-semibold text-[#0F9D58]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#0F9D58]" />
            <span>Google Workspace Verified</span>
          </div>
        </div>

        {/* Center Main Login Card */}
        <div className="max-w-sm w-full mx-auto my-auto py-8 space-y-8">
          {/* Header */}
          <div className="space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#0F9D58] shadow-xs">
              <Lock className="w-5 h-5 text-[#0F9D58]" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Sign in
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Sign in with your official DPS Google Workspace account to access DPS Echo.
            </p>
          </div>

          {/* Error Notice */}
          {errorParam && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 text-left flex items-start gap-2.5 text-xs text-rose-900 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">
                  {errorParam === "idle_timeout" ? "Session expired" : "Sign-in Failed"}
                </strong>
                <p className="text-[11px] text-rose-700 mt-0.5">
                  {errorParam === "idle_timeout"
                    ? "You were signed out after 30 minutes of inactivity. Sign in with Google to continue."
                    : errorParam === "session_expired_unauthorized"
                    ? "Your unprivileged session expired. Ask an administrator to grant access, then sign in again."
                    : errorParam === "domain_not_allowed"
                    ? `Account "${attemptedEmail || ""}" is unauthorized. Only @dpskanpur.com accounts are permitted.`
                    : errorParam === "google_oauth_missing"
                    ? "Google OAuth keys are not configured in .env yet. Click 'Quick Admin Sign-In (Local Preview)' below to test locally."
                    : "Could not authenticate your Google account. Please try again."}
                </p>
              </div>
            </div>
          )}

          {/* Google Sign-In Primary Action & Quick Dev Login */}
          <div className="space-y-3">
            <a
              href={googleAuthHref}
              className="w-full bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 font-bold py-3.5 px-4 rounded-2xl text-xs sm:text-sm transition-all duration-200 border border-slate-300 hover:border-[#0F9D58] shadow-sm hover:shadow-md flex items-center justify-center gap-3 group cursor-pointer"
            >
              {/* Google 4-Color G */}
              <svg className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
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
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#0F9D58] transition-colors ml-auto" />
            </a>

            <button
              type="button"
              onClick={handleDevLogin}
              disabled={loadingDev}
              className="w-full bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-bold py-3 px-4 rounded-2xl text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>{loadingDev ? "Signing In..." : "Quick Admin Sign-In (Local Preview)"}</span>
            </button>

            {/* Allowed Domain Notice */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2 flex items-center justify-between text-[11px] text-slate-600">
              <span className="font-medium">Allowed Domain</span>
              <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                @dpskanpur.com
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <span>© 2026 DPS Kanpur</span>
          <div className="flex items-center gap-3">
            <Link href="/pay" className="hover:text-[#0F9D58] transition">
              Quick Pay ↗
            </Link>
            <span>•</span>
            <Link href="/verify-tc" className="hover:text-[#0F9D58] transition">
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
