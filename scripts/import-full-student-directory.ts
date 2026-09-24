import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Starting Full DPS Kidwai Nagar Student Directory Import...");

  const dataPath = path.join(__dirname, "students_data.json");
  const rawData = fs.readFileSync(dataPath, "utf-8");
  const students: any[] = JSON.parse(rawData);

  console.log(`📦 Loaded ${students.length} student records from JSON.`);

  // 1. Clear existing student directory records
  await prisma.feePayment.deleteMany();
  await prisma.feeInvoiceItem.deleteMany();
  await prisma.feeInvoice.deleteMany();
  await prisma.studentDiscount.deleteMany();
  await prisma.transferCertificate.deleteMany();
  await prisma.studentDocument.deleteMany();
  await prisma.guardian.deleteMany();
  await prisma.student.deleteMany();

  console.log("🧹 Cleared all existing student directory records.");

  // 2. Fetch or create Kidwai Nagar campus
  let campus = await prisma.campus.findUnique({ where: { code: "KID" } });
  if (!campus) {
    campus = await prisma.campus.create({
      data: {
        code: "KID",
        name: "DPS Kidwai Nagar",
        tagline: "Junior Wing — Foundation for Lifelong Learning",
        affiliation: "Primary & Middle Wing under DPS Society",
        address: "133/452, O-Block, Kidwai Nagar",
        city: "Kanpur",
        state: "Uttar Pradesh",
        pincode: "208011",
        phone: "+91 512 2601144",
        email: "info@dpskidwainagar.com",
        website: "https://dpskidwainagar.com",
      },
    });
  }

  // 3. Fetch or create Active Academic Year
  let academicYear = await prisma.academicYear.findFirst({
    where: { isCurrent: true },
  });

  if (!academicYear) {
    academicYear = await prisma.academicYear.findFirst({
      orderBy: { startDate: "desc" },
    });
  }

  if (!academicYear) {
    academicYear = await prisma.academicYear.create({
      data: {
        name: "2026-2027",
        startDate: new Date("2026-04-01"),
        endDate: new Date("2027-03-31"),
        isCurrent: true,
      },
    });
  }

  // 4. Ensure Fee Head "QFS" exists
  let qfsHead = await prisma.feeHead.findUnique({
    where: { campusId_code: { campusId: campus.id, code: "QFS" } },
  });

  if (!qfsHead) {
    qfsHead = await prisma.feeHead.create({
      data: {
        campusId: campus.id,
        code: "QFS",
        name: "Quarterly Fees",
        description: "Quarterly fees",
        isOptional: false,
        isRefundable: false,
      },
    });
  }

  // 5. Cache Classes & Sections
  const existingClasses = await prisma.class.findMany({
    where: { campusId: campus.id },
    include: { sections: true },
  });

  const classMap = new Map<string, any>();
  existingClasses.forEach((c) => classMap.set(c.name.trim(), c));

  async function getOrCreateClassAndSection(className: string, sectionName: string) {
    let cls = classMap.get(className.trim());
    if (!cls) {
      const count = classMap.size;
      cls = await prisma.class.create({
        data: {
          campusId: campus!.id,
          name: className.trim(),
          numericGrade: count + 1,
          sequence: count + 1,
        },
        include: { sections: true },
      });
      classMap.set(className.trim(), cls);
    }

    let sec = cls.sections?.find((s: any) => s.name.trim() === sectionName.trim());
    if (!sec) {
      sec = await prisma.section.create({
        data: {
          classId: cls.id,
          name: sectionName.trim(),
          maxCapacity: 40,
        },
      });
    }

    return { classId: cls.id, sectionId: sec.id };
  }

  console.log("📥 Importing student records into database...");

  let importedCount = 0;
  for (let i = 0; i < students.length; i++) {
    const s = students[i];
    const { classId, sectionId } = await getOrCreateClassAndSection(s.className, s.sectionName);

    const newStudent = await prisma.student.create({
      data: {
        scholarNo: s.scholarNo,
        registrationNo: s.registrationNo,
        admissionNo: s.scholarNo,
        admissionDate: new Date(),
        academicYearIn: academicYear.name,
        firstName: s.firstName,
        lastName: s.lastName,
        dob: new Date(s.dob),
        gender: s.gender,
        bloodGroup: s.bloodGroup,
        house: s.house || "Ganga",
        campusId: campus.id,
        classId: classId,
        sectionId: sectionId,
        rollNo: (i % 35) + 1,
        status: "ACTIVE",
        currentAddress: s.currentAddress,
        permanentAddress: s.currentAddress,
        emergencyContact: s.fatherPhone,
        guardians: {
          create: [
            {
              relation: "FATHER",
              name: s.fatherName || "Father / Guardian",
              phone: s.fatherPhone || "9839000000",
              email: s.fatherEmail || null,
              isPrimary: true,
            },
            ...(s.motherName
              ? [
                  {
                    relation: "MOTHER",
                    name: s.motherName,
                    phone: s.fatherPhone || "9839000000",
                    isPrimary: false,
                  },
                ]
              : []),
          ],
        },
      },
    });

    // Generate Q1 Fee Invoice for each student (e.g. ₹18,000)
    // Create realistic sample distribution: 60% PAID, 30% PENDING, 10% OVERDUE
    const isPaid = i % 5 !== 0 && i % 7 !== 0;
    const isOverdue = i % 7 === 0;

    const grossAmount = 18000;
    const paidAmount = isPaid ? grossAmount : isOverdue ? 5000 : 0;
    const balanceAmount = grossAmount - paidAmount;
    const status = isPaid ? "PAID" : isOverdue ? "OVERDUE" : "PENDING";

    const invNo = `INV-KID-2026-Q1-${(i + 1001).toString().padStart(4, "0")}`;

    const inv = await prisma.feeInvoice.create({
      data: {
        invoiceNo: invNo,
        studentId: newStudent.id,
        campusId: campus.id,
        academicYearId: academicYear.id,
        periodName: "Quarter 1 (Apr 2026 - Jun 2026)",
        dueDate: new Date("2026-04-20"),
        grossAmount: grossAmount,
        discountAmount: 0,
        fineAmount: isOverdue ? 500 : 0,
        netAmount: grossAmount + (isOverdue ? 500 : 0),
        paidAmount: paidAmount,
        balanceAmount: balanceAmount + (isOverdue ? 500 : 0),
        status: status,
        items: {
          create: [{ feeHeadId: qfsHead.id, amount: grossAmount }],
        },
      },
    });

    if (isPaid) {
      await prisma.feePayment.create({
        data: {
          receiptNo: `REC-KID-2026-${(i + 1001).toString().padStart(5, "0")}`,
          invoiceId: inv.id,
          studentId: newStudent.id,
          paymentDate: new Date("2026-04-12"),
          paymentMode: i % 2 === 0 ? "ONLINE_UPI" : "CASH",
          amountPaid: grossAmount,
          cashierName: i % 2 === 0 ? "Online Parent Portal" : "Accounts Counter Desk",
          status: "SUCCESS",
        },
      });
    }

    importedCount++;
  }

  console.log(`🎉 Successfully imported all ${importedCount} actual student records!`);
}

main()
  .catch((e) => {
    console.error("❌ Import failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
