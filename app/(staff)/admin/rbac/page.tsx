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
  X,
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
  CreditCard,
  MessageSquare,
  Clock,
} from "lucide-react";
import { RbacMatrixTable } from "@/components/RbacMatrixTable";
import { AdminServiceToggleCards } from "@/components/AdminServiceToggleCards";
import { listAcademicSessions } from "@/lib/academic-session";
import { setActiveSession, createAcademicSession } from "@/lib/session-actions";
import { getOnlinePaymentSettings } from "@/lib/fee-settings-actions";
import {
  updateCampusSettings,
  updateSystemSettings,
  createDirectoryColumn,
  deleteDirectoryColumn,
  toggleDirectoryColumnVisibility,
  createCampus,
} from "@/lib/actions";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ campus?: string; campusId?: string; tab?: string; notice?: string; name?: string; addCampus?: string }>;
}) {
  const { campus: paramCampus, campusId: queryCampusId, tab = "system", notice, name: noticeName, addCampus } = await searchParams;
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const permissions = await getUserPermissions(user);

  if (!permissions.isAdmin && !permissions.modules.rbac.canView) {
    redirect("/?error=unauthorized_rbac");
  }

  const campuses = await prisma.campus.findMany({ orderBy: { name: "asc" } });
  const paymentSettings = await getOnlinePaymentSettings();
  const academicSessions = await listAcademicSessions();
  const canManageSessions = permissions.isAdmin || permissions.modules.sessions.canUpdate;

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
                    Configure school-specific registration fees, custom ID formats, staff RBAC permissions, online payments, and communication channels.
                  </p>
                </div>
              </div>
            </div>

            {notice && (
              <div className="px-3.5 py-2 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-950 text-xs font-bold flex items-center gap-2 shadow-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>
                  {notice === "session_activated"
                    ? `${noticeName || "Session"} is now the active academic session.`
                    : notice === "session_created"
                    ? `Academic session ${noticeName || ""} created.`
                    : notice === "campus_created"
                    ? `Campus ${selectedCampus?.name || ""} created successfully!`
                    : notice === "campus_updated"
                    ? `Settings for ${selectedCampus?.name || "Campus"} updated successfully!`
                    : "Settings saved successfully!"}
                </span>
              </div>
            )}
          </div>

          {/* Navigation Hub Tabs */}
          <div className="bg-slate-200/80 p-1.5 rounded-2xl flex flex-wrap items-center gap-2 w-full">
            <Link
              href={`/admin/rbac?tab=system&campusId=${activeCampusId}`}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
                tab === "system"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Building2 className="w-4 h-4 text-emerald-800" />
              <span>1. School Configurations &amp; Services</span>
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

            {canManageSessions && (
              <Link
                href={`/admin/rbac?tab=sessions&campusId=${activeCampusId}`}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
                  tab === "sessions"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Calendar className="w-4 h-4 text-emerald-800" />
                <span>Academic Sessions</span>
              </Link>
            )}
          </div>

          {/* TAB 1: SCHOOL-SPECIFIC CONFIGURATIONS */}
          {tab === "system" && (
            <div className="space-y-6">
              {/* Single Consolidated School Tabs Selector */}
              <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <Building2 className="w-4 h-4 text-emerald-800" />
                    <span>School Campuses &amp; Service Management</span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Select a school to configure info, fees, online payment &amp; channel settings
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {campuses.map((c) => {
                    const isSelected = c.id === selectedCampus?.id && !addCampus;
                    const allActive = c.isOnlinePaymentEnabled && c.isSmsEnabled && c.isEmailEnabled;

                    return (
                      <Link
                        key={c.id}
                        href={`/admin/rbac?tab=system&campusId=${c.id}`}
                        className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2.5 border ${
                          isSelected
                            ? "bg-slate-900 text-white border-slate-900 shadow-md"
                            : "bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200"
                        }`}
                      >
                        <span
                          className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                            allActive ? "bg-emerald-400" : "bg-amber-400"
                          }`}
                        />
                        <span className="truncate">{c.name}</span>
                        <span
                          className={`font-mono text-[10px] px-1.5 py-0.5 rounded shrink-0 ${
                            isSelected
                              ? "bg-slate-800 text-amber-300 font-bold"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {c.code}
                        </span>
                      </Link>
                    );
                  })}

                  <Link
                    href={addCampus ? `/admin/rbac?tab=system` : `/admin/rbac?tab=system&addCampus=true`}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 border border-dashed cursor-pointer ${
                      addCampus
                        ? "bg-amber-50 text-amber-900 border-amber-400 font-black shadow-xs"
                        : "bg-white text-slate-600 hover:bg-slate-50 border-slate-300"
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-600" />
                    <span>+ Add New Campus</span>
                    {addCampus && (
                      <span
                        className="p-0.5 hover:bg-amber-200/80 rounded-full transition text-amber-900 ml-1 inline-flex items-center justify-center"
                        title="Close / Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </Link>
                </div>
              </div>

              {/* Add Campus Form View */}
              {(addCampus || campuses.length === 0) ? (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold border border-amber-200">
                        <Plus className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <h2 className="text-base font-black text-slate-900">Add a New School Campus</h2>
                        <p className="text-xs text-slate-500">
                          Create a new institutional campus entry with default classes, service gateways and initial settings.
                        </p>
                      </div>
                    </div>

                    {campuses.length > 0 && (
                      <Link
                        href={`/admin/rbac?tab=system`}
                        className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                        title="Cancel / Close Form"
                      >
                        <X className="w-4 h-4" />
                        <span>Cancel</span>
                      </Link>
                    )}
                  </div>

                  <form action={createCampus} className="space-y-6 w-full">
                    {/* SECTION 1: INITIAL SERVICE & CHANNEL CONTROLS */}
                    <AdminServiceToggleCards
                      campusName="New Campus"
                      campusCode="NEW"
                      isOnlinePaymentEnabled={true}
                      isSmsEnabled={true}
                      isEmailEnabled={true}
                    />

                    {/* SECTION 2: CAMPUS DETAILS */}
                    <div className="space-y-4 pt-2 border-t border-slate-100">
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 text-emerald-800">
                        <Building2 className="w-4 h-4" />
                        <span>Institutional Campus Details</span>
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Campus Code *
                          </label>
                          <input
                            type="text"
                            name="code"
                            required
                            maxLength={6}
                            placeholder="AZD"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-mono font-bold uppercase text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                          />
                          <p className="text-[10px] text-slate-400 mt-1">
                            2–6 letters. Used in IDs: DPS-<strong>AZD</strong>-2026-0001
                          </p>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Campus Name *
                          </label>
                          <input
                            type="text"
                            name="name"
                            required
                            placeholder="DPS Azad Nagar"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Address *</label>
                        <input
                          type="text"
                          name="address"
                          required
                          placeholder="Azad Nagar, Kanpur"
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">City</label>
                          <input
                            type="text"
                            name="city"
                            defaultValue="Kanpur"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">State</label>
                          <input
                            type="text"
                            name="state"
                            defaultValue="Uttar Pradesh"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Pincode</label>
                          <input
                            type="text"
                            name="pincode"
                            defaultValue="208002"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Phone *</label>
                          <input
                            type="text"
                            name="phone"
                            required
                            placeholder="+91 512 000 0000"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Email *</label>
                          <input
                            type="email"
                            name="email"
                            required
                            placeholder="azadnagar@dpskanpur.com"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            CBSE Affiliation
                          </label>
                          <input
                            type="text"
                            name="affiliation"
                            placeholder="CBSE Affiliation No. 2130722"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Academic Year
                          </label>
                          <input
                            type="text"
                            name="activeAcademicYear"
                            defaultValue="2026-2027"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Registration Fee (₹)
                          </label>
                          <input
                            type="number"
                            name="registrationFee"
                            defaultValue={1000}
                            min={0}
                            step={50}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                          />
                        </div>
                      </div>

                      <label className="flex items-start gap-2.5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl cursor-pointer">
                        <input
                          type="checkbox"
                          name="createClasses"
                          defaultChecked
                          className="accent-[#0F9D58] mt-0.5"
                        />
                        <span className="text-[11px] text-emerald-900 leading-relaxed">
                          <strong className="block font-bold">
                            Create the standard class structure
                          </strong>
                          Pre-Nursery through Class XII with sections A/B (and C from Class VI). Without
                          classes this campus cannot accept an admission.
                        </span>
                      </label>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="submit"
                        className="flex items-center gap-2 px-5 py-3 text-xs font-bold rounded-xl bg-[#0F9D58] text-white hover:bg-emerald-700 transition shadow-sm cursor-pointer"
                      >
                        <Plus className="w-4 h-4" /> Create Campus
                      </button>
                      {campuses.length > 0 && (
                        <Link
                          href={`/admin/rbac?tab=system`}
                          className="px-5 py-3 text-xs font-bold rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition cursor-pointer"
                        >
                          Cancel
                        </Link>
                      )}
                    </div>
                  </form>
                </div>
              ) : selectedCampus ? (
                /* Selected School Unified Configuration Form View */
                <form
                  key={selectedCampus.id}
                  action={updateCampusSettings}
                  className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-8 w-full"
                >
                  <input type="hidden" name="campusId" value={selectedCampus.id} />

                  {/* Header Badge */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 min-w-12 px-3.5 shrink-0 rounded-2xl bg-emerald-950 border border-emerald-900 text-amber-300 flex items-center justify-center font-black text-xs font-mono tracking-wider uppercase shadow-sm">
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

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="px-3.5 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5">
                        <IndianRupee className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Reg. Fee: ₹{selectedCampus.registrationFee.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 1: SCHOOL-WISE SERVICE & CHANNEL CONTROLS (SLIDING TOGGLES) */}
                  <AdminServiceToggleCards
                    campusName={selectedCampus.name}
                    campusCode={selectedCampus.code}
                    isOnlinePaymentEnabled={selectedCampus.isOnlinePaymentEnabled}
                    isSmsEnabled={selectedCampus.isSmsEnabled}
                    isEmailEnabled={selectedCampus.isEmailEnabled}
                  />

                  {/* SECTION 2: ADMISSION & FEE CONFIGURATION */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 text-emerald-800">
                      <Tag className="w-4 h-4" />
                      <span>2. Admission &amp; ID Formatting Controls</span>
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
                          Registration fee for {selectedCampus.name}.
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Scholar ID Prefix / School Code
                        </label>
                        <input
                          type="text"
                          name="scholarIdPrefix"
                          defaultValue={selectedCampus.scholarIdPrefix || selectedCampus.code || "DPSAZD"}
                          required
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-mono"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">
                          Generates e.g. <span className="font-mono font-bold text-emerald-800">
                            {selectedCampus.scholarIdPrefix?.endsWith(selectedCampus.code) || selectedCampus.scholarIdPrefix?.includes(selectedCampus.code)
                              ? `${selectedCampus.scholarIdPrefix || selectedCampus.code}-2026-0001`
                              : `${selectedCampus.scholarIdPrefix || "DPS"}-${selectedCampus.code}-2026-0001`}
                          </span>
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
                          Current active session for {selectedCampus.name}.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 3: CBSE AFFILIATION & SCHOOL DETAILS */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 text-emerald-800">
                      <Award className="w-4 h-4" />
                      <span>3. CBSE Affiliation &amp; School Information</span>
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

                  {/* SECTION 4: AUTOMATED SCHOOL LATE FEE & FINE RULES */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 text-emerald-800">
                      <Clock className="w-4 h-4" />
                      <span>4. Automated School Late Fee &amp; Fine Rules</span>
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 bg-slate-50/70 p-5 rounded-2xl border border-slate-100">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Due Date Grace Period (Days)
                        </label>
                        <input
                          type="number"
                          name="lateFeeGraceDays"
                          defaultValue={selectedCampus.lateFeeGraceDays ?? 5}
                          min={0}
                          required
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">
                          Grace period after due date before late fees start.
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Tier Threshold (X Days)
                        </label>
                        <input
                          type="number"
                          name="lateFeeTierDays"
                          defaultValue={selectedCampus.lateFeeTierDays ?? 15}
                          min={1}
                          required
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">
                          Overdue day threshold X for tier 1 vs tier 2.
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Up to X Days Late Fee (₹ Y)
                        </label>
                        <input
                          type="number"
                          name="lateFeeInitialAmount"
                          defaultValue={selectedCampus.lateFeeInitialAmount ?? 500}
                          min={0}
                          required
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-mono"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">
                          Late fee amount for overdue ≤ X days.
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Beyond X Days Late Fee (₹ Z)
                        </label>
                        <input
                          type="number"
                          name="lateFeeHigherAmount"
                          defaultValue={selectedCampus.lateFeeHigherAmount ?? 1000}
                          min={0}
                          required
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-mono"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">
                          Late fee amount for overdue &gt; X days.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <p className="text-[11px] text-slate-400">
                      All changes apply immediately to {selectedCampus.name}.
                    </p>
                    <button
                      type="submit"
                      className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold py-3.5 px-7 rounded-2xl text-xs transition shadow-md flex items-center gap-2 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4 text-amber-300" />
                      <span>Save {selectedCampus.name} Settings</span>
                    </button>
                  </div>
                </form>
              ) : null}
            </div>
          )}

          {/* TAB 2: RBAC MATRIX */}
          {tab === "rbac" && (
            <RbacMatrixTable initialUsers={users} currentUserId={user.id} campuses={campuses} />
          )}

          {/* TAB 3: DYNAMIC DIRECTORY COLUMNS */}
          {tab === "sessions" && canManageSessions && (
            <div className="space-y-6 w-full">
              {/* Active session */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-5">
                <div>
                  <h2 className="text-sm font-black text-slate-900">Active Academic Session</h2>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    New admissions, invoices and receipts are stamped with this session. Changing it
                    affects every user. It does not alter records that already exist.
                  </p>
                </div>

                {academicSessions.length === 0 ? (
                  <p className="text-xs text-slate-400">No academic sessions exist yet.</p>
                ) : (
                  <div className="space-y-2">
                    {academicSessions.map((session) => (
                      <div
                        key={session.id}
                        className={`flex items-center justify-between gap-4 p-4 rounded-xl border ${
                          session.isCurrent
                            ? "bg-emerald-50 border-emerald-300"
                            : "bg-slate-50 border-slate-200"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Calendar
                            className={`w-4 h-4 shrink-0 ${
                              session.isCurrent ? "text-emerald-700" : "text-slate-400"
                            }`}
                          />
                          <span className="font-mono text-sm font-bold text-slate-900">
                            {session.name}
                          </span>
                          {session.isCurrent && (
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-700 text-white px-2 py-0.5 rounded-full">
                              Active
                            </span>
                          )}
                        </div>

                        {!session.isCurrent && (
                          <form action={setActiveSession}>
                            <input type="hidden" name="sessionId" value={session.id} />
                            <button
                              type="submit"
                              className="text-[11px] font-bold px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 transition"
                            >
                              Make active
                            </button>
                          </form>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Open a new session */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-4">
                <div>
                  <h2 className="text-sm font-black text-slate-900">Open a New Session</h2>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Creates the session so admissions can be taken for it in advance. It does not
                    become active until you make it so above.
                  </p>
                </div>

                <form action={createAcademicSession} className="flex flex-wrap items-end gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Session</label>
                    <input
                      type="text"
                      name="name"
                      required
                      placeholder="2027-2028"
                      pattern="\\d{4}-\\d{4}"
                      className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                    />
                  </div>
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-lg bg-[#0F9D58] text-white hover:bg-emerald-700 transition"
                  >
                    <Plus className="w-4 h-4" /> Create Session
                  </button>
                </form>
                <p className="text-[10px] text-slate-400">
                  April to March. Consecutive years only, e.g. 2027-2028.
                </p>
              </div>
            </div>
          )}
        </main>
  );
}
