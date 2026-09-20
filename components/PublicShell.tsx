import Link from "next/link";
import { ReactNode } from "react";

/**
 * Shared chrome for the three public pages (admissions, fee payment, TC
 * verification).
 *
 * These are the only pages parents see, often on a phone and on a slow
 * connection, so the shell carries no images, no gradients and no client
 * JavaScript — the brand mark is plain markup. Each page supplies only its
 * own content.
 */
export function PublicShell({
  eyebrow,
  title,
  subtitle,
  badge,
  width = "narrow",
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  width?: "narrow" | "wide";
  children: ReactNode;
}) {
  const container = width === "wide" ? "max-w-5xl" : "max-w-3xl";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-emerald-900 text-white">
        <div className={`mx-auto w-full ${container} px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4`}>
          {/* Official lockup. Two assets rather than one: the full wordmark's
              campus line is unreadable below ~640px, so small screens get the
              crest alone. Both are white-on-transparent, greyscale+alpha. */}
          <div className="flex items-center min-w-0">
            <img
              src="/dps-logo-white.png"
              alt="Delhi Public School Kanpur"
              width={504}
              height={96}
              className="hidden sm:block h-11 w-auto"
            />
            <img
              src="/dps-crest-white.png"
              alt="Delhi Public School Kanpur"
              width={77}
              height={96}
              className="sm:hidden h-10 w-auto"
            />
            <span className="sm:hidden ml-2.5 min-w-0">
              <span className="block text-[13px] font-bold tracking-tight leading-tight truncate">
                DPS Kanpur
              </span>
              <span className="block text-[11px] text-emerald-200/90 leading-tight truncate">
                {eyebrow}
              </span>
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {badge && (
              <span className="hidden sm:flex items-center gap-1.5 text-[11px] font-medium text-emerald-100/90 bg-emerald-950/40 border border-emerald-700/50 px-2.5 py-1.5 rounded-lg">
                {badge}
              </span>
            )}
            <Link
              href="/login"
              className="hidden sm:block text-[11px] font-semibold text-emerald-200 hover:text-white transition border border-emerald-700/50 px-2.5 py-1.5 rounded-lg"
            >
              Staff Login
            </Link>
          </div>
        </div>

        {/* Gold rule — the school's accent colour, and the line that keeps the
            header from reading as an empty green band. */}
        <div className="h-[3px] bg-gradient-to-r from-amber-400 via-amber-300 to-emerald-600" />
      </header>

      <main className={`flex-1 w-full ${container} mx-auto px-4 sm:px-6 py-8 sm:py-10`}>
        <div className="mb-6 pb-5 border-b border-slate-200">
          <span className="block text-[11px] font-semibold uppercase tracking-wider text-emerald-800 mb-1.5">
            {eyebrow}
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
          {subtitle && (
            <p className="mt-2 text-xs sm:text-sm text-slate-500 leading-relaxed max-w-2xl">
              {subtitle}
            </p>
          )}
        </div>

        {children}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className={`mx-auto w-full ${container} px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3`}>
          <p className="text-[11px] text-slate-500 text-center sm:text-left">
            © {new Date().getFullYear()}{" "}
            <span className="font-semibold text-slate-600">Delhi Public School Kanpur</span>
          </p>
          <nav className="flex items-center gap-5 text-[11px] font-medium text-slate-500">
            <Link href="/public-registration" className="hover:text-emerald-800 transition">
              Admissions
            </Link>
            <Link href="/pay" className="hover:text-emerald-800 transition">
              Pay Fees
            </Link>
            <Link href="/verify-tc" className="hover:text-emerald-800 transition">
              Verify TC
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

/** Plain white card — the single surface used across the public pages. */
export function PublicCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 ${className}`}>{children}</div>
  );
}
