import { prisma } from "@/lib/prisma";
import { getCurrentUser, getUserPermissions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { listAcademicSessions, getActiveSessionName } from "@/lib/academic-session";
import {
  History,
  Search,
  Filter,
  User,
  Calendar,
  Building2,
  Activity,
  ChevronLeft,
  ChevronRight,
  FileText,
  Clock,
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
  if (!permissions.isAdmin && !permissions.modules.rbac.canView) {
    redirect("/?error=unauthorized_audit_logs");
  }

  const currentPage = Math.max(1, parseInt(pageStr || "1", 10));
  const pageSize = 50;

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
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-800/80 border border-slate-700/60 rounded-xl p-5 shadow-lg backdrop-blur-sm">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-400">
            <History className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              Session-Wise Audit Trail
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono border border-blue-500/30">
                Active: {activeSessionName}
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Complete activity log tracking staff mutations, logins, fee edits, and student record updates.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
          <span className="px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-700">
            Total Logs: <strong className="text-slate-200">{totalCount.toLocaleString()}</strong>
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 shadow-sm">
        <form method="GET" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          {/* Academic Session Filter */}
          <div>
            <label className="block text-slate-400 mb-1 font-medium flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-blue-400" /> Session
            </label>
            <select
              name="session"
              defaultValue={filterSession || "ALL"}
              className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
            <label className="block text-slate-400 mb-1 font-medium flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5 text-blue-400" /> Campus
            </label>
            <select
              name="campus"
              defaultValue={filterCampus || "ALL"}
              className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
            <label className="block text-slate-400 mb-1 font-medium flex items-center gap-1">
              <Activity className="h-3.5 w-3.5 text-blue-400" /> Action Category
            </label>
            <select
              name="action"
              defaultValue={filterAction || "ALL"}
              className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
            <label className="block text-slate-400 mb-1 font-medium flex items-center gap-1">
              <User className="h-3.5 w-3.5 text-blue-400" /> User Email / Name
            </label>
            <div className="relative">
              <input
                type="text"
                name="user"
                placeholder="Search staff user..."
                defaultValue={filterUser || ""}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg pl-8 pr-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder:text-slate-500"
              />
              <Search className="h-3.5 w-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            </div>
          </div>

          {/* Filter Submit & Reset Buttons */}
          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Filter className="h-3.5 w-3.5" /> Apply Filter
            </button>
            <Link
              href="/admin/audit-logs"
              className="bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium py-2 px-3 rounded-lg transition-colors flex items-center justify-center"
              title="Reset Filters"
            >
              Reset
            </Link>
          </div>
        </form>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-700/80 text-slate-400 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-slate-500" /> Date & Time
                </th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Session</th>
                <th className="py-3 px-4">Campus</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target Entity</th>
                <th className="py-3 px-4">Action Details</th>
                <th className="py-3 px-4 text-right">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50 text-slate-300">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <FileText className="h-8 w-8 mx-auto mb-2 text-slate-600" />
                    No audit log entries matched your filter criteria.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-700/30 transition-colors">
                    {/* Timestamp */}
                    <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
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
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-medium text-slate-200">{log.userName || log.userEmail.split("@")[0]}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{log.userEmail}</div>
                      {log.userRole && (
                        <span className="inline-block mt-0.5 text-[10px] px-1.5 py-0.2 bg-slate-700 text-slate-300 rounded font-mono">
                          {log.userRole}
                        </span>
                      )}
                    </td>

                    {/* Academic Session */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-blue-900/40 text-blue-300 border border-blue-700/50 font-mono text-[11px]">
                        {log.academicSession || "—"}
                      </span>
                    </td>

                    {/* Campus */}
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-300">
                      {log.campusCode ? (
                        <span className="px-2 py-0.5 rounded bg-purple-900/30 text-purple-300 border border-purple-700/40">
                          {log.campusCode}
                        </span>
                      ) : (
                        <span className="text-slate-500">Global</span>
                      )}
                    </td>

                    {/* Action Code */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium ${
                          log.action.includes("DELETE") || log.action.includes("DENY")
                            ? "bg-red-900/40 text-red-300 border border-red-700/50"
                            : log.action.includes("CREATE") || log.action.includes("REGISTER") || log.action.includes("APPROVE")
                            ? "bg-emerald-900/40 text-emerald-300 border border-emerald-700/50"
                            : log.action.includes("LOGIN")
                            ? "bg-cyan-900/40 text-cyan-300 border border-cyan-700/50"
                            : "bg-amber-900/40 text-amber-300 border border-amber-700/50"
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>

                    {/* Target Entity */}
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-400">
                      {log.entityType}
                      {log.entityId && (
                        <span className="text-[10px] text-slate-500 block truncate max-w-[120px]">
                          ID: {log.entityId}
                        </span>
                      )}
                    </td>

                    {/* Details */}
                    <td className="py-3 px-4 text-slate-300 max-w-[280px]">
                      {log.details ? (
                        <div className="font-mono text-[11px] bg-slate-900/70 p-1.5 rounded border border-slate-700/50 truncate hover:whitespace-normal hover:break-all transition-all" title={log.details}>
                          {log.details}
                        </div>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    {/* IP Address */}
                    <td className="py-3 px-4 text-right font-mono text-slate-400 text-[11px]">
                      {log.ipAddress || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="bg-slate-900/80 border-t border-slate-700/80 px-4 py-3 flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing page <strong className="text-slate-200">{currentPage}</strong> of{" "}
            <strong className="text-slate-200">{totalPages}</strong> ({totalCount.toLocaleString()} logs)
          </div>
          <div className="flex items-center gap-2">
            {currentPage > 1 ? (
              <Link
                href={`/admin/audit-logs?session=${filterSession || "ALL"}&campus=${filterCampus || "ALL"}&action=${filterAction || "ALL"}&user=${filterUser || ""}&page=${currentPage - 1}`}
                className="px-3 py-1.5 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 transition-colors flex items-center gap-1"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Previous
              </Link>
            ) : (
              <span className="px-3 py-1.5 rounded bg-slate-900/50 border border-slate-800 text-slate-600 cursor-not-allowed flex items-center gap-1">
                <ChevronLeft className="h-3.5 w-3.5" /> Previous
              </span>
            )}

            {currentPage < totalPages ? (
              <Link
                href={`/admin/audit-logs?session=${filterSession || "ALL"}&campus=${filterCampus || "ALL"}&action=${filterAction || "ALL"}&user=${filterUser || ""}&page=${currentPage + 1}`}
                className="px-3 py-1.5 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 transition-colors flex items-center gap-1"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <span className="px-3 py-1.5 rounded bg-slate-900/50 border border-slate-800 text-slate-600 cursor-not-allowed flex items-center gap-1">
                Next <ChevronRight className="h-3.5 w-3.5" />
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
