"use client";

import { useState, useTransition } from "react";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  UserPlus,
  Trash2,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Search,
  Sparkles,
  Lock,
  Unlock,
  AlertCircle,
  RefreshCw,
  Users,
  CreditCard,
  FileText,
  GraduationCap,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Building2,
  Eye,
  Pencil,
  Bell,
  Check,
  X,
  LayoutGrid,
  List,
} from "lucide-react";
import { APP_MODULES, AppModuleId } from "@/lib/permissions";
import {
  updateUserModulePermission,
  applyRolePreset,
  addUserWithPermissions,
  toggleUserStatus,
  deleteUser,
  approveUserAccess,
  denyAndDeleteUserRequest,
  updateUserCampusAssignment,
} from "@/lib/rbac-actions";

interface UserWithPermissions {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  role: string;
  status: string;
  campusId?: string | null;
  permissions: {
    id: string;
    module: string;
    canView: boolean;
    canUpdate: boolean;
    canDelete: boolean;
  }[];
}

export function RbacMatrixTable({
  initialUsers,
  currentUserId,
  campuses = [],
}: {
  initialUsers: UserWithPermissions[];
  currentUserId: string;
  campuses?: { id: string; name: string; code: string }[];
}) {
  const [users, setUsers] = useState<UserWithPermissions[]>(initialUsers);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [expandedUserIds, setExpandedUserIds] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  // Form state for adding user
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("STAFF");
  const [newPreset, setNewPreset] = useState<"FULL_ADMIN" | "FEES_SPECIALIST" | "ADMISSIONS_SPECIALIST" | "VIEW_ALL" | "NONE">("FEES_SPECIALIST");
  const [newCampusId, setNewCampusId] = useState("ALL");

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setFeedbackMessage({ text, type });
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  const toggleExpand = (userId: string) => {
    setExpandedUserIds((prev) => ({ ...prev, [userId]: !prev[userId] }));
  };

  // Helper to find a specific module permission for a user
  const getModPerm = (user: UserWithPermissions, moduleId: string) => {
    return user.permissions.find((p) => p.module === moduleId) || {
      canView: false,
      canUpdate: false,
      canDelete: false,
    };
  };

  const getModuleIcon = (modId: string) => {
    switch (modId) {
      case "students":
        return <Users className="w-3.5 h-3.5 text-emerald-600" />;
      case "fees":
        return <CreditCard className="w-3.5 h-3.5 text-[#0F9D58]" />;
      case "tc":
        return <FileText className="w-3.5 h-3.5 text-amber-600" />;
      case "alumni":
        return <GraduationCap className="w-3.5 h-3.5 text-purple-600" />;
      case "rbac":
        return <Shield className="w-3.5 h-3.5 text-blue-600" />;
      case "notifications":
        return <Bell className="w-3.5 h-3.5 text-rose-600" />;
      default:
        return <SlidersHorizontal className="w-3.5 h-3.5 text-slate-600" />;
    }
  };

  // Checkbox toggle handler
  const handleToggle = (
    userId: string,
    moduleId: AppModuleId,
    field: "canView" | "canUpdate" | "canDelete",
    currentValue: boolean
  ) => {
    const newValue = !currentValue;

    // Optimistic UI update
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u;
        const existingPermIndex = u.permissions.findIndex((p) => p.module === moduleId);
        let updatedPerms = [...u.permissions];

        if (existingPermIndex >= 0) {
          const current = updatedPerms[existingPermIndex];
          const newCanView = field === "canView" ? newValue : (newValue ? true : current.canView);
          const newCanUpdate = field === "canUpdate" ? newValue : current.canUpdate;
          const newCanDelete = field === "canDelete" ? newValue : current.canDelete;

          updatedPerms[existingPermIndex] = {
            ...current,
            canView: newCanView,
            canUpdate: newCanUpdate,
            canDelete: newCanDelete,
          };
        } else {
          updatedPerms.push({
            id: `temp-${Date.now()}`,
            module: moduleId,
            canView: field === "canView" ? newValue : true,
            canUpdate: field === "canUpdate" ? newValue : false,
            canDelete: field === "canDelete" ? newValue : false,
          });
        }

        return { ...u, permissions: updatedPerms };
      })
    );

    startTransition(async () => {
      try {
        const user = users.find((u) => u.id === userId);
        const current = getModPerm(user!, moduleId);
        const newCanView = field === "canView" ? newValue : (newValue ? true : current.canView);
        const newCanUpdate = field === "canUpdate" ? newValue : current.canUpdate;
        const newCanDelete = field === "canDelete" ? newValue : current.canDelete;

        await updateUserModulePermission(userId, moduleId, newCanView, newCanUpdate, newCanDelete);
        showToast(`Updated ${moduleId} permissions for ${user?.name || user?.email}`);
      } catch (err: any) {
        showToast(err.message || "Failed to update permissions", "error");
      }
    });
  };

  // Preset application handler
  const handleApplyPreset = (userId: string, preset: any) => {
    startTransition(async () => {
      try {
        await applyRolePreset(userId, preset);
        showToast("Preset applied successfully");
        window.location.reload();
      } catch (err: any) {
        showToast(err.message || "Failed to apply preset", "error");
      }
    });
  };

  // Campus scope change handler
  const handleCampusChange = (userId: string, campusId: string) => {
    startTransition(async () => {
      try {
        await updateUserCampusAssignment(userId, campusId === "ALL" ? null : campusId);
        const selectedCampus = campuses.find((c) => c.id === campusId);
        showToast(
          `Updated campus scope to ${selectedCampus ? selectedCampus.name : "All Schools (Unbound)"}`
        );
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, campusId: campusId === "ALL" ? null : campusId } : u))
        );
      } catch (err: any) {
        showToast(err.message || "Failed to update campus scope", "error");
      }
    });
  };

  // Add user submit
  const handleAddUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        await addUserWithPermissions(newEmail, newName, newRole, newPreset, newCampusId);
        showToast(`User ${newEmail} added and permissions provisioned!`);
        setIsAddUserOpen(false);
        setNewEmail("");
        setNewName("");
        setNewCampusId("ALL");
        window.location.reload();
      } catch (err: any) {
        showToast(err.message || "Failed to add user", "error");
      }
    });
  };

  // Status toggle handler
  const handleToggleStatus = (userId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    startTransition(async () => {
      try {
        await toggleUserStatus(userId, nextStatus);
        showToast(`User status updated to ${nextStatus}`);
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status: nextStatus } : u)));
      } catch (err: any) {
        showToast(err.message || "Failed to toggle status", "error");
      }
    });
  };

  // Delete user handler
  const handleDeleteUser = (userId: string, email: string) => {
    if (!confirm(`Are you sure you want to permanently delete access for ${email}?`)) return;
    startTransition(async () => {
      try {
        await deleteUser(userId);
        showToast(`Deleted ${email}`);
        setUsers((prev) => prev.filter((u) => u.id !== userId));
      } catch (err: any) {
        showToast(err.message || "Failed to delete user", "error");
      }
    });
  };

  // Approve pending user access request handler
  const handleApproveUser = (userId: string, email: string, preset: any) => {
    startTransition(async () => {
      try {
        await approveUserAccess(userId, preset);
        showToast(`Approved access for ${email}!`);
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, status: "ACTIVE" } : u))
        );
        window.location.reload();
      } catch (err: any) {
        showToast(err.message || "Failed to approve user", "error");
      }
    });
  };

  // Deny and delete pending user access request handler
  const handleDenyUser = (userId: string, email: string) => {
    if (!confirm(`Are you sure you want to DENY and DELETE the access request for ${email}?`)) return;
    startTransition(async () => {
      try {
        await denyAndDeleteUserRequest(userId);
        showToast(`Access request for ${email} denied and deleted.`);
        setUsers((prev) => prev.filter((u) => u.id !== userId));
      } catch (err: any) {
        showToast(err.message || "Failed to deny request", "error");
      }
    });
  };

  const pendingUsers = users.filter((u) => u.status === "PENDING");

  // Filter users by search
  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 w-full max-w-full">
      {/* Toast Feedback Notification */}
      {feedbackMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-2xl shadow-xl flex items-center gap-3 text-sm font-semibold animate-in slide-in-from-bottom-3 duration-200 ${
            feedbackMessage.type === "success"
              ? "bg-[#0F9D58] text-white"
              : "bg-rose-600 text-white"
          }`}
        >
          {feedbackMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* PENDING APPROVALS QUEUE CARD */}
      {pendingUsers.length > 0 && (
        <div className="bg-amber-50/90 border border-amber-200/90 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 font-bold shrink-0">
                <ShieldAlert className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <h2 className="text-base font-black text-amber-950 tracking-tight">
                  Pending Access Approvals ({pendingUsers.length})
                </h2>
                <p className="text-xs text-amber-800">
                  Staff members authenticated via Google (@dpskanpur.com) awaiting role approval and module permissions.
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold bg-amber-200/80 text-amber-950 px-3 py-1 rounded-full w-fit">
              Approval Required
            </span>
          </div>

          <div className="divide-y divide-amber-200/60 bg-white rounded-2xl border border-amber-200 overflow-hidden shadow-2xs">
            {pendingUsers.map((pUser) => (
              <div key={pUser.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-amber-50/40 transition">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 border border-amber-200 flex items-center justify-center font-bold text-xs shrink-0">
                    {(pUser.name || pUser.email).slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-xs sm:text-sm">{pUser.name || pUser.email.split("@")[0]}</div>
                    <div className="text-xs text-slate-500 font-mono">{pUser.email}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) {
                        handleApproveUser(pUser.id, pUser.email, e.target.value as any);
                        e.target.value = "";
                      }
                    }}
                    className="text-xs bg-[#0F9D58] hover:bg-[#0d8a4d] text-white font-bold rounded-xl px-3.5 py-2 border border-emerald-700 cursor-pointer shadow-xs focus:outline-none"
                  >
                    <option value="" disabled>
                      Approve & Assign Role...
                    </option>
                    <option value="FEES_SPECIALIST" className="bg-white text-slate-800">💳 Approve as Fee Desk Specialist</option>
                    <option value="ADMISSIONS_SPECIALIST" className="bg-white text-slate-800">🎓 Approve as Admissions Specialist</option>
                    <option value="VIEW_ALL" className="bg-white text-slate-800">👁️ Approve as Staff Viewer</option>
                    <option value="FULL_ADMIN" className="bg-white text-slate-800">⭐ Approve as Full Administrator</option>
                  </select>

                  <button
                    onClick={() => handleDenyUser(pUser.id, pUser.email)}
                    title="Deny access request and delete user"
                    className="inline-flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-700 border border-rose-200 font-bold text-xs px-3.5 py-2 rounded-xl transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Deny & Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Controls: Search, View Switcher & Add User Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search staff by name, email, or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F9D58] focus:bg-white transition"
          />
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition ${
                viewMode === "table" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <List className="w-3.5 h-3.5 text-emerald-700" />
              <span>Table Matrix</span>
            </button>
            <button
              onClick={() => setViewMode("cards")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition ${
                viewMode === "cards" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 text-emerald-700" />
              <span>Card Grid</span>
            </button>
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-2 rounded-xl">
            <span>Staff: <strong>{users.length}</strong></span>
          </div>

          <button
            onClick={() => setIsAddUserOpen(true)}
            className="inline-flex items-center gap-2 bg-[#0F9D58] hover:bg-[#0d8a4d] active:scale-95 text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl shadow-sm transition cursor-pointer shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add / Invite Staff</span>
          </button>
        </div>
      </div>

      {/* VIEW MODE 1: SLEEK 100% WIDTH TABLE MATRIX WITH ACCORDION DRAWERS */}
      {viewMode === "table" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden w-full">
          <table className="w-full text-left border-collapse table-auto">
            <thead>
              <tr className="bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider border-b border-slate-800">
                <th className="p-4 w-[28%]">Staff & School Scope</th>
                <th className="p-4 w-[20%]">Status & Preset</th>
                <th className="p-4 w-[42%]">Module Permissions Summary</th>
                <th className="p-4 w-[10%] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-slate-400">
                    No staff members match the search query "{searchQuery}".
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isSuperAdmin = u.email === "admin@dpskanpur.com" || u.role === "SUPER_ADMIN";
                  const isSuspended = u.status === "SUSPENDED";
                  const isExpanded = !!expandedUserIds[u.id];

                  return (
                    <tr key={u.id} className="contents group">
                      <td colSpan={4} className="p-0 border-b border-slate-100">
                        <div
                          className={`flex flex-col md:flex-row md:items-center p-4 gap-4 transition ${
                            isSuspended ? "bg-rose-50/30 opacity-75" : isExpanded ? "bg-emerald-50/20" : "hover:bg-slate-50/80"
                          }`}
                        >
                          {/* Column 1: Staff Identity & School Scope (28%) */}
                          <div className="md:w-[28%] space-y-2">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-slate-700 text-xs shrink-0 shadow-2xs">
                                {u.avatarUrl ? (
                                  <img src={u.avatarUrl} alt="" className="w-9 h-9 rounded-xl object-cover" />
                                ) : (
                                  (u.name || u.email).slice(0, 2).toUpperCase()
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-slate-900 flex items-center gap-1.5 truncate">
                                  <span className="truncate">{u.name || u.email.split("@")[0]}</span>
                                  {isSuperAdmin && (
                                    <span title="Protected Super Administrator">
                                      <ShieldCheck className="w-4 h-4 text-[#0F9D58] shrink-0" />
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400 font-mono truncate">{u.email}</div>
                              </div>
                            </div>

                            {/* Campus Scope Selector */}
                            <div className="pt-0.5">
                              <select
                                value={u.campusId || "ALL"}
                                disabled={isSuperAdmin}
                                onChange={(e) => handleCampusChange(u.id, e.target.value)}
                                className="w-full max-w-[240px] text-[11px] bg-emerald-50/80 border border-emerald-200 rounded-lg px-2.5 py-1 text-emerald-950 font-bold hover:bg-emerald-100 focus:outline-none focus:ring-1 focus:ring-[#0F9D58] cursor-pointer disabled:opacity-50 transition shadow-2xs"
                                title="Assigned Campus Scope"
                              >
                                <option value="ALL">🌐 All Schools (Unbound)</option>
                                {campuses.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    🏫 {c.name} ({c.code})
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* Column 2: Status & Preset (20%) */}
                          <div className="md:w-[20%] space-y-1.5">
                            <div>
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  isSuspended
                                    ? "bg-rose-100 text-rose-800 border border-rose-200"
                                    : u.status === "PENDING"
                                    ? "bg-amber-100 text-amber-800 border border-amber-200"
                                    : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                }`}
                              >
                                {isSuspended ? "Suspended" : u.status === "PENDING" ? "Pending Approval" : "Active Member"}
                              </span>
                            </div>

                            {!isSuperAdmin ? (
                              <select
                                defaultValue=""
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleApplyPreset(u.id, e.target.value);
                                    e.target.value = "";
                                  }
                                }}
                                className="w-full max-w-[200px] text-[11px] bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700 font-medium hover:bg-slate-100 focus:outline-none focus:ring-1 focus:ring-[#0F9D58] cursor-pointer"
                              >
                                <option value="" disabled>
                                  Apply Preset...
                                </option>
                                <option value="FULL_ADMIN">⭐ Full Administrator</option>
                                <option value="FEES_SPECIALIST">💳 Fee Desk Specialist</option>
                                <option value="ADMISSIONS_SPECIALIST">🎓 Admissions Specialist</option>
                                <option value="VIEW_ALL">👁️ View All Modules</option>
                                <option value="REVOKE_ALL">🚫 Revoke All Access</option>
                              </select>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-bold italic">
                                Super Administrator
                              </span>
                            )}
                          </div>

                          {/* Column 3: Module Permissions Summary Chips (42%) */}
                          <div className="md:w-[42%]">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {APP_MODULES.map((mod) => {
                                const perm = getModPerm(u, mod.id);
                                const hasAny = isSuperAdmin || perm.canView || perm.canUpdate || perm.canDelete;

                                return (
                                  <div
                                    key={mod.id}
                                    onClick={() => toggleExpand(u.id)}
                                    title={`Click to configure ${mod.label} permissions`}
                                    className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-bold cursor-pointer transition hover:scale-102 ${
                                      hasAny
                                        ? "bg-emerald-50 text-emerald-950 border-emerald-200 shadow-2xs"
                                        : "bg-slate-50 text-slate-400 border-slate-200"
                                    }`}
                                  >
                                    {getModuleIcon(mod.id)}
                                    <span>{mod.label.split(" ")[0]}</span>

                                    {isSuperAdmin ? (
                                      <span className="text-[#0F9D58] font-mono text-[9px] font-black">ALL</span>
                                    ) : (
                                      <span className="font-mono text-[9px] tracking-tight text-slate-600">
                                        <span className={perm.canView ? "text-emerald-700 font-black" : "opacity-30"}>V</span>
                                        <span className={perm.canUpdate ? "text-blue-700 font-black ml-0.5" : "opacity-30 ml-0.5"}>U</span>
                                        <span className={perm.canDelete ? "text-rose-700 font-black ml-0.5" : "opacity-30 ml-0.5"}>D</span>
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Column 4: Quick Actions & Accordion Toggle (10%) */}
                          <div className="md:w-[10%] flex items-center justify-end gap-1.5 shrink-0">
                            <button
                              onClick={() => toggleExpand(u.id)}
                              className={`p-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                                isExpanded
                                  ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                                  : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                              }`}
                              title={isExpanded ? "Collapse Module Drawer" : "Configure Detailed Permissions"}
                            >
                              <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-800" />
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>

                            {!isSuperAdmin && (
                              <>
                                <button
                                  onClick={() => handleToggleStatus(u.id, u.status)}
                                  className={`p-1.5 rounded-lg transition ${
                                    isSuspended
                                      ? "text-emerald-600 hover:bg-emerald-50"
                                      : "text-amber-600 hover:bg-amber-50"
                                  }`}
                                  title={isSuspended ? "Activate User" : "Suspend User"}
                                >
                                  {isSuspended ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                                </button>

                                <button
                                  onClick={() => handleDeleteUser(u.id, u.email)}
                                  className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition"
                                  title="Delete User"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* ACCORDION EXPANDED PERMISSION MATRIX DRAWER */}
                        {isExpanded && (
                          <div className="bg-slate-50 p-5 sm:p-6 border-t border-b border-slate-200 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <SlidersHorizontal className="w-4 h-4 text-emerald-700" />
                                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                                  Granular Module Permission Matrix — {u.name || u.email}
                                </h4>
                              </div>
                              <span className="text-[11px] text-slate-500 font-medium">
                                Toggle any switch to instantly update staff access rights in real-time.
                              </span>
                            </div>

                            {/* 6 Module Cards Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {APP_MODULES.map((mod) => {
                                const perm = getModPerm(u, mod.id);
                                const disabled = isSuperAdmin || isSuspended;

                                return (
                                  <div
                                    key={mod.id}
                                    className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3"
                                  >
                                    <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                                      <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                                        {getModuleIcon(mod.id)}
                                      </div>
                                      <div>
                                        <div className="text-xs font-bold text-slate-900">{mod.label}</div>
                                        <div className="text-[10px] text-slate-400 font-mono">Module ID: {mod.id}</div>
                                      </div>
                                    </div>

                                    {/* 3 Interactive Toggle Switch Chips */}
                                    <div className="space-y-2">
                                      {/* View Switch */}
                                      <label
                                        className={`flex items-center justify-between p-2 rounded-xl text-xs font-semibold border transition ${
                                          disabled
                                            ? "cursor-not-allowed opacity-60 bg-slate-50 border-slate-200"
                                            : isSuperAdmin || perm.canView
                                            ? "bg-emerald-50/80 border-emerald-200 text-emerald-950 cursor-pointer"
                                            : "bg-slate-50/50 border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                                        }`}
                                      >
                                        <div className="flex items-center gap-2">
                                          <Eye className="w-3.5 h-3.5 text-emerald-700" />
                                          <span>Read / View Access</span>
                                        </div>
                                        <input
                                          type="checkbox"
                                          checked={isSuperAdmin ? true : perm.canView}
                                          disabled={disabled}
                                          onChange={() =>
                                            handleToggle(u.id, mod.id, "canView", perm.canView)
                                          }
                                          className="w-4 h-4 rounded text-[#0F9D58] focus:ring-[#0F9D58] accent-[#0F9D58] cursor-pointer"
                                        />
                                      </label>

                                      {/* Update / Create Switch */}
                                      <label
                                        className={`flex items-center justify-between p-2 rounded-xl text-xs font-semibold border transition ${
                                          disabled
                                            ? "cursor-not-allowed opacity-60 bg-slate-50 border-slate-200"
                                            : isSuperAdmin || perm.canUpdate
                                            ? "bg-blue-50/80 border-blue-200 text-blue-950 cursor-pointer"
                                            : "bg-slate-50/50 border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                                        }`}
                                      >
                                        <div className="flex items-center gap-2">
                                          <Pencil className="w-3.5 h-3.5 text-blue-700" />
                                          <span>Update & Create Access</span>
                                        </div>
                                        <input
                                          type="checkbox"
                                          checked={isSuperAdmin ? true : perm.canUpdate}
                                          disabled={disabled}
                                          onChange={() =>
                                            handleToggle(u.id, mod.id, "canUpdate", perm.canUpdate)
                                          }
                                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-600 accent-blue-600 cursor-pointer"
                                        />
                                      </label>

                                      {/* Delete Switch */}
                                      <label
                                        className={`flex items-center justify-between p-2 rounded-xl text-xs font-semibold border transition ${
                                          disabled
                                            ? "cursor-not-allowed opacity-60 bg-slate-50 border-slate-200"
                                            : isSuperAdmin || perm.canDelete
                                            ? "bg-rose-50/80 border-rose-200 text-rose-950 cursor-pointer"
                                            : "bg-slate-50/50 border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                                        }`}
                                      >
                                        <div className="flex items-center gap-2">
                                          <Trash2 className="w-3.5 h-3.5 text-rose-700" />
                                          <span>Permanent Delete Access</span>
                                        </div>
                                        <input
                                          type="checkbox"
                                          checked={isSuperAdmin ? true : perm.canDelete}
                                          disabled={disabled}
                                          onChange={() =>
                                            handleToggle(u.id, mod.id, "canDelete", perm.canDelete)
                                          }
                                          className="w-4 h-4 rounded text-rose-600 focus:ring-rose-600 accent-rose-600 cursor-pointer"
                                        />
                                      </label>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* VIEW MODE 2: RESPONSIVE STAFF CARD GRID */}
      {viewMode === "cards" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          {filteredUsers.map((u) => {
            const isSuperAdmin = u.email === "admin@dpskanpur.com" || u.role === "SUPER_ADMIN";
            const isSuspended = u.status === "SUSPENDED";

            return (
              <div
                key={u.id}
                className={`bg-white rounded-3xl p-6 border shadow-xs space-y-5 ${
                  isSuspended ? "border-rose-200 bg-rose-50/20" : "border-slate-200"
                }`}
              >
                {/* Card Header: Identity, Status & Actions */}
                <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-slate-700 text-sm shrink-0">
                      {u.avatarUrl ? (
                        <img src={u.avatarUrl} alt="" className="w-11 h-11 rounded-2xl object-cover" />
                      ) : (
                        (u.name || u.email).slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                        <span>{u.name || u.email.split("@")[0]}</span>
                        {isSuperAdmin && (
                          <span title="Super Administrator">
                            <ShieldCheck className="w-4 h-4 text-[#0F9D58]" />
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 font-mono">{u.email}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {!isSuperAdmin && (
                      <>
                        <button
                          onClick={() => handleToggleStatus(u.id, u.status)}
                          className={`p-2 rounded-xl transition ${
                            isSuspended
                              ? "text-emerald-600 hover:bg-emerald-50"
                              : "text-amber-600 hover:bg-amber-50"
                          }`}
                          title={isSuspended ? "Activate User" : "Suspend User"}
                        >
                          {isSuspended ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                        </button>

                        <button
                          onClick={() => handleDeleteUser(u.id, u.email)}
                          className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition"
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Scope & Preset Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Campus Scope
                    </label>
                    <select
                      value={u.campusId || "ALL"}
                      disabled={isSuperAdmin}
                      onChange={(e) => handleCampusChange(u.id, e.target.value)}
                      className="w-full text-xs bg-emerald-50/80 border border-emerald-200 rounded-xl px-3 py-2 text-emerald-950 font-bold focus:outline-none cursor-pointer disabled:opacity-50"
                    >
                      <option value="ALL">🌐 All Schools (Unbound)</option>
                      {campuses.map((c) => (
                        <option key={c.id} value={c.id}>
                          🏫 {c.name} ({c.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Role & Preset
                    </label>
                    {!isSuperAdmin ? (
                      <select
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value) {
                            handleApplyPreset(u.id, e.target.value);
                            e.target.value = "";
                          }
                        }}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-medium focus:outline-none cursor-pointer"
                      >
                        <option value="" disabled>
                          Apply Preset...
                        </option>
                        <option value="FULL_ADMIN">⭐ Full Administrator</option>
                        <option value="FEES_SPECIALIST">💳 Fee Desk Specialist</option>
                        <option value="ADMISSIONS_SPECIALIST">🎓 Admissions Specialist</option>
                        <option value="VIEW_ALL">👁️ View All Modules</option>
                        <option value="REVOKE_ALL">🚫 Revoke All Access</option>
                      </select>
                    ) : (
                      <div className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200">
                        ⭐ Full Super Administrator
                      </div>
                    )}
                  </div>
                </div>

                {/* Module Toggles List */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Module Access Controls
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {APP_MODULES.map((mod) => {
                      const perm = getModPerm(u, mod.id);
                      const disabled = isSuperAdmin || isSuspended;

                      return (
                        <div
                          key={mod.id}
                          className="p-3 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-2"
                        >
                          <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
                            {getModuleIcon(mod.id)}
                            <span>{mod.label}</span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] gap-2 pt-1">
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isSuperAdmin ? true : perm.canView}
                                disabled={disabled}
                                onChange={() => handleToggle(u.id, mod.id, "canView", perm.canView)}
                                className="w-3.5 h-3.5 rounded text-[#0F9D58] accent-[#0F9D58]"
                              />
                              <span className="font-semibold text-slate-600">View</span>
                            </label>

                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isSuperAdmin ? true : perm.canUpdate}
                                disabled={disabled}
                                onChange={() => handleToggle(u.id, mod.id, "canUpdate", perm.canUpdate)}
                                className="w-3.5 h-3.5 rounded text-blue-600 accent-blue-600"
                              />
                              <span className="font-semibold text-slate-600">Update</span>
                            </label>

                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isSuperAdmin ? true : perm.canDelete}
                                disabled={disabled}
                                onChange={() => handleToggle(u.id, mod.id, "canDelete", perm.canDelete)}
                                className="w-3.5 h-3.5 rounded text-rose-600 accent-rose-600"
                              />
                              <span className="font-semibold text-slate-600">Delete</span>
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Invite User Modal */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 space-y-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#0F9D58] flex items-center justify-center font-bold">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Invite Staff Member</h3>
                  <p className="text-xs text-slate-500">Provision granular module access</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddUserOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddUserSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Google Workspace Email (@dpskanpur.com) *
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@dpskanpur.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F9D58] focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Sharma"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F9D58] focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Initial Permission Preset *
                </label>
                <select
                  value={newPreset}
                  onChange={(e: any) => setNewPreset(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F9D58] focus:bg-white transition cursor-pointer"
                >
                  <option value="FEES_SPECIALIST">💳 Fee Desk Specialist (Fee Manage + Student View)</option>
                  <option value="ADMISSIONS_SPECIALIST">🎓 Admissions Specialist (Student/TC Manage + Fee View)</option>
                  <option value="VIEW_ALL">👁️ View-Only All Modules</option>
                  <option value="FULL_ADMIN">⭐ Full Administrator (All Modules View/Update/Delete)</option>
                  <option value="NONE">🚫 Zero Permissions (Pending Approval)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Campus Scope / School Access *
                </label>
                <select
                  value={newCampusId}
                  onChange={(e) => setNewCampusId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F9D58] focus:bg-white transition cursor-pointer"
                >
                  <option value="ALL">🌐 All Schools (Unbound)</option>
                  {campuses.map((c) => (
                    <option key={c.id} value={c.id}>
                      🏫 {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-[#0F9D58] hover:bg-[#0d8a4d] rounded-xl transition shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isPending ? "Adding..." : "Add & Provision User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
