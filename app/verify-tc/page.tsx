import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { ShieldCheck, Search, CheckCircle2, AlertTriangle } from "lucide-react";
import { PublicShell } from "@/components/PublicShell";

import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Verify Transfer Certificate (TC)",
  description:
    "Official Transfer Certificate (TC) Verification Portal for Delhi Public School (DPS) Kanpur campuses. Verify student TC authenticity online via QR Code or TC Number.",
  openGraph: {
    title: "Verify Transfer Certificate (TC) | DPS Kanpur",
    description:
      "Verify Transfer Certificate (TC) authenticity for DPS Kanpur students across Azad Nagar, Barra, Kidwai Nagar, and Servodaya Nagar campuses.",
    url: "https://echo.dpskanpur.com/verify-tc",
  },
};

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
    <PublicShell
      eyebrow="Transfer Certificate Registry"
      title="Verify a Transfer Certificate"
      subtitle="Scan the QR code on the certificate, or enter its TC number, to check it against DPS Kanpur records."
      badge={
        <>
          <ShieldCheck className="w-3.5 h-3.5" /> Official registry
        </>
      }
    >
      <div className="space-y-6">
        {/* Search Box */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6">
          <form method="GET" className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                TC number or QR security token
              </label>
              <input
                type="text"
                name="tcNo"
                defaultValue={tcNo || token || ""}
                placeholder="e.g. DPS/KID/TC/2026/0042 or TC-KID-2026-V8-0042-VERIFIED"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-800 hover:bg-emerald-900 text-white font-semibold py-2.5 px-4 rounded-lg text-sm transition flex items-center justify-center gap-2"
            >
              <Search className="w-4 h-4" /> Verify certificate
            </button>
          </form>
        </div>

        {/* Verification Result */}
        {searched && (
          <div>
            {tcRecord ? (
              <div className="bg-white rounded-xl border border-emerald-300 p-5 sm:p-6 space-y-5">
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-lg flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-emerald-950">
                      Authentic certificate
                    </h3>
                    <p className="text-xs text-emerald-800">
                      This Transfer Certificate is authentic and officially registered under {tcRecord.student.campus.name}.
                    </p>
                  </div>
                </div>

                {/* Verified Metadata */}
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-xs">
                  <div>
                    <dt className="text-slate-400 block mb-0.5">Pupil Name:</dt>
                    <dd className="mt-0 text-sm text-slate-900 uppercase">
                      {tcRecord.student.firstName} {tcRecord.student.lastName}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-slate-400 block mb-0.5">Scholar / Adm No:</dt>
                    <dd className="mt-0 text-sm text-slate-900 font-mono">
                      {tcRecord.student.scholarNo}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-slate-400 block mb-0.5">Father's Name:</dt>
                    <dd className="mt-0 text-slate-800">{tcRecord.fatherName}</dd>
                  </div>

                  <div>
                    <dt className="text-slate-400 block mb-0.5">Mother's Name:</dt>
                    <dd className="mt-0 text-slate-800">{tcRecord.motherName}</dd>
                  </div>

                  <div>
                    <dt className="text-slate-400 block mb-0.5">Campus:</dt>
                    <dd className="mt-0 text-slate-800">{tcRecord.student.campus.name}</dd>
                  </div>

                  <div>
                    <dt className="text-slate-400 block mb-0.5">Class Last Studied:</dt>
                    <dd className="mt-0 text-slate-800">{tcRecord.classLastStudied}</dd>
                  </div>

                  <div>
                    <dt className="text-slate-400 block mb-0.5">Date of Issue:</dt>
                    <dd className="mt-0 text-slate-800">{formatDate(tcRecord.issueDate)}</dd>
                  </div>

                  <div>
                    <dt className="text-slate-400 block mb-0.5">Reason for Leaving:</dt>
                    <dd className="mt-0 text-slate-800">{tcRecord.reasonForLeaving}</dd>
                  </div>

                </dl>

                <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                  <span>Token: {tcRecord.verificationToken}</span>
                  <span className="font-semibold text-emerald-800">Status: {tcRecord.status}</span>
                </div>
              </div>
            ) : (
              <div className="bg-rose-50 border border-rose-200 p-5 rounded-xl text-center space-y-2 text-xs text-rose-900">
                <AlertTriangle className="w-6 h-6 text-rose-600 mx-auto" />
                <h4 className="font-semibold text-sm">Certificate not found</h4>
                <p>
                  No active Transfer Certificate could be found matching the query. Please verify the TC number or scan the QR code again.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </PublicShell>
  );
}
