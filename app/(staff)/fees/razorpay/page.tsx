import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getCurrentUser, getUserPermissions } from "@/lib/auth";
import {
  getOnlinePaymentSettings,
  updateCampusCredentialsAction,
} from "@/lib/fee-settings-actions";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import {
  CreditCard,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Save,
  Activity,
  Receipt,
  Search,
  Filter,
  ArrowUpRight,
  XCircle,
  Clock,
  ShieldCheck,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function RazorpayConsolePage({
  searchParams,
}: {
  searchParams: Promise<{
    notice?: string;
    campus?: string;
    status?: string;
    campusFilter?: string;
  }>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const permissions = await getUserPermissions(user);

  if (!permissions.modules.fees.canView && !permissions.isAdmin) {
    redirect("/?error=unauthorized_fees");
  }

  const canUpdate = permissions.modules.fees.canUpdate || permissions.isAdmin;
  const { campuses } = await getOnlinePaymentSettings();

  const statusFilter = params.status && params.status !== "ALL" ? params.status : undefined;
  const campusFilter = params.campusFilter && params.campusFilter !== "ALL" ? params.campusFilter : undefined;

  // Query payment orders for analytics & transaction ledger
  const orders = await prisma.paymentOrder.findMany({
    where: {
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(campusFilter ? { invoice: { campusId: campusFilter } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      student: {
        select: {
          firstName: true,
          lastName: true,
          scholarNo: true,
          campus: { select: { code: true, name: true } },
        },
      },
      invoice: {
        select: {
          invoiceNo: true,
          periodName: true,
          campusId: true,
        },
      },
    },
  });

  // Calculate gateway statistics across all recorded orders
  const allOrders = await prisma.paymentOrder.findMany({
    select: {
      amount: true,
      amountPaid: true,
      status: true,
    },
  });

  const totalOrdersCount = allOrders.length;
  const successfulOrders = allOrders.filter((o) => o.status === "PAID" || o.status === "SUCCESS");
  const failedOrders = allOrders.filter((o) => o.status === "FAILED");

  const totalCollectedAmount = successfulOrders.reduce((acc, o) => acc + (o.amountPaid || o.amount), 0);
  const totalFailedAmount = failedOrders.reduce((acc, o) => acc + o.amount, 0);
  const successRate = totalOrdersCount > 0 ? Math.round((successfulOrders.length / totalOrdersCount) * 100) : 100;

  return (
    <main className="p-6 sm:p-8 space-y-6 flex-1 overflow-y-auto max-w-7xl mx-auto w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-900 text-white flex items-center justify-center font-bold shadow-md">
            <CreditCard className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Razorpay Gateway &amp; Payment Transactions
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage per-school Razorpay API key credentials and monitor live fee collection analytics.
            </p>
          </div>
        </div>

        {params.notice && (
          <div className="px-3.5 py-2 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-950 text-xs font-bold flex items-center gap-2 shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>
              {params.notice === "credentials_updated"
                ? `Razorpay credentials for ${params.campus || "campus"} updated successfully.`
                : "Settings saved successfully."}
            </span>
          </div>
        )}
      </div>

      {/* GATEWAY METRICS SUMMARY DASHBOARD */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Collected */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Online Fees Collected
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-emerald-950">
            {formatCurrency(totalCollectedAmount)}
          </div>
          <p className="text-[11px] text-slate-400">
            Across {successfulOrders.length} successful transaction(s)
          </p>
        </div>

        {/* Success Rate */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Gateway Success Rate
            </span>
            <div className="p-2 rounded-xl bg-sky-50 text-sky-700 border border-sky-200">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-sky-950">
            {successRate}%
          </div>
          <p className="text-[11px] text-slate-400">
            {successfulOrders.length} of {totalOrdersCount} orders completed
          </p>
        </div>

        {/* Failed / Abandoned */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Failed / Abandoned Orders
            </span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-rose-950">
            {failedOrders.length}
          </div>
          <p className="text-[11px] text-slate-400">
            Volume: {formatCurrency(totalFailedAmount)}
          </p>
        </div>

        {/* Configured Schools */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Configured Schools
            </span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {campuses.length} Campuses
          </div>
          <p className="text-[11px] text-slate-400">
            Multi-tenant API credential matrix
          </p>
        </div>
      </div>

      {/* SECTION 1: SCHOOL-WISE RAZORPAY API CREDENTIALS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-800" />
            <h2 className="text-base font-black text-slate-900">
              School-Wise Razorpay API Key Credentials ({campuses.length} Campuses)
            </h2>
          </div>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
            API Keys Configuration
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {campuses.map((campus) => {
            const isEnabled = campus.isOnlinePaymentEnabled;
            const isLocked = !canUpdate || !isEnabled;

            return (
              <div
                key={campus.id}
                className={`bg-white rounded-3xl border shadow-xs p-6 space-y-4 transition ${
                  !isEnabled ? "border-rose-200 bg-rose-50/20" : "border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 font-mono font-bold text-xs flex items-center justify-center border border-emerald-200">
                      {campus.code}
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900">{campus.name}</h3>
                      <p className="text-[11px] text-slate-400">Campus Code: {campus.code}</p>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      !isEnabled
                        ? "bg-rose-100 text-rose-800 border-rose-200"
                        : campus.razorpayKeyId
                        ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                        : "bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                  >
                    {!isEnabled
                      ? "Disabled by Admin"
                      : campus.razorpayKeyId
                      ? "CUSTOM KEY CONFIGURED"
                      : "DEFAULT ENVIRONMENT KEY"}
                  </span>
                </div>

                {!isEnabled && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-900 font-medium flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span>
                      Online fee payment for {campus.code} is <strong>Disabled by Admin</strong> in Admin Settings. API credentials are locked.
                    </span>
                  </div>
                )}

                <form action={updateCampusCredentialsAction} className="space-y-3">
                  <input type="hidden" name="campusId" value={campus.id} />

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Razorpay Key ID ({campus.code})
                    </label>
                    <input
                      type="text"
                      name="razorpayKeyId"
                      defaultValue={campus.razorpayKeyId || ""}
                      placeholder="rzp_live_... (Default: System Environment Variable)"
                      disabled={isLocked}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 disabled:opacity-60 disabled:bg-slate-100 disabled:cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Razorpay Key Secret ({campus.code})
                    </label>
                    <input
                      type="password"
                      name="razorpayKeySecret"
                      defaultValue={campus.razorpayKeySecret || ""}
                      placeholder="•••••••••••••••• (Leave blank to keep current)"
                      disabled={isLocked}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 disabled:opacity-60 disabled:bg-slate-100 disabled:cursor-not-allowed"
                    />
                  </div>

                  {canUpdate && (
                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={!isEnabled}
                        className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl text-white transition shadow-xs ${
                          isEnabled
                            ? "bg-[#0F9D58] hover:bg-emerald-700 cursor-pointer"
                            : "bg-slate-300 text-slate-500 cursor-not-allowed"
                        }`}
                      >
                        <Save className="w-3.5 h-3.5" /> Save {campus.code} API Keys
                      </button>
                    </div>
                  )}
                </form>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: LIVE PAYMENT TRANSACTIONS LEDGER */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden space-y-4">
        <div className="p-5 sm:p-6 border-b border-slate-200 bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-700" />
              Live Gateway Payment Orders Ledger ({orders.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time audit log of student online fee checkout orders, payment IDs, and completion statuses.
            </p>
          </div>

          {/* Filters */}
          <form method="GET" className="flex flex-wrap items-center gap-2">
            <select
              name="status"
              defaultValue={params.status || "ALL"}
              className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800"
            >
              <option value="ALL">All Statuses</option>
              <option value="PAID">Successful (PAID)</option>
              <option value="FAILED">Failed (FAILED)</option>
              <option value="CREATED">Pending (CREATED)</option>
            </select>

            <select
              name="campusFilter"
              defaultValue={params.campusFilter || "ALL"}
              className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800"
            >
              <option value="ALL">All Campuses</option>
              {campuses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>

            <button
              type="submit"
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition shadow-xs cursor-pointer"
            >
              Apply Filter
            </button>
          </form>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider border-b border-slate-800">
                <th className="py-3.5 px-5">Date &amp; Time</th>
                <th className="py-3.5 px-5">Gateway Order / Payment ID</th>
                <th className="py-3.5 px-5">Student &amp; Scholar No</th>
                <th className="py-3.5 px-5">Campus</th>
                <th className="py-3.5 px-5">Invoice / Period</th>
                <th className="py-3.5 px-5">Amount</th>
                <th className="py-3.5 px-5">Payer Details</th>
                <th className="py-3.5 px-5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No payment orders recorded yet under this filter.
                  </td>
                </tr>
              ) : (
                orders.map((ord) => {
                  const isSuccess = ord.status === "PAID" || ord.status === "SUCCESS";
                  const isFailed = ord.status === "FAILED";

                  return (
                    <tr key={ord.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-5 text-slate-500 whitespace-nowrap">
                        {formatDateTime(ord.createdAt)}
                      </td>
                      <td className="py-3.5 px-5 font-mono text-[11px]">
                        <span className="font-bold text-slate-900 block">{ord.gatewayOrderId}</span>
                        {ord.gatewayPaymentId && (
                          <span className="text-[10px] text-emerald-800 font-semibold block mt-0.5">
                            Txn: {ord.gatewayPaymentId}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-5">
                        <span className="font-bold text-slate-900 block">
                          {ord.student.firstName} {ord.student.lastName}
                        </span>
                        <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 mt-0.5 inline-block">
                          {ord.student.scholarNo}
                        </span>
                      </td>
                      <td className="py-3.5 px-5">
                        <span className="font-mono font-bold text-xs text-slate-800 bg-emerald-50 text-emerald-950 px-2 py-0.5 rounded border border-emerald-200">
                          {ord.student.campus.code}
                        </span>
                      </td>
                      <td className="py-3.5 px-5">
                        <span className="font-mono font-semibold text-slate-800 block text-[11px]">
                          {ord.invoice.invoiceNo}
                        </span>
                        <span className="text-[10px] text-slate-500 block">{ord.invoice.periodName}</span>
                      </td>
                      <td className="py-3.5 px-5 font-mono font-black text-slate-900 text-sm">
                        {formatCurrency(ord.amountPaid || ord.amount)}
                      </td>
                      <td className="py-3.5 px-5 text-[11px] text-slate-600">
                        <span>{ord.payerEmail || "—"}</span>
                        {ord.payerContact && (
                          <span className="block font-mono text-slate-400">{ord.payerContact}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                            isSuccess
                              ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                              : isFailed
                              ? "bg-rose-100 text-rose-800 border-rose-200"
                              : "bg-amber-100 text-amber-800 border-amber-200"
                          }`}
                        >
                          {isSuccess ? "✓ PAID" : isFailed ? "✗ FAILED" : "• PENDING"}
                        </span>
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
  );
}
