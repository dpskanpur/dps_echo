"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export interface StudentImportRow {
  campusCode: string; // AZD, BAR, KID, SRV
  className: string; // Class 1, Class 6, Nursery, etc.
  sectionName?: string; // A, B, C
  scholarNo?: string;
  firstName: string;
  lastName: string;
  dob: string; // YYYY-MM-DD
  gender?: string; // MALE, FEMALE
  bloodGroup?: string;
  house?: string;
  aadhaarNo?: string;
  currentAddress?: string;
  fatherName?: string;
  fatherPhone?: string;
  fatherEmail?: string;
  fatherOccupation?: string;
  motherName?: string;
  motherPhone?: string;
  emergencyContact?: string;
}

export async function bulkImportStudents(rows: StudentImportRow[]): Promise<{
  success: boolean;
  importedCount: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let importedCount = 0;

  if (!rows || rows.length === 0) {
    return { success: false, importedCount: 0, errors: ["No student rows provided."] };
  }

  // Pre-fetch all campuses
  const campuses = await prisma.campus.findMany();
  const campusMap = new Map(campuses.map((c) => [c.code.toUpperCase(), c]));

  // Process rows in batch
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;

    try {
      const campus = campusMap.get((row.campusCode || "").trim().toUpperCase());
      if (!campus) {
        errors.push(`Row #${rowNum} (${row.firstName} ${row.lastName}): Invalid campus code "${row.campusCode}". Allowed: AZD, BAR, KID, SRV.`);
        continue;
      }

      if (!row.firstName || !row.lastName) {
        errors.push(`Row #${rowNum}: First name and last name are required.`);
        continue;
      }

      let parsedDob = new Date(row.dob);
      if (isNaN(parsedDob.getTime())) {
        parsedDob = new Date("2015-01-01");
      }

      // Find or create Class
      const clsName = (row.className || "Class 1").trim();
      let cls = await prisma.class.findFirst({
        where: {
          campusId: campus.id,
          name: clsName,
        },
      });

      if (!cls) {
        cls = await prisma.class.create({
          data: {
            campusId: campus.id,
            name: clsName,
            numericGrade: 1,
            sequence: 5,
          },
        });
      }

      // Find or create Section
      let secId: string | null = null;
      if (row.sectionName) {
        const secName = row.sectionName.trim().toUpperCase();
        let sec = await prisma.section.findFirst({
          where: {
            classId: cls.id,
            name: secName,
          },
        });

        if (!sec) {
          sec = await prisma.section.create({
            data: {
              classId: cls.id,
              name: secName,
            },
          });
        }
        secId = sec.id;
      }

      // Generate Scholar No if not supplied
      let scholarNo = row.scholarNo?.trim();
      const currentYear = new Date().getFullYear();
      if (!scholarNo) {
        const total = await prisma.student.count({ where: { campusId: campus.id } });
        scholarNo = `DPS-${campus.code}-${currentYear}-${String(total + 1).padStart(4, "0")}`;
      }

      const admissionNo = `${campus.code}/${currentYear}/${Date.now().toString().slice(-4)}`;

      // Create Student + Guardians in Prisma
      await prisma.student.create({
        data: {
          scholarNo,
          admissionNo,
          admissionDate: new Date(),
          academicYearIn: `${currentYear}-${currentYear + 1}`,
          firstName: row.firstName.trim(),
          lastName: row.lastName.trim(),
          dob: parsedDob,
          gender: (row.gender || "MALE").toUpperCase(),
          bloodGroup: row.bloodGroup || "B+",
          house: row.house || "Ganga",
          aadhaarNo: row.aadhaarNo || null,
          currentAddress: row.currentAddress || "",
          emergencyContact: row.emergencyContact || row.fatherPhone || row.motherPhone || "",
          campusId: campus.id,
          classId: cls.id,
          sectionId: secId,
          status: "ACTIVE",
          guardians: {
            create: [
              ...(row.fatherName
                ? [
                    {
                      relation: "FATHER",
                      name: row.fatherName.trim(),
                      phone: row.fatherPhone || row.emergencyContact || "0000000000",
                      email: row.fatherEmail || "",
                      occupation: row.fatherOccupation || "",
                      isPrimary: true,
                    },
                  ]
                : []),
              ...(row.motherName
                ? [
                    {
                      relation: "MOTHER",
                      name: row.motherName.trim(),
                      phone: row.motherPhone || "0000000000",
                      isPrimary: !row.fatherName,
                    },
                  ]
                : []),
            ],
          },
        },
      });

      importedCount++;
    } catch (err: any) {
      errors.push(`Row #${rowNum} (${row.firstName} ${row.lastName}): ${err.message}`);
    }
  }

  revalidatePath("/students");
  revalidatePath("/");

  return {
    success: importedCount > 0,
    importedCount,
    errors,
  };
}
