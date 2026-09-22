import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";
import { requireUser, getUserPermissions } from "@/lib/auth";
import { resolveCampusScope } from "@/lib/permissions";
import { DesktopOnlyNotice } from "@/components/DesktopOnlyNotice";

export const dynamic = "force-dynamic";

/**
 * Shell for every staff page.
 *
 * Previously each page rendered the sidebar and navbar itself, so navigating
 * re-rendered the whole shell and nothing appeared until the server finished —
 * which read as the app hanging. With the shell in a layout it persists across
 * navigations and only the page body swaps, so loading.tsx can show a skeleton
 * in the content area while the shell stays put.
 *
 * The campus and session switchers read their values from the URL themselves,
 * because a layout does not receive searchParams.
 */
export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/");
  const permissions = await getUserPermissions(user);
  const scope = resolveCampusScope(user);

  const campuses = await prisma.campus.findMany({
    where: scope.locked ? { id: scope.campusId! } : {},
    orderBy: { name: "asc" },
  });

  return (
    <>
      {/* Below 768px: the staff console is not usable, so it is not shown. */}
      <DesktopOnlyNotice />

      <div className="hidden md:flex min-h-screen bg-whiten dark:bg-boxdark-2">
        <Sidebar userEmail={user.email} userRole={user.role} permissions={permissions} />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar campuses={campuses} user={user} permissions={permissions} />
          <main className="flex-1 p-4 md:p-6 2xl:p-10 mx-auto w-full max-w-screen-2xl">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
