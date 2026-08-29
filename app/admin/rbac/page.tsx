import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";
import { getCurrentUser, getUserPermissions } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  Shield,
  Lock,
  KeyRound,
  Sparkles,
  Settings,
  Columns,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle2,
  Sliders,
  Calendar,
  Tag,
  Building2,
} from "lucide-react";
import { RbacMatrixTable } from "@/components/RbacMatrixTable";
import {
  updateSystemSettings,
  createDirectoryColumn,
  deleteDirectoryColumn,
  toggleDirectoryColumnVisibility,
} from "@/lib/actions";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ campus?: string; tab?: string; notice?: string }>;
}) {
  const { campus: campusId, tab = "rbac", notice } = await searchParams;
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const permissions = await getUserPermissions(user);

  if (!permissions.isAdmin && !permissions.modules.rbac.canView) {
    redirect("/?error=unauthorized_rbac");
  }

  const campuses = await prisma.campus.findMany({ orderBy: { name: "asc" } });

  const users = await prisma.user.findMany({
    include: { permissions: true },
    orderBy: { createdAt: "desc" },
  });

  const systemSettings =
    (prisma.systemSettings ? await prisma.systemSettings.findUnique({ where: { id: "global" } }) : null) || {
      id: "global",
      currentAcademicYear: "2026-2027",
      scholarIdPrefix: "DPS",
      registrationIdPrefix: "REG",
      registrationFeeDefault: 1000,
    };

  const directoryColumns = prisma.directoryColumn
    ? await prisma.directoryColumn.findMany({ orderBy: { sequence: "asc" } })
    : [];

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar userEmail={user.email} userRole={user.role} permissions={permissions} />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar campuses={campuses} selectedCampusId={campusId} user={user} permissions={permissions} />

        <main className="p-6 sm:p-8 space-y-6 flex-1 overflow-y-auto max-w-7xl mx-auto w-full">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold shadow-md">
                  <Settings className="w-5 h-5 text-[#34A853]" />
                </div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  Admin & Portal System Settings
                </h1>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Configure staff access permissions, system ID formats, academic session defaults, and dynamic Student Directory columns.
              </p>
            </div>

            {notice && (
              <div className="px-3 py-1.5 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <span>
                  {notice === "settings_updated"
                    ? "System Settings Updated Successfully!"
                    : notice === "column_added"
                    ? "New Directory Column Added!"
                    : notice === "column_deleted"
                    ? "Directory Column Deleted!"
                    : "Settings Saved!"}
                </span>
              </div>
            )}
          </div>

          {/* Navigation Tabs */}
          <div className="bg-slate-200/70 p-1.5 rounded-2xl flex flex-wrap items-center gap-2 max-w-2xl">
            <Link
              href="/admin/rbac?tab=rbac"
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
                tab === "rbac"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <KeyRound className="w-4 h-4 text-emerald-700" />
              <span>1. User Access (RBAC)</span>
            </Link>

            <Link
              href="/admin/rbac?tab=system"
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
                tab === "system"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Sliders className="w-4 h-4 text-emerald-700" />
              <span>2. System & ID Formats</span>
            </Link>

            <Link
              href="/admin/rbac?tab=columns"
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
                tab === "columns"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Columns className="w-4 h-4 text-emerald-700" />
              <span>3. Dynamic Directory Columns</span>
            </Link>
          </div>

          {/* TAB 1: RBAC MATRIX */}
          {tab === "rbac" && (
            <RbacMatrixTable initialUsers={users} currentUserId={user.id} />
          )}

          {/* TAB 2: SYSTEM CONFIGURATIONS */}
          {tab === "system" && (
            <form action={updateSystemSettings} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6 max-w-4xl">
              <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
                <Sliders className="w-5 h-5 text-emerald-800" />
                <h2 className="text-base font-black text-slate-900">
                  Global System Identifiers & Academic Session Settings
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Active Academic Session
                  </label>
                  <select
                    name="currentAcademicYear"
                    defaultValue={systemSettings.currentAcademicYear}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 cursor-pointer"
                  >
                    <option value="2025-2026">2025-2026</option>
                    <option value="2026-2027">2026-2027 (Current)</option>
                    <option value="2027-2028">2027-2028</option>
                    <option value="2028-2029">2028-2029</option>
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Sets active academic year for new registrations, admissions, and fee structures.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Default Registration Fee (₹)
                  </label>
                  <input
                    type="number"
                    name="registrationFeeDefault"
                    defaultValue={systemSettings.registrationFeeDefault}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Default fee charged during public and staff registration.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Scholar ID Prefix
                  </label>
                  <input
                    type="text"
                    name="scholarIdPrefix"
                    defaultValue={systemSettings.scholarIdPrefix}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Generates Scholar IDs e.g. <span className="font-mono font-bold text-emerald-800">{systemSettings.scholarIdPrefix}-AZD-2026-0001</span>.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Registration ID Prefix
                  </label>
                  <input
                    type="text"
                    name="registrationIdPrefix"
                    defaultValue={systemSettings.registrationIdPrefix}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Generates Registration IDs e.g. <span className="font-mono font-bold text-emerald-800">{systemSettings.registrationIdPrefix}-AZD-2026-0001</span>.
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold py-3 px-6 rounded-xl text-xs transition shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save System Configuration</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: DYNAMIC DIRECTORY COLUMNS */}
          {tab === "columns" && (
            <div className="space-y-6 max-w-5xl">
              {/* Form to Add New Column */}
              <form action={createDirectoryColumn} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <Plus className="w-5 h-5 text-emerald-800" />
                  <h2 className="text-base font-black text-slate-900">
                    Add New Dynamic Column for Student Directory
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Column Header Label *
                    </label>
                    <input
                      type="text"
                      name="label"
                      required
                      placeholder="e.g. Bus Route / PEN No / House"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Data Field Key
                    </label>
                    <input
                      type="text"
                      name="key"
                      placeholder="e.g. transportRoute (Auto-generated if empty)"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Field Input Type
                    </label>
                    <select
                      name="type"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    >
                      <option value="text">Short Text</option>
                      <option value="number">Number</option>
                      <option value="select">Dropdown Select</option>
                      <option value="date">Date</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold py-2.5 px-5 rounded-xl text-xs transition shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Column to Directory</span>
                  </button>
                </div>
              </form>

              {/* List of Configured Directory Columns */}
              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="p-5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Columns className="w-4 h-4 text-emerald-800" />
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Configured Dynamic Columns ({directoryColumns.length})
                    </h3>
                  </div>
                </div>

                {directoryColumns.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500 space-y-2">
                    <p>No custom dynamic columns created yet.</p>
                    <p className="text-[11px] text-slate-400">
                      Standard columns (Name, Reg/Scholar ID, Class, Section, Guardian Phone, Status) are always enabled by default.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {directoryColumns.map((col) => (
                      <div key={col.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50 transition">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900">{col.label}</span>
                            <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                              key: {col.key}
                            </span>
                            <span className="text-[10px] bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200 font-bold uppercase">
                              {col.type}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <form action={toggleDirectoryColumnVisibility}>
                            <input type="hidden" name="columnId" value={col.id} />
                            <input type="hidden" name="isVisible" value={col.isVisibleInDirectory ? "true" : "false"} />
                            <button
                              type="submit"
                              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                                col.isVisibleInDirectory
                                  ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                              }`}
                            >
                              {col.isVisibleInDirectory ? (
                                <>
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Visible in Directory</span>
                                </>
                              ) : (
                                <>
                                  <EyeOff className="w-3.5 h-3.5" />
                                  <span>Hidden</span>
                                </>
                              )}
                            </button>
                          </form>

                          <form action={deleteDirectoryColumn}>
                            <input type="hidden" name="columnId" value={col.id} />
                            <button
                              type="submit"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              title="Delete Column"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </form>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
