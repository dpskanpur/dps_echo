import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";
import { getCurrentUser, getUserPermissions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Shield, Lock, KeyRound, Sparkles, UserCheck } from "lucide-react";
import { RbacMatrixTable } from "@/components/RbacMatrixTable";

export const dynamic = "force-dynamic";

export default async function RbacManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ campus?: string }>;
}) {
  const { campus: campusId } = await searchParams;
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const permissions = await getUserPermissions(user);

  // Assert user can view RBAC page
  if (!permissions.isAdmin && !permissions.modules.rbac.canView) {
    redirect("/?error=unauthorized_rbac");
  }

  const campuses = await prisma.campus.findMany({ orderBy: { name: "asc" } });

  // Fetch all users with their module permissions
  const users = await prisma.user.findMany({
    include: {
      permissions: true,
    },
    orderBy: { createdAt: "desc" },
  });

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
                  <KeyRound className="w-5 h-5 text-[#34A853]" />
                </div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  Role-Based Access Control (RBAC) Matrix
                </h1>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Configure granular View (V), Update (U), and Delete (D) permissions per module for faculty and staff members under <span className="font-mono font-bold text-slate-700">@dpskanpur.com</span>.
              </p>
            </div>
          </div>

          {/* Interactive Matrix Table */}
          <RbacMatrixTable initialUsers={users} currentUserId={user.id} />
        </main>
      </div>
    </div>
  );
}
