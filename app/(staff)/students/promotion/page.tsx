import { prisma } from "@/lib/prisma";
import { getCurrentUser, getUserPermissions } from "@/lib/auth";
import { listAcademicSessions } from "@/lib/academic-session";
import { redirect } from "next/navigation";
import { Building2, Sparkles, ArrowRight, CheckCircle2, Shield, Calendar, Users, SlidersHorizontal } from "lucide-react";
import { PromotionConsole } from "@/components/PromotionConsole";

export const dynamic = "force-dynamic";

export default async function StudentPromotionPage({
  searchParams,
}: {
  searchParams: Promise<{
    sourceCampusId?: string;
    sourceClassId?: string;
    sourceSession?: string;
    targetSession?: string;
    notice?: string;
  }>;
}) {
  const { sourceCampusId, sourceClassId, sourceSession = "2025-2026", targetSession = "2026-2027", notice } = await searchParams;
  const user = await getCurrentUser();
  const permissions = await getUserPermissions(user);

  if (!permissions.modules.students.canUpdate && !permissions.isAdmin) {
    redirect("/students?error=unauthorized_promotion");
  }

  const campuses = await prisma.campus.findMany({ orderBy: { name: "asc" } });
  const academicSessions = await listAcademicSessions();

  // Find classes
  const classes = await prisma.class.findMany({
    orderBy: [{ numericGrade: "asc" }, { sequence: "asc" }],
    include: { campus: true },
  });

  const activeSourceCampusId = sourceCampusId || campuses[0]?.id || "";
  const selectedSourceCampus = campuses.find((c) => c.id === activeSourceCampusId) || campuses[0];

  // Where clause for fetching students eligible for promotion
  const whereClause: any = {
    status: { in: ["ACTIVE", "REGISTERED"] },
  };

  if (activeSourceCampusId && activeSourceCampusId !== "ALL") {
    whereClause.campusId = activeSourceCampusId;
  }
  if (sourceClassId) {
    whereClause.classId = sourceClassId;
  }
  if (sourceSession) {
    whereClause.academicYearIn = sourceSession;
  }

  const students = await prisma.student.findMany({
    where: whereClause,
    include: {
      campus: true,
      class: true,
      section: true,
      guardians: { where: { isPrimary: true } },
    },
    orderBy: [{ classId: "asc" }, { lastName: "asc" }],
    take: 100,
  });

  return (
    <main className="p-6 sm:p-8 space-y-6 flex-1 overflow-y-auto max-w-7xl mx-auto w-full">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-900 text-amber-300 flex items-center justify-center font-bold shadow-md shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Annual Session Promotion & Inter-Campus Transfer Hub
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Promote students to new academic sessions, advance classes, or execute branch transfers (e.g. Kidwai Nagar / Servodaya Nagar to Azad Nagar / Barra).
            </p>
          </div>
        </div>

        {notice === "promoted" && (
          <div className="px-4 py-2 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-950 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            <span>Batch promotion & transfers completed successfully!</span>
          </div>
        )}
      </div>

      {/* Main Promotion & Branch Transfer Interactive Console */}
      <PromotionConsole
        students={students}
        campuses={campuses}
        classes={classes}
        academicSessions={academicSessions}
        sourceCampusId={activeSourceCampusId}
        sourceClassId={sourceClassId || ""}
        sourceSession={sourceSession}
        targetSession={targetSession}
      />
    </main>
  );
}
