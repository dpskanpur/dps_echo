import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getCurrentUser, getUserPermissions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AlertTriangle, Phone, Mail, CreditCard, Send, MessageSquare } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DefaultersPage({
  searchParams,
}: {
  searchParams: Promise<{ campus?: string }>;
}) {
  const { campus: campusId } = await searchParams;
  const user = await getCurrentUser();
  const permissions = await getUserPermissions(user);

  if (!permissions.modules.fees.canView && !permissions.isAdmin) {
    redirect("/?error=unauthorized_fees");
  }

  const campuses = await prisma.campus.findMany({ orderBy: { name: "asc" } });

  const defaulters = await prisma.feeInvoice.findMany({
    where: {
      status: { in: ["OVERDUE", "PENDING", "PARTIALLY_PAID"] },
      balanceAmount: { gt: 0 },
      ...(campusId && campusId !== "ALL" ? { campusId } : {}),
    },
    include: {
      student: {
        include: {
          campus: true,
          class: true,
          guardians: { where: { isPrimary: true } },
        },
      },
    },
    orderBy: { dueDate: "asc" },
  });

  const totalOverdueAmount = defaulters.reduce((acc, inv) => acc + inv.balanceAmount, 0);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar userEmail={user?.email} userRole={user?.role} permissions={permissions} />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar campuses={campuses} selectedCampusId={campusId} user={user || undefined} permissions={permissions} />

        <main className="p-8 space-y-6 flex-1 overflow-y-auto max-w-6xl mx-auto w-full">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-700" />
                <h1 className="text-xl font-black text-slate-900">
                  Defaulters & Fee Dues Tracker
                </h1>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Real-time tracking of pending and overdue student fee balances with parent reminder dispatch.
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl text-right">
              <span className="text-[11px] font-bold text-amber-800 uppercase block">
                Total Outstanding Dues
              </span>
              <span className="text-xl font-black text-amber-900">
                {formatCurrency(totalOverdueAmount)}
              </span>
            </div>
          </div>

          {/* Defaulter Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">
                Students with Outstanding Dues ({defaulters.length})
              </h3>
              <button
                type="button"
                className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition flex items-center gap-1.5"
              >
                <MessageSquare className="w-3.5 h-3.5" /> Bulk WhatsApp / SMS Reminder
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Student & Scholar No</th>
                    <th className="py-3 px-4">Campus / Class</th>
                    <th className="py-3 px-4">Parent Contact</th>
                    <th className="py-3 px-4">Period / Invoice</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4">Overdue Balance</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {defaulters.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No outstanding dues found! All student fees are up to date.
                      </td>
                    </tr>
                  ) : (
                    defaulters.map((inv) => {
                      const primaryGuardian = inv.student.guardians[0];
                      return (
                        <tr key={inv.id} className="hover:bg-slate-50/80">
                          <td className="py-3 px-4">
                            <Link
                              href={`/students/${inv.studentId}`}
                              className="font-bold text-slate-900 hover:text-emerald-800"
                            >
                              {inv.student.firstName} {inv.student.lastName}
                            </Link>
                            <span className="block text-[11px] font-mono text-slate-400">
                              {inv.student.scholarNo}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <span className="font-semibold text-slate-800 block">
                              {inv.student.class.name}
                            </span>
                            <span className="text-[10px] text-emerald-800 font-bold">
                              {inv.student.campus.code}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <span className="font-medium text-slate-800 block">
                              {primaryGuardian?.name || "Guardian"}
                            </span>
                            <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {primaryGuardian?.phone || inv.student.emergencyContact || "-"}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <span className="font-medium text-slate-700 block">{inv.periodName}</span>
                            <span className="text-[10px] font-mono text-slate-400">{inv.invoiceNo}</span>
                          </td>

                          <td className="py-3 px-4">
                            <span className="text-rose-700 font-bold block">{formatDate(inv.dueDate)}</span>
                            {inv.fineAmount > 0 && (
                              <span className="text-[10px] text-rose-500 font-medium">+₹{inv.fineAmount} late fine</span>
                            )}
                          </td>

                          <td className="py-3 px-4 font-mono font-black text-amber-700 text-sm">
                            {formatCurrency(inv.balanceAmount)}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <Link
                              href={`/fees/collect?studentId=${inv.studentId}`}
                              className="inline-flex items-center gap-1 bg-emerald-800 hover:bg-emerald-900 text-white font-bold px-2.5 py-1 rounded text-[11px]"
                            >
                              <CreditCard className="w-3 h-3" /> Collect
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
