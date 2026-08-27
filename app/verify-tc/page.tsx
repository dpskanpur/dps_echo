import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { ShieldCheck, Search, Building2, CheckCircle2, AlertTriangle, QrCode, Lock } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PublicVerifyTCPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; tcNo?: string }>;
}) {
  const { token, tcNo } = await searchParams;

  let tcRecord: any = null;
  let searched = false;

  if (token || tcNo) {
    searched = true;
    tcRecord = await prisma.transferCertificate.findFirst({
      where: {
        OR: [
          ...(token ? [{ verificationToken: token }] : []),
          ...(tcNo ? [{ tcNumber: tcNo.trim() }] : []),
        ],
      },
      include: {
        student: {
          include: { campus: true, class: true },
        },
      },
    });
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between">
      {/* Header */}
      <header className="bg-emerald-950 text-white py-4 px-6 border-b border-emerald-900 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-300 flex items-center justify-center font-bold text-slate-950 text-sm shadow">
              DE
            </div>
            <div>
              <h1 className="text-sm font-black tracking-wide">DPS Kanpur</h1>
              <p className="text-[11px] text-emerald-300 font-medium">Official Transfer Certificate Registry</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-emerald-200">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> Tamper-Proof Verification
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto w-full p-4 sm:p-6 space-y-6 my-auto">
        <div className="text-center space-y-1">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">
            Public Transfer Certificate (TC) Verification
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Scan the QR code on a student's certificate or enter the official TC Number below to verify authenticity directly against DPS Kanpur records.
          </p>
        </div>

        {/* Search Box */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm max-w-xl mx-auto">
          <form method="GET" className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                TC Number or QR Security Token *
              </label>
              <input
                type="text"
                name="tcNo"
                defaultValue={tcNo || token || ""}
                placeholder="e.g. DPS/KID/TC/2026/0042 or TC-KID-2026-V8-0042-VERIFIED"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-800 hover:bg-emerald-900 text-white font-bold py-2.5 px-4 rounded-lg text-xs transition shadow-sm flex items-center justify-center gap-2"
            >
              <Search className="w-4 h-4" /> Verify Certificate Authenticity
            </button>
          </form>
        </div>

        {/* Verification Result */}
        {searched && (
          <div className="max-w-2xl mx-auto">
            {tcRecord ? (
              <div className="bg-white rounded-2xl border-2 border-emerald-500 p-6 shadow-md space-y-6 relative overflow-hidden">
                {/* Official Stamp Ribbon */}
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center gap-3">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />
                  <div>
                    <h3 className="text-sm font-bold text-emerald-950">
                      ✓ Authentic Certificate Verified by DPS Kanpur
                    </h3>
                    <p className="text-xs text-emerald-800">
                      This Transfer Certificate is authentic and officially registered under {tcRecord.student.campus.name}.
                    </p>
                  </div>
                </div>

                {/* Verified Metadata */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block">Pupil Name:</span>
                    <strong className="text-sm text-slate-900 uppercase">
                      {tcRecord.student.firstName} {tcRecord.student.lastName}
                    </strong>
                  </div>

                  <div>
                    <span className="text-slate-400 block">Scholar / Adm No:</span>
                    <strong className="text-sm text-slate-900 font-mono">
                      {tcRecord.student.scholarNo}
                    </strong>
                  </div>

                  <div>
                    <span className="text-slate-400 block">Father's Name:</span>
                    <strong className="text-slate-800">{tcRecord.fatherName}</strong>
                  </div>

                  <div>
                    <span className="text-slate-400 block">Mother's Name:</span>
                    <strong className="text-slate-800">{tcRecord.motherName}</strong>
                  </div>

                  <div>
                    <span className="text-slate-400 block">Campus:</span>
                    <strong className="text-slate-800">{tcRecord.student.campus.name}</strong>
                  </div>

                  <div>
                    <span className="text-slate-400 block">Class Last Studied:</span>
                    <strong className="text-slate-800">{tcRecord.classLastStudied}</strong>
                  </div>

                  <div>
                    <span className="text-slate-400 block">Date of Issue:</span>
                    <strong className="text-slate-800">{formatDate(tcRecord.issueDate)}</strong>
                  </div>

                  <div>
                    <span className="text-slate-400 block">Reason for Leaving:</span>
                    <strong className="text-slate-800">{tcRecord.reasonForLeaving}</strong>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Token: {tcRecord.verificationToken}</span>
                  <span className="font-semibold text-emerald-800">Status: {tcRecord.status}</span>
                </div>
              </div>
            ) : (
              <div className="bg-rose-50 border border-rose-200 p-6 rounded-2xl text-center space-y-2 text-xs text-rose-900">
                <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto" />
                <h4 className="font-bold text-sm">Certificate Record Not Found</h4>
                <p>
                  No active Transfer Certificate could be found matching the query. Please verify the TC number or scan the QR code again.
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-6 text-center text-xs text-slate-500">
        <p>© 2026 Delhi Public School Kanpur Group • DPS Echo Registry</p>
      </footer>
    </div>
  );
}
