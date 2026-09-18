import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeApiRequest, apiCampusWhere } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

// GET /api/v1/students - Retrieve filtered student list for API & MCP agents
export async function GET(request: Request) {
  const auth = await authorizeApiRequest(request, "students", "view");
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") || searchParams.get("search") || "";
    const campusId = searchParams.get("campusId");
    const status = searchParams.get("status");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10) || 50, 200);

    // A campus-bound caller can never widen the filter past their own campus.
    const where: any = { ...apiCampusWhere(auth, campusId) };

    if (status) {
      where.status = status;
    }

    if (query) {
      where.OR = [
        { firstName: { contains: query, mode: "insensitive" } },
        { lastName: { contains: query, mode: "insensitive" } },
        { registrationNo: { contains: query, mode: "insensitive" } },
        { scholarNo: { contains: query, mode: "insensitive" } },
        { admissionNo: { contains: query, mode: "insensitive" } },
      ];
    }

    const students = await prisma.student.findMany({
      where,
      take: limit,
      include: {
        campus: { select: { id: true, name: true, code: true } },
        class: { select: { id: true, name: true } },
        section: { select: { id: true, name: true } },
        guardians: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      count: students.length,
      data: students,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/v1/students - Programmatic registration API for AI agents & MCP
export async function POST(request: Request) {
  const auth = await authorizeApiRequest(request, "students", "update");
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const {
      campusId,
      classId,
      firstName,
      lastName,
      dob,
      gender,
      studentMobile,
      fatherName,
      fatherPhone,
      currentAddress,
    } = body;

    if (!campusId || !classId || !firstName || !lastName || !dob || !gender) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: campusId, classId, firstName, lastName, dob, gender" },
        { status: 400 }
      );
    }

    if (auth.campusId && campusId !== auth.campusId) {
      return NextResponse.json(
        { success: false, error: "You may only create records for your own campus." },
        { status: 403 }
      );
    }

    const campus = await prisma.campus.findUnique({ where: { id: campusId } });
    if (!campus) {
      return NextResponse.json({ success: false, error: "Invalid campusId" }, { status: 400 });
    }

    const year = new Date().getFullYear();
    const regCount = await prisma.student.count({
      where: { campusId, registrationNo: { not: null } },
    });
    const regSeq = regCount + 1;
    const registrationNo = `REG-${campus.code}-${year}-${String(regSeq).padStart(4, "0")}`;
    const scholarNo = `REG-TEMP-${campus.code}-${year}-${String(regSeq).padStart(4, "0")}`;

    const student = await prisma.student.create({
      data: {
        registrationNo,
        registrationDate: new Date(),
        admissionDate: new Date(),
        scholarNo,
        admissionNo: "REGISTRATION_PENDING",
        status: "REGISTERED",
        academicYearIn: "2026-2027",
        campus: { connect: { id: campusId } },
        class: { connect: { id: classId } },
        firstName: firstName.toUpperCase(),
        lastName: lastName.toUpperCase(),
        dob: new Date(dob),
        gender,
        studentMobile,
        currentAddress: currentAddress || "",
        guardians: fatherName
          ? {
              create: [
                {
                  relation: "FATHER",
                  name: fatherName.toUpperCase(),
                  phone: fatherPhone || "",
                  isPrimary: true,
                },
              ],
            }
          : undefined,
      },
      include: {
        campus: true,
        class: true,
        guardians: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Student registered successfully",
      data: student,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
