import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";
import { formatDate } from "@/lib/utils";
import { getCurrentUser, getUserPermissions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { GraduationCap, Search, Building2, Eye, Calendar, Award } from "lucide-react";
import { LiveSearchInput } from "@/components/LiveSearchInput";
import { Pagination } from "@/components/Pagination";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AlumniPage({
  searchParams,
}: {
  searchParams: Promise<{ campus?: string; q?: string; page?: string }>;
}) {
  const { campus: campusId, q, page: pageStr } = await searchParams;
  const user = await getCurrentUser();
  const permissions = await getUserPermissions(user);

  const userCampusCode = (permissions.campusCode || "").toUpperCase();
  const isJuniorCampusUser =
    userCampusCode === "DPSKID" ||
    userCampusCode === "KID" ||
    userCampusCode === "DPSSRV" ||
    userCampusCode === "SRV";

  if (isJuniorCampusUser && !permissions.isAdmin) {
    redirect("/students?notice=junior_campus_no_alumni");
  }

  if (!permissions.modules.alumni.canView && !permissions.isAdmin) {
    redirect("/?error=unauthorized_alumni");
  }

  const currentPage = Math.max(1, parseInt(pageStr || "1", 10));
  const pageSize = 10;

  const campuses = await prisma.campus.findMany({ orderBy: { name: "asc" } });

  // Deliberately NOT session-filtered: academicYearIn records the session a
  // student was admitted in, so filtering alumni by the current session would
  // hide everyone who actually graduated.
  const whereClause: any = {
    status: "ALUMNI",
    ...(campusId && campusId !== "ALL" ? { campusId } : {}),
  };

  if (q) {
    const cleanQ = q.trim();
    whereClause.OR = [
      { firstName: { contains: cleanQ, mode: "insensitive" } },
      { lastName: { contains: cleanQ, mode: "insensitive" } },
      { scholarNo: { contains: cleanQ, mode: "insensitive" } },
      { admissionNo: { contains: cleanQ, mode: "insensitive" } },
      { class: { name: { contains: cleanQ, mode: "insensitive" } } },
      { guardians: { some: { name: { contains: cleanQ, mode: "insensitive" } } } },
    ];
  }

  const [alumni, totalCount] = await Promise.all([
    prisma.student.findMany({
      where: whereClause,
      include: {
        campus: true,
        class: true,
        guardians: true,
      },
      orderBy: { admissionDate: "desc" },
      take: pageSize,
      skip: (currentPage - 1) * pageSize,
    }),
    prisma.student.count({ where: whereClause }),
  ]);

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
        <main className="p-8 space-y-6 flex-1 overflow-y-auto max-w-6xl mx-auto w-full">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-emerald-800" />
                <h1 className="text-xl font-black text-slate-900">
                  Alumni &amp; Historical Records Vault
                </h1>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Permanent institutional repository for Class 10 &amp; 12 passed-out graduates of DPS Azad Nagar &amp; DPS Barra.
              </p>
            </div>
            <span className="text-xs font-bold bg-purple-100 text-purple-900 px-3 py-1.5 rounded-lg border border-purple-200">
              Total Alumni Records: {totalCount}
            </span>
          </div>

          {/* Search Filter */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
            <LiveSearchInput
              defaultValue={q}
              placeholder="Search alumni by name, scholar ID or class..."
              className="flex-1"
            />
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

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={pageSize}
          />
        </main>
  );
}
