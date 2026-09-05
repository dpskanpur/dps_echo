import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";
import { formatDate } from "@/lib/utils";
import { getCurrentUser, getUserPermissions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { GraduationCap, Search, Building2, Eye, Calendar, Award } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AlumniPage({
  searchParams,
}: {
  searchParams: Promise<{ campus?: string; q?: string }>;
}) {
  const { campus: campusId, q } = await searchParams;
  const user = await getCurrentUser();
  const permissions = await getUserPermissions(user);

  if (!permissions.modules.alumni.canView && !permissions.isAdmin) {
    redirect("/?error=unauthorized_alumni");
  }

  const campuses = await prisma.campus.findMany({ orderBy: { name: "asc" } });

  const whereClause: any = {
    status: "ALUMNI",
    ...(campusId && campusId !== "ALL" ? { campusId } : {}),
  };

  if (q) {
    whereClause.OR = [
      { firstName: { contains: q } },
      { lastName: { contains: q } },
      { scholarNo: { contains: q } },
    ];
  }

  const alumni = await prisma.student.findMany({
    where: whereClause,
    include: {
      campus: true,
      class: true,
      guardians: true,
    },
    orderBy: { admissionDate: "desc" },
  });

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar userEmail={user?.email} userRole={user?.role} permissions={permissions} />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar campuses={campuses} selectedCampusId={campusId} user={user || undefined} permissions={permissions} />

        <main className="p-8 space-y-6 flex-1 overflow-y-auto max-w-6xl mx-auto w-full">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-emerald-800" />
                <h1 className="text-xl font-black text-slate-900">
                  Alumni & Historical Records Vault
                </h1>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Permanent institutional repository for graduated batches and passed-out students of DPS Kanpur.
              </p>
            </div>
            <span className="text-xs font-bold bg-purple-100 text-purple-900 px-3 py-1.5 rounded-lg border border-purple-200">
              Total Alumni Records: {alumni.length}
            </span>
          </div>

          {/* Search Filter */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
            <form method="GET" className="flex-1 relative">
              {campusId && <input type="hidden" name="campus" value={campusId} />}
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                name="q"
                defaultValue={q || ""}
                placeholder="Search alumni by name, scholar ID or year..."
                className="w-full bg-slate-50 text-xs border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </form>
          </div>

          {/* Alumni Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {alumni.length === 0 ? (
              <div className="col-span-full bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
                No alumni records found matching the query.
              </div>
            ) : (
              alumni.map((a) => (
                <div
                  key={a.id}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-emerald-500/40 transition flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                        {a.scholarNo}
                      </span>
                      <span className="text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded">
                        Graduated
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-900 font-bold text-sm flex items-center justify-center shrink-0">
                        {a.firstName[0]}
                        {a.lastName[0]}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          {a.firstName} {a.lastName}
                        </h3>
                        <p className="text-xs text-slate-500">{a.class.name}</p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 space-y-1 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-emerald-800" />
                        <span>{a.campus.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Tenure: {a.academicYearIn} to Passed Out</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-mono">DOB: {formatDate(a.dob)}</span>
                    <Link
                      href={`/students/${a.id}`}
                      className="text-emerald-800 font-bold hover:underline flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" /> Full Dossier
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
