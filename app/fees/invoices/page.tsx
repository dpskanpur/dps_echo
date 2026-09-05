import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getCurrentUser, getUserPermissions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Receipt, Search, Filter, CreditCard, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function FeeInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ campus?: string; status?: string; q?: string }>;
}) {
  const { campus: campusId, status, q } = await searchParams;
  const user = await getCurrentUser();
  const permissions = await getUserPermissions(user);

  if (!permissions.modules.fees.canView && !permissions.isAdmin) {
    redirect("/?error=unauthorized_fees");
  }

  const campuses = await prisma.campus.findMany({ orderBy: { name: "asc" } });

  const whereClause: any = {
    ...(campusId && campusId !== "ALL" ? { campusId } : {}),
    ...(status && status !== "ALL" ? { status } : {}),
  };

  if (q) {
    whereClause.OR = [
      { invoiceNo: { contains: q } },
      { student: { firstName: { contains: q } } },
      { student: { lastName: { contains: q } } },
      { student: { scholarNo: { contains: q } } },
    ];
  }

  const invoices = await prisma.feeInvoice.findMany({
    where: whereClause,
    include: {
      student: { include: { campus: true, class: true } },
      items: { include: { feeHead: true } },
      payments: true,
    },
    orderBy: { createdAt: "desc" },
  });

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
                <Receipt className="w-5 h-5 text-emerald-800" />
                <h1 className="text-xl font-black text-slate-900">
                  Fee Invoices & Ledger
                </h1>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Complete audit trail of fee demands, payments, concessions, and outstanding balances.
              </p>
            </div>
            <Link
              href="/fees/collect"
              className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold px-4 py-2 rounded-lg transition flex items-center gap-2 shadow-xs"
            >
              <CreditCard className="w-4 h-4" /> Collect Payment at Desk
            </Link>
          </div>

          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-4">
            <form method="GET" className="flex-1 relative">
              {campusId && <input type="hidden" name="campus" value={campusId} />}
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                name="q"
                defaultValue={q || ""}
                placeholder="Search invoice number, student name or scholar ID..."
                className="w-full bg-slate-50 text-xs border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </form>

            <form method="GET" className="flex items-center gap-2">
              {campusId && <input type="hidden" name="campus" value={campusId} />}
              <select
                name="status"
                defaultValue={status || "ALL"}
                className="bg-slate-50 border border-slate-200 text-xs rounded-lg px-3 py-2 font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="PAID">Paid</option>
                <option value="PENDING">Pending</option>
                <option value="PARTIALLY_PAID">Partially Paid</option>
                <option value="OVERDUE">Overdue</option>
              </select>
              <button
                type="submit"
                className="bg-slate-800 hover:bg-slate-900 text-white text-xs px-3 py-2 rounded-lg font-semibold transition"
              >
                Filter
              </button>
            </form>
          </div>

          {/* Invoices Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Invoice No</th>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Period</th>
                    <th className="py-3 px-4">Gross Demand</th>
                    <th className="py-3 px-4">Paid</th>
                    <th className="py-3 px-4">Balance Due</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        No invoices found.
                      </td>
                    </tr>
                  ) : (
                    invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-slate-900 block">{inv.invoiceNo}</span>
                          <span className="text-[10px] text-slate-400">Due: {formatDate(inv.dueDate)}</span>
                        </td>

                        <td className="py-3 px-4">
                          <Link
                            href={`/students/${inv.studentId}`}
                            className="font-bold text-slate-900 hover:text-emerald-800"
                          >
                            {inv.student.firstName} {inv.student.lastName}
                          </Link>
                          <span className="block text-[11px] text-slate-400">
                            {inv.student.scholarNo} • {inv.student.class.name}
                          </span>
                        </td>

                        <td className="py-3 px-4 font-medium text-slate-700">{inv.periodName}</td>

                        <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                          {formatCurrency(inv.netAmount)}
                        </td>

                        <td className="py-3 px-4 font-mono font-semibold text-emerald-700">
                          {formatCurrency(inv.paidAmount)}
                        </td>

                        <td className="py-3 px-4 font-mono font-bold">
                          <span className={inv.balanceAmount > 0 ? "text-amber-700" : "text-emerald-700"}>
                            {formatCurrency(inv.balanceAmount)}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              inv.status === "PAID"
                                ? "bg-emerald-100 text-emerald-800"
                                : inv.status === "OVERDUE"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          {inv.balanceAmount > 0 ? (
                            <Link
                              href={`/fees/collect?studentId=${inv.studentId}`}
                              className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold px-2.5 py-1 rounded text-[11px]"
                            >
                              Pay Due
                            </Link>
                          ) : (
                            <span className="text-emerald-700 font-semibold text-[11px]">✓ Settled</span>
                          )}
                        </td>
                      </tr>
                    ))
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
