import { prisma } from "@/lib/prisma";
import { getCurrentUser, getUserPermissions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { listAcademicSessions, getActiveSessionName } from "@/lib/academic-session";
import { Pagination } from "@/components/Pagination";
import {
  History,
  Search,
  Filter,
  User,
  Calendar,
  Building2,
  Activity,
  FileText,
  Clock,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface AuditLogsPageProps {
  searchParams: Promise<{
    session?: string;
    campus?: string;
    action?: string;
    user?: string;
    page?: string;
  }>;
}

export default async function AuditLogsPage({ searchParams }: AuditLogsPageProps) {
  const { session: filterSession, campus: filterCampus, action: filterAction, user: filterUser, page: pageStr } =
    await searchParams;

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }

  const permissions = await getUserPermissions(currentUser);
  if (!permissions.isAdmin && !permissions.modules.audit?.canView && !permissions.modules.rbac.canView) {
    redirect("/?error=unauthorized_audit_logs");
  }

  const currentPage = Math.max(1, parseInt(pageStr || "1", 10));
  const pageSize = 10;

  // Active session fallback for default dropdown display
  const activeSessionName = await getActiveSessionName();

  // Fetch filter options
  const [sessionsList, campusesList] = await Promise.all([
    listAcademicSessions(),
    prisma.campus.findMany({ select: { code: true, name: true }, orderBy: { code: "asc" } }),
  ]);

  // Construct Prisma query filter
  const whereFilter: any = {};

  if (filterSession && filterSession !== "ALL") {
    whereFilter.academicSession = filterSession;
  }

  if (filterCampus && filterCampus !== "ALL") {
    whereFilter.campusCode = filterCampus;
  }

  if (filterAction && filterAction !== "ALL") {
    whereFilter.action = filterAction;
  }

  if (filterUser && filterUser.trim()) {
    const searchTrim = filterUser.trim();
    whereFilter.OR = [
      { userEmail: { contains: searchTrim, mode: "insensitive" } },
      { userName: { contains: searchTrim, mode: "insensitive" } },
    ];
  }

  // Fetch audit log records and total count concurrently
  const [auditLogs, totalCount] = await Promise.all([
    prisma.auditLog.findMany({
      where: whereFilter,
      orderBy: { createdAt: "desc" },
      take: pageSize,
      skip: (currentPage - 1) * pageSize,
    }),
    prisma.auditLog.count({ where: whereFilter }),
  ]);

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  // Distinct action names for dropdown filter
  const distinctActions = [
    "AUTH_LOGIN",
    "STUDENT_REGISTER",
    "STUDENT_CREATE",
    "STUDENT_PROMOTE_ADMISSION",
    "STUDENT_UPDATE",
    "STUDENT_DELETE",
    "TC_ISSUE",
    "FEE_STRUCTURE_UPSERT",
    "FEE_STRUCTURE_DELETE",
    "FEE_STRUCTURE_IMPORT",
    "FEE_HEAD_CREATE",
    "FEE_HEAD_UPDATE",
    "FEE_HEAD_DELETE",
    "RBAC_UPDATE_PERMISSION",
    "RBAC_APPLY_PRESET",
    "USER_INVITE",
    "USER_SUSPEND",
    "USER_ACTIVATE",
    "USER_DELETE",
    "USER_APPROVE",
    "USER_DENY",
    "CAMPUS_SETTINGS_UPDATE",
    "SYSTEM_SETTINGS_UPDATE",
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner matching DPS Echo Light Theme */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-900 text-white flex items-center justify-center font-bold shadow-md">
            <History className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              Session-Wise Audit Trail
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-mono border border-emerald-200 font-semibold">
                Active: {activeSessionName}
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Complete activity log tracking staff mutations, logins, fee edits, and student record updates.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold bg-purple-50 text-purple-900 px-3 py-1.5 rounded-lg border border-purple-200 font-mono">
            Total Audit Logs: {totalCount.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <form method="GET" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          {/* Academic Session Filter */}
          <div>
            <label className="block text-slate-500 mb-1 font-semibold flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-emerald-700" /> Session
            </label>
            <select
              name="session"
              defaultValue={filterSession || "ALL"}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-2.5 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            >
              <option value="ALL">All Academic Sessions</option>
              {sessionsList.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name} {s.isCurrent ? "(Active)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Campus Filter */}
          <div>
            <label className="block text-slate-500 mb-1 font-semibold flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5 text-emerald-700" /> Campus
            </label>
            <select
              name="campus"
              defaultValue={filterCampus || "ALL"}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-2.5 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            >
              <option value="ALL">All Campuses</option>
              {campusesList.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>

          {/* Action Filter */}
          <div>
            <label className="block text-slate-500 mb-1 font-semibold flex items-center gap-1">
              <Activity className="h-3.5 w-3.5 text-emerald-700" /> Action Category
            </label>
            <select
              name="action"
              defaultValue={filterAction || "ALL"}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-2.5 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            >
              <option value="ALL">All Action Types</option>
              {distinctActions.map((act) => (
                <option key={act} value={act}>
                  {act}
                </option>
              ))}
            </select>
          </div>

          {/* User Search */}
          <div>
            <label className="block text-slate-500 mb-1 font-semibold flex items-center gap-1">
              <User className="h-3.5 w-3.5 text-emerald-700" /> User Email / Name
            </label>
            <div className="relative">
              <input
                type="text"
                name="user"
                placeholder="Search staff user..."
                defaultValue={filterUser || ""}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg pl-8 pr-3 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 placeholder:text-slate-400"
              />
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
          </div>

          {/* Filter Submit & Reset Buttons */}
          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="flex-1 bg-emerald-800 hover:bg-emerald-900 text-white font-bold py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs"
            >
              <Filter className="h-3.5 w-3.5" /> Apply Filter
            </button>
            <Link
              href="/admin/audit-logs"
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-3 rounded-lg border border-slate-200 transition-colors flex items-center justify-center"
              title="Reset Filters"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Link>
          </div>
        </form>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-4 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-slate-400" /> Date & Time
                </th>
                <th className="py-3.5 px-4">User</th>
                <th className="py-3.5 px-4">Session</th>
                <th className="py-3.5 px-4">Campus</th>
                <th className="py-3.5 px-4">Action</th>
                <th className="py-3.5 px-4">Target Entity</th>
                <th className="py-3.5 px-4">Action Details</th>
                <th className="py-3.5 px-4 text-right">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <FileText className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                    No audit log entries matched your filter criteria.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Timestamp */}
                    <td className="py-3.5 px-4 font-mono text-slate-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>

                    {/* User */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-900">{log.userName || log.userEmail.split("@")[0]}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{log.userEmail}</div>
                      {log.userRole && (
                        <span className="inline-block mt-0.5 text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded font-mono font-medium border border-slate-200">
                          {log.userRole}
                        </span>
                      )}
                    </td>

                    {/* Academic Session */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-mono text-[11px] font-semibold">
                        {log.academicSession || "—"}
                      </span>
                    </td>

                    {/* Campus */}
                    <td className="py-3.5 px-4 whitespace-nowrap font-mono text-slate-700">
                      {log.campusCode ? (
                        <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 font-semibold text-[11px]">
                          {log.campusCode}
                        </span>
                      ) : (
                        <span className="text-slate-400">Global</span>
                      )}
                    </td>

                    {/* Action Code */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                          log.action.includes("DELETE") || log.action.includes("DENY")
                            ? "bg-red-50 text-red-700 border border-red-200"
                            : log.action.includes("CREATE") || log.action.includes("REGISTER") || log.action.includes("APPROVE")
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : log.action.includes("LOGIN")
                            ? "bg-cyan-50 text-cyan-800 border border-cyan-200"
                            : "bg-amber-50 text-amber-800 border border-amber-200"
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>

                    {/* Target Entity */}
                    <td className="py-3.5 px-4 whitespace-nowrap font-mono text-slate-600">
                      <strong className="text-slate-800 font-semibold">{log.entityType}</strong>
                      {log.entityId && (
                        <span className="text-[10px] text-slate-400 block truncate max-w-[120px]">
                          ID: {log.entityId}
                        </span>
                      )}
                    </td>

                    {/* Details */}
                    <td className="py-3.5 px-4 text-slate-700 max-w-[280px]">
                      {log.details ? (
                        <div className="font-mono text-[11px] bg-slate-50 text-slate-800 p-1.5 rounded border border-slate-200 truncate hover:whitespace-normal hover:break-all transition-all" title={log.details}>
                          {log.details}
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* IP Address */}
                    <td className="py-3.5 px-4 text-right font-mono text-slate-500 text-[11px]">
                      {log.ipAddress || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 10-Item Inline Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
        />
      </div>
    </div>
  );
}
