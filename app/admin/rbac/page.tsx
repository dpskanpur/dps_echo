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
  Phone,
  Mail,
  MapPin,
  Globe,
  Award,
  IndianRupee,
} from "lucide-react";
import { RbacMatrixTable } from "@/components/RbacMatrixTable";
import {
  updateCampusSettings,
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
  searchParams: Promise<{ campus?: string; campusId?: string; tab?: string; notice?: string }>;
}) {
  const { campus: paramCampus, campusId: queryCampusId, tab = "system", notice } = await searchParams;
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const permissions = await getUserPermissions(user);

  if (!permissions.isAdmin && !permissions.modules.rbac.canView) {
    redirect("/?error=unauthorized_rbac");
  }

  const campuses = await prisma.campus.findMany({ orderBy: { name: "asc" } });

  const activeCampusId = queryCampusId || paramCampus || campuses[0]?.id || "";
  const selectedCampus = campuses.find((c) => c.id === activeCampusId) || campuses[0];

  const users = await prisma.user.findMany({
    include: { permissions: true },
    orderBy: { createdAt: "desc" },
  });

  const directoryColumns = prisma.directoryColumn
    ? await prisma.directoryColumn.findMany({ orderBy: { sequence: "asc" } })
    : [];

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar userEmail={user.email} userRole={user.role} permissions={permissions} />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar campuses={campuses} selectedCampusId={activeCampusId} user={user} permissions={permissions} />

        <main className="p-6 sm:p-8 space-y-6 flex-1 overflow-y-auto max-w-7xl mx-auto w-full">
          {/* Top Banner Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-900 text-white flex items-center justify-center font-bold shadow-md">
                  <Building2 className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">
                    Administration & Institutional Access Hub
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configure school-specific registration fees, custom ID formats, staff RBAC permissions, and dynamic directory columns.
                  </p>
                </div>
              </div>
            </div>

            {notice && (
              <div className="px-3.5 py-2 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-950 text-xs font-bold flex items-center gap-2 shadow-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>
                  {notice === "campus_updated"
                    ? `Settings for ${selectedCampus?.name || "Campus"} updated successfully!`
                    : notice === "column_added"
                    ? "New Directory Column added to Student Registry!"
                    : notice === "column_deleted"
                    ? "Directory Column deleted!"
                    : "Settings saved successfully!"}
                </span>
              </div>
            )}
          </div>

          {/* Navigation Hub Tabs */}
          <div className="bg-slate-200/80 p-1.5 rounded-2xl flex flex-wrap items-center gap-2 max-w-3xl">
            <Link
              href={`/admin/rbac?tab=system&campusId=${activeCampusId}`}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
                tab === "system"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Building2 className="w-4 h-4 text-emerald-800" />
              <span>1. School-Specific Settings & Fees</span>
            </Link>

            <Link
              href={`/admin/rbac?tab=rbac&campusId=${activeCampusId}`}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
                tab === "rbac"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <KeyRound className="w-4 h-4 text-emerald-800" />
              <span>2. Staff Access Matrix (RBAC)</span>
            </Link>

            <Link
              href={`/admin/rbac?tab=columns&campusId=${activeCampusId}`}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
                tab === "columns"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Columns className="w-4 h-4 text-emerald-800" />
              <span>3. Dynamic Directory Columns</span>
            </Link>
          </div>

          {/* TAB 1: SCHOOL-SPECIFIC CONFIGURATIONS */}
          {tab === "system" && (
            <div className="space-y-6">
              {/* Campus Selector Pills */}
              <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <Building2 className="w-4 h-4 text-emerald-800" />
                  <span>Select Campus to Configure:</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {campuses.map((c) => (
                    <Link
                      key={c.id}
                      href={`/admin/rbac?tab=system&campusId=${c.id}`}
                      className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 border ${
                        c.id === selectedCampus?.id
                          ? "bg-emerald-900 text-white border-emerald-900 shadow-md"
                          : "bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200"
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${c.id === selectedCampus?.id ? "bg-amber-300" : "bg-emerald-600"}`} />
                      <span>{c.name}</span>
                      <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${c.id === selectedCampus?.id ? "bg-emerald-800 text-emerald-100" : "bg-slate-200 text-slate-600"}`}>
                        {c.code}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Campus Configuration Form */}
              {selectedCampus && (
                <form action={updateCampusSettings} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-8 max-w-5xl">
                  <input type="hidden" name="campusId" value={selectedCampus.id} />

                  {/* Header Badge */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center font-black text-lg shadow-xs">
                        {selectedCampus.code}
                      </div>
                      <div>
                        <h2 className="text-lg font-black text-slate-900">
                          {selectedCampus.name} Configurations
                        </h2>
                        <p className="text-xs text-slate-500">
                          School Code: <span className="font-mono font-bold text-slate-700">{selectedCampus.code}</span> • Campus ID: <span className="font-mono text-[11px] text-slate-400">{selectedCampus.id}</span>
                        </p>
                      </div>
                    </div>

                    <div className="px-3.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold flex items-center gap-1.5">
                      <IndianRupee className="w-4 h-4 text-amber-700" />
                      <span>Reg. Fee: ₹{selectedCampus.registrationFee.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Section 1: Financial & Identity Controls */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 text-emerald-800">
                      <Tag className="w-4 h-4" />
                      <span>1. Admission & ID Formatting Controls</span>
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 bg-slate-50/70 p-5 rounded-2xl border border-slate-100">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Registration Fee (₹) *
                        </label>
                        <input
                          type="number"
                          name="registrationFee"
                          defaultValue={selectedCampus.registrationFee}
                          required
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">
                          School registration fee charged for {selectedCampus.name}.
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Scholar ID Prefix
                        </label>
                        <input
                          type="text"
                          name="scholarIdPrefix"
                          defaultValue={selectedCampus.scholarIdPrefix || "DPS"}
                          required
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">
                          Generates e.g. <span className="font-mono font-bold text-emerald-800">{selectedCampus.scholarIdPrefix || "DPS"}-{selectedCampus.code}-2026-0001</span>
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Registration ID Prefix
                        </label>
                        <input
                          type="text"
                          name="registrationIdPrefix"
                          defaultValue={selectedCampus.registrationIdPrefix || "REG"}
                          required
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">
                          Generates e.g. <span className="font-mono font-bold text-emerald-800">{selectedCampus.registrationIdPrefix || "REG"}-{selectedCampus.code}-2026-0001</span>
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Active Academic Session
                        </label>
                        <select
                          name="activeAcademicYear"
                          defaultValue={selectedCampus.activeAcademicYear || "2026-2027"}
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 cursor-pointer"
                        >
                          <option value="2025-2026">2025-2026</option>
                          <option value="2026-2027">2026-2027 (Active)</option>
                          <option value="2027-2028">2027-2028</option>
                        </select>
                        <p className="text-[10px] text-slate-400 mt-1">
                          Current session for {selectedCampus.name}.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: School Profile & Affiliation */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 text-emerald-800">
                      <Award className="w-4 h-4" />
                      <span>2. CBSE Affiliation & School Information</span>
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 bg-slate-50/70 p-5 rounded-2xl border border-slate-100">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          CBSE Affiliation / Board Details
                        </label>
                        <input
                          type="text"
                          name="affiliation"
                          defaultValue={selectedCampus.affiliation || ""}
                          placeholder="e.g. CBSE Affiliation No. 2130722"
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          School Motto / Tagline
                        </label>
                        <input
                          type="text"
                          name="tagline"
                          defaultValue={selectedCampus.tagline || ""}
                          placeholder="e.g. Service Before Self"
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Campus Official Email
                        </label>
                        <input
                          type="email"
                          name="email"
                          defaultValue={selectedCampus.email}
                          required
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Campus Official Phone
                        </label>
                        <input
                          type="text"
                          name="phone"
                          defaultValue={selectedCampus.phone}
                          required
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-mono"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Campus Physical Address
                        </label>
                        <input
                          type="text"
                          name="address"
                          defaultValue={selectedCampus.address}
                          required
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Official School Website URL
                        </label>
                        <input
                          type="url"
                          name="website"
                          defaultValue={selectedCampus.website || ""}
                          placeholder="https://dpsazadnagar.com"
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-slate-100">
                    <button
                      type="submit"
                      className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold py-3.5 px-7 rounded-2xl text-xs transition shadow-md flex items-center gap-2 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4 text-amber-300" />
                      <span>Save {selectedCampus.name} Settings</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* TAB 2: RBAC MATRIX */}
          {tab === "rbac" && (
            <RbacMatrixTable initialUsers={users} currentUserId={user.id} />
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
                      Standard columns (Name, Reg/Scholar ID, Class, Section, Guardian Phone, Status) are enabled by default.
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
