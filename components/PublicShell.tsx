import Link from "next/link";
import { ReactNode } from "react";

/**
 * Shared chrome for the three public pages.
 *
 * The whole page is one contained, outlined box — header, body and footer
 * stacked inside a single border rather than full-bleed bands running to the
 * screen edges. Square corners, hairline rules, no shadows or gradients.
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
    /*
     * Campus photo behind the page box. 22 KB WebP at its native 720x480,
     * lightly blurred — it sits behind an opaque box and under a dark scrim,
     * so detail would be wasted bytes. Set as a CSS background rather than an
     * <img> so it never blocks the page rendering, with a solid colour under
     * it that shows immediately while the image arrives.
     */
    <div className="relative min-h-screen bg-slate-800 px-3 sm:px-6 py-4 sm:py-8">
      <div
        aria-hidden
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/campus-bg.webp')" }}
      />
      <div aria-hidden className="absolute inset-0 bg-slate-900/60" />

      <div
        className={`relative mx-auto w-full ${container} border border-slate-400 bg-white`}
      >
        {/* Header bar — inside the box, not spanning the viewport */}
        <header className="bg-emerald-900 border-b-2 border-amber-400 px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <img
            src="/dps-logo-white.png"
            alt="Delhi Public School Kanpur"
            width={504}
            height={96}
            className="hidden sm:block h-10 w-auto"
          />
          <img
            src="/dps-crest-white.png"
            alt="Delhi Public School Kanpur"
            width={77}
            height={96}
            className="sm:hidden h-9 w-auto"
          />

          {badge && (
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-100 border border-emerald-600 px-2.5 py-1.5 shrink-0">
              {badge}
            </span>
          )}
        </header>

        {/* Title block */}
        <div className="px-4 sm:px-6 py-4 border-b border-slate-300 bg-slate-50">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800">
            {eyebrow}
          </p>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5">{title}</h1>
          {subtitle && (
            <p className="mt-1.5 text-xs text-slate-600 leading-relaxed max-w-2xl">{subtitle}</p>
          )}
        </div>

        {/* Body */}
        <main className="px-4 sm:px-6 py-5 bg-slate-50">{children}</main>

        {/* Footer bar — closes the box */}
        <footer className="border-t border-slate-300 bg-white px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-[11px] text-slate-500">
            © {new Date().getFullYear()} Delhi Public School Kanpur
          </p>
          <nav className="flex items-center gap-4 text-[11px] font-medium text-slate-600">
            <Link href="/public-registration" className="hover:text-emerald-800">
              Admissions
            </Link>
            <Link href="/pay" className="hover:text-emerald-800">
              Pay Fees
            </Link>
            <Link href="/verify-tc" className="hover:text-emerald-800">
              Verify TC
            </Link>
          </nav>
        </footer>
      </div>
    </div>
  );
}

/** Flat, square surface used for blocks inside the page box. */
export function PublicCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`bg-white border border-slate-300 ${className}`}>{children}</div>;
}
