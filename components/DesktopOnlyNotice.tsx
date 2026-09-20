import { Monitor, Smartphone } from "lucide-react";

/**
 * Shown instead of the staff portal on narrow screens.
 *
 * The staff console is dense — wide tables, the CBSE TC form, the RBAC
 * matrix — and does not fold down to a phone usefully. Parent-facing pages
 * (/pay, /public-registration, /verify-tc) are deliberately NOT gated: those
 * are designed for phones and most parents will only ever use them there.
 *
 * Gating is done with a CSS breakpoint rather than user-agent sniffing, so it
 * reacts correctly to rotation and window resizing and cannot be fooled by a
 * spoofed UA string. Tablets (768px and wider) get the full portal.
 */
export function DesktopOnlyNotice() {
  return (
    <div className="md:hidden min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-sm w-full bg-white rounded-2xl border border-slate-200 p-7 space-y-5">
        <img
          src="/echo-logo.png"
          alt="ECHO — DPS Kanpur Portal"
          className="h-12 w-auto mx-auto object-contain"
        />

        <div className="flex items-center justify-center gap-3 text-slate-300">
          <Smartphone className="w-5 h-5" />
          <span className="text-xs font-bold text-slate-400">→</span>
          <Monitor className="w-6 h-6 text-emerald-700" />
        </div>

        <div className="space-y-2">
          <h1 className="text-base font-bold text-slate-900">Please use a laptop or tablet</h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            The staff portal isn&apos;t supported on mobile screens. Open{" "}
            <span className="font-mono text-slate-700">echo.dpskanpur.com</span> on a laptop,
            desktop or tablet to continue.
          </p>
        </div>

        <div className="pt-4 border-t border-slate-100 space-y-3">
          <p className="text-[11px] text-slate-400 leading-relaxed">
            A mobile app for parents is planned for a later phase.
          </p>

          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-slate-600">Parents can still use:</p>
            <div className="flex flex-col gap-1.5">
              <a
                href="/pay"
                className="text-xs font-semibold text-emerald-800 hover:underline"
              >
                Pay school fees →
              </a>
              <a
                href="/public-registration"
                className="text-xs font-semibold text-emerald-800 hover:underline"
              >
                Apply for admission →
              </a>
              <a
                href="/verify-tc"
                className="text-xs font-semibold text-emerald-800 hover:underline"
              >
                Verify a transfer certificate →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
