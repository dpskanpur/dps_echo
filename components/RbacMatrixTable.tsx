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
} from "lucide-react";
import { APP_MODULES, AppModuleId } from "@/lib/permissions";
import {
  updateUserModulePermission,
  applyRolePreset,
  addUserWithPermissions,
  toggleUserStatus,
  deleteUser,
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
}: {
  initialUsers: UserWithPermissions[];
  currentUserId: string;
}) {
  const [users, setUsers] = useState<UserWithPermissions[]>(initialUsers);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Form state for adding user
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("STAFF");
  const [newPreset, setNewPreset] = useState<"FULL_ADMIN" | "FEES_SPECIALIST" | "ADMISSIONS_SPECIALIST" | "VIEW_ALL" | "NONE">("FEES_SPECIALIST");

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setFeedbackMessage({ text, type });
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  // Helper to find a specific module permission for a user
  const getModPerm = (user: UserWithPermissions, moduleId: string) => {
    return user.permissions.find((p) => p.module === moduleId) || {
      canView: false,
      canUpdate: false,
      canDelete: false,
    };
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

  // Add user submit
  const handleAddUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        await addUserWithPermissions(newEmail, newName, newRole, newPreset);
        showToast(`User ${newEmail} added and permissions provisioned!`);
        setIsAddUserOpen(false);
        setNewEmail("");
        setNewName("");
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

  // Filter users by search
  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
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

      {/* Top Controls: Search, Stat Badges & Add User Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, email, or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F9D58] focus:bg-white transition"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl">
            <span>Total Staff: <strong>{users.length}</strong></span>
          </div>

          <button
            onClick={() => setIsAddUserOpen(true)}
            className="inline-flex items-center gap-2 bg-[#0F9D58] hover:bg-[#0d8a4d] active:scale-95 text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl shadow-sm transition cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add / Invite Staff</span>
          </button>
        </div>
      </div>

      {/* Main RBAC Matrix Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider border-b border-slate-800">
                <th className="p-4 min-w-[220px]">Staff Member & Identity</th>
                <th className="p-4 min-w-[150px]">Status & Preset</th>
                {APP_MODULES.map((mod) => (
                  <th key={mod.id} className="p-4 text-center min-w-[170px] border-l border-slate-800">
                    <div>{mod.label}</div>
                    <div className="text-[9px] font-normal text-slate-400 normal-case flex items-center justify-center gap-3 mt-1 font-mono">
                      <span title="View Permission">V (View)</span>
                      <span title="Update/Create Permission">U (Update)</span>
                      <span title="Delete Permission">D (Delete)</span>
                    </div>
                  </th>
                ))}
                <th className="p-4 text-right min-w-[100px] border-l border-slate-800">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={APP_MODULES.length + 3} className="p-12 text-center text-slate-400">
                    No staff members match the query "{searchQuery}".
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isSuperAdmin = u.email === "admin@dpskanpur.com" || u.role === "SUPER_ADMIN";
                  const isSuspended = u.status === "SUSPENDED";

                  return (
                    <tr
                      key={u.id}
                      className={`hover:bg-slate-50/80 transition ${
                        isSuspended ? "bg-rose-50/30 opacity-70" : ""
                      }`}
                    >
                      {/* User Info */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-slate-700 text-xs shrink-0">
                            {u.avatarUrl ? (
                              <img src={u.avatarUrl} alt="" className="w-9 h-9 rounded-xl object-cover" />
                            ) : (
                              (u.name || u.email).slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{u.name || u.email.split("@")[0]}</span>
                              {isSuperAdmin && (
                                <span title="Super Administrator">
                                  <ShieldCheck className="w-3.5 h-3.5 text-[#0F9D58]" />
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Status & Preset Selector */}
                      <td className="p-4">
                        <div className="space-y-1.5">
                          <div>
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isSuspended
                                  ? "bg-rose-100 text-rose-800 border border-rose-200"
                                  : u.status === "PENDING"
                                  ? "bg-amber-100 text-amber-800 border border-amber-200"
                                  : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              }`}
                            >
                              {isSuspended ? "Suspended" : u.status === "PENDING" ? "Pending (0 Perms)" : "Active"}
                            </span>
                          </div>

                          {/* Quick Preset Dropdown */}
                          {!isSuperAdmin && (
                            <select
                              defaultValue=""
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleApplyPreset(u.id, e.target.value);
                                  e.target.value = "";
                                }
                              }}
                              className="text-[11px] bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700 font-medium hover:bg-slate-100 focus:outline-none focus:ring-1 focus:ring-[#0F9D58] cursor-pointer"
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
                          )}
                        </div>
                      </td>

                      {/* Checkboxes for each Module */}
                      {APP_MODULES.map((mod) => {
                        const perm = getModPerm(u, mod.id);
                        const disabled = isSuperAdmin || isSuspended;

                        return (
                          <td
                            key={mod.id}
                            className="p-4 text-center border-l border-slate-100 bg-slate-50/30"
                          >
                            <div className="flex items-center justify-center gap-3">
                              {/* View Checkbox */}
                              <label
                                className={`inline-flex flex-col items-center gap-1 ${
                                  disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                                }`}
                                title={`${mod.label} - View Permission`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSuperAdmin ? true : perm.canView}
                                  disabled={disabled}
                                  onChange={() =>
                                    handleToggle(u.id, mod.id, "canView", perm.canView)
                                  }
                                  className="w-4 h-4 rounded text-[#0F9D58] focus:ring-[#0F9D58] border-slate-300 accent-[#0F9D58]"
                                />
                                <span className="text-[9px] font-mono text-slate-400">V</span>
                              </label>

                              {/* Update Checkbox */}
                              <label
                                className={`inline-flex flex-col items-center gap-1 ${
                                  disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                                }`}
                                title={`${mod.label} - Update/Create Permission`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSuperAdmin ? true : perm.canUpdate}
                                  disabled={disabled}
                                  onChange={() =>
                                    handleToggle(u.id, mod.id, "canUpdate", perm.canUpdate)
                                  }
                                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-600 border-slate-300 accent-blue-600"
                                />
                                <span className="text-[9px] font-mono text-slate-400">U</span>
                              </label>

                              {/* Delete Checkbox */}
                              <label
                                className={`inline-flex flex-col items-center gap-1 ${
                                  disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                                }`}
                                title={`${mod.label} - Delete Permission`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSuperAdmin ? true : perm.canDelete}
                                  disabled={disabled}
                                  onChange={() =>
                                    handleToggle(u.id, mod.id, "canDelete", perm.canDelete)
                                  }
                                  className="w-4 h-4 rounded text-rose-600 focus:ring-rose-600 border-slate-300 accent-rose-600"
                                />
                                <span className="text-[9px] font-mono text-slate-400">D</span>
                              </label>
                            </div>
                          </td>
                        );
                      })}

                      {/* Row Actions */}
                      <td className="p-4 text-right border-l border-slate-100">
                        {!isSuperAdmin ? (
                          <div className="flex items-center justify-end gap-1.5">
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
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-semibold italic">
                            Protected
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

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
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
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
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F9D58] focus:bg-white transition"
                >
                  <option value="FEES_SPECIALIST">💳 Fee Desk Specialist (Fee Manage + Student View)</option>
                  <option value="ADMISSIONS_SPECIALIST">🎓 Admissions Specialist (Student/TC Manage + Fee View)</option>
                  <option value="VIEW_ALL">👁️ View-Only All Modules</option>
                  <option value="FULL_ADMIN">⭐ Full Administrator (All Modules View/Update/Delete)</option>
                  <option value="NONE">🚫 Zero Permissions (Pending Approval)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-[#0F9D58] hover:bg-[#0d8a4d] rounded-xl transition shadow-sm active:scale-95 disabled:opacity-50"
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
