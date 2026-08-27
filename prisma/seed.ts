import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting DPS Echo Database Seeding...");

  // Clear existing records in correct dependency order
  await prisma.feePayment.deleteMany();
  await prisma.feeInvoiceItem.deleteMany();
  await prisma.feeInvoice.deleteMany();
  await prisma.studentDiscount.deleteMany();
  await prisma.transferCertificate.deleteMany();
  await prisma.studentDocument.deleteMany();
  await prisma.guardian.deleteMany();
  await prisma.student.deleteMany();
  await prisma.feeStructure.deleteMany();
  await prisma.feeHead.deleteMany();
  await prisma.section.deleteMany();
  await prisma.class.deleteMany();
  await prisma.academicYear.deleteMany();
  await prisma.campus.deleteMany();

  console.log("🧹 Cleaned existing records.");

  // 1. Create Academic Years
  const ay2025 = await prisma.academicYear.create({
    data: {
      name: "2025-2026",
      startDate: new Date("2025-04-01"),
      endDate: new Date("2026-03-31"),
      isCurrent: true,
    },
  });

  const ay2026 = await prisma.academicYear.create({
    data: {
      name: "2026-2027",
      startDate: new Date("2026-04-01"),
      endDate: new Date("2027-03-31"),
      isCurrent: false,
    },
  });

  console.log("📅 Created Academic Years.");

  // 2. Create Campuses
  const campusesData = [
    {
      code: "AZD",
      name: "DPS Azad Nagar",
      tagline: "Service Before Self — Senior Secondary Co-educational CBSE",
      affiliation: "CBSE Affiliation No. 2130722, School Code 70154",
      address: "Main Campus, Azad Nagar, Post Office Kalyanpur",
      city: "Kanpur",
      state: "Uttar Pradesh",
      pincode: "208002",
      phone: "+91 512 2560012 / 2560013",
      email: "contact@dpsazadnagar.com",
      website: "https://dpsazadnagar.com",
    },
    {
      code: "BAR",
      name: "DPS Barra",
      tagline: "Empowering Minds, Shaping Tomorrow",
      affiliation: "CBSE Affiliation No. 2132332, School Code 70648",
      address: "Sector 6, Barra 8",
      city: "Kanpur",
      state: "Uttar Pradesh",
      pincode: "208027",
      phone: "+91 512 2680010 / 2680011",
      email: "principal@dpsbarra.com",
      website: "https://dpsbarra.com",
    },
    {
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
    {
      code: "SRV",
      name: "DPS Servodaya Nagar",
      tagline: "Pre-Primary & Primary Excellence Hub",
      affiliation: "Junior Wing under DPS Society",
      address: "11/24, Servodaya Nagar",
      city: "Kanpur",
      state: "Uttar Pradesh",
      pincode: "208005",
      phone: "+91 512 2542288",
      email: "info@dpsservodayanagar.com",
      website: "https://dpsservodayanagar.com",
    },
  ];

  const createdCampuses: Record<string, any> = {};
  for (const c of campusesData) {
    createdCampuses[c.code] = await prisma.campus.create({ data: c });
  }

  console.log(`🏫 Created ${Object.keys(createdCampuses).length} Campuses.`);

  // 3. Create Classes & Sections for each Campus
  const standardClasses = [
    { name: "Pre-Nursery", numericGrade: 0, sequence: 1 },
    { name: "Nursery", numericGrade: 0, sequence: 2 },
    { name: "Prep", numericGrade: 0, sequence: 3 },
    { name: "Class I", numericGrade: 1, sequence: 4 },
    { name: "Class II", numericGrade: 2, sequence: 5 },
    { name: "Class III", numericGrade: 3, sequence: 6 },
    { name: "Class IV", numericGrade: 4, sequence: 7 },
    { name: "Class V", numericGrade: 5, sequence: 8 },
    { name: "Class VI", numericGrade: 6, sequence: 9 },
    { name: "Class VII", numericGrade: 7, sequence: 10 },
    { name: "Class VIII", numericGrade: 8, sequence: 11 },
    { name: "Class IX", numericGrade: 9, sequence: 12 },
    { name: "Class X", numericGrade: 10, sequence: 13 },
    { name: "Class XI (Science)", numericGrade: 11, sequence: 14 },
    { name: "Class XI (Commerce)", numericGrade: 11, sequence: 15 },
    { name: "Class XII (Science)", numericGrade: 12, sequence: 16 },
    { name: "Class XII (Commerce)", numericGrade: 12, sequence: 17 },
  ];

  const primaryOnlyClasses = standardClasses.filter((c) => c.numericGrade <= 5);

  const campusClassesMap: Record<string, Record<string, any>> = {};
  const campusSectionsMap: Record<string, Record<string, any[]>> = {};

  for (const [code, campus] of Object.entries(createdCampuses)) {
    campusClassesMap[code] = {};
    campusSectionsMap[code] = {};

    const classList = code === "KID" || code === "SRV" ? primaryOnlyClasses : standardClasses;

    for (const item of classList) {
      const cls = await prisma.class.create({
        data: {
          campusId: campus.id,
          name: item.name,
          numericGrade: item.numericGrade,
          sequence: item.sequence,
        },
      });
      campusClassesMap[code][item.name] = cls;

      // Create sections A, B (and C for Senior school)
      const sectionNames = ["A", "B", ...(item.numericGrade >= 6 ? ["C"] : [])];
      campusSectionsMap[code][item.name] = [];

      for (const sName of sectionNames) {
        const sec = await prisma.section.create({
          data: {
            classId: cls.id,
            name: sName,
            roomNo: `Room-${item.sequence * 10 + (sName.charCodeAt(0) - 64)}`,
            maxCapacity: 40,
          },
        });
        campusSectionsMap[code][item.name].push(sec);
      }
    }
  }

  console.log("📚 Created Classes and Sections across all campuses.");

  // 4. Create Standard Fee Heads for Each Campus
  const feeHeadTemplates = [
    { code: "TUI", name: "Tuition Fee", description: "Quarterly Academic Tuition", isOptional: false, isRefundable: false },
    { code: "DEV", name: "Development & Infrastructure", description: "Annual Campus & Lab Maintenance", isOptional: false, isRefundable: false },
    { code: "ADM", name: "Admission & Registration Fee", description: "One-time Onboarding Fee", isOptional: false, isRefundable: false },
    { code: "SEC", name: "Caution Money (Refundable)", description: "Security deposit upon admission", isOptional: false, isRefundable: true },
    { code: "ACT", name: "Activity & Sports Fee", description: "Annual Co-curricular & Sports Levy", isOptional: false, isRefundable: false },
    { code: "LAB", name: "Science & Computer Lab Fee", description: "Practical Lab Charges", isOptional: false, isRefundable: false },
    { code: "TRN", name: "Transport Facility (Optional)", description: "Bus Route Service", isOptional: true, isRefundable: false },
  ];

  const campusFeeHeads: Record<string, Record<string, any>> = {};

  for (const [code, campus] of Object.entries(createdCampuses)) {
    campusFeeHeads[code] = {};
    for (const fh of feeHeadTemplates) {
      const head = await prisma.feeHead.create({
        data: {
          campusId: campus.id,
          code: fh.code,
          name: fh.name,
          description: fh.description,
          isOptional: fh.isOptional,
          isRefundable: fh.isRefundable,
        },
      });
      campusFeeHeads[code][fh.code] = head;
    }
  }

  console.log("💰 Created Fee Heads.");

  // 5. Create Fee Structures for Academic Year 2025-26
  for (const [code, campus] of Object.entries(createdCampuses)) {
    const heads = campusFeeHeads[code];
    const classes = campusClassesMap[code];

    for (const [className, cls] of Object.entries(classes)) {
      const isSenior = cls.numericGrade >= 9;
      const isPrimary = cls.numericGrade <= 5;

      // Quarterly Tuition
      const tuitionAmt = isSenior ? 24500 : isPrimary ? 18000 : 21000;
      await prisma.feeStructure.create({
        data: {
          campusId: campus.id,
          academicYearId: ay2025.id,
          classId: cls.id,
          feeHeadId: heads["TUI"].id,
          amount: tuitionAmt,
          frequency: "QUARTERLY",
        },
      });

      // Annual Development
      await prisma.feeStructure.create({
        data: {
          campusId: campus.id,
          academicYearId: ay2025.id,
          classId: cls.id,
          feeHeadId: heads["DEV"].id,
          amount: isSenior ? 12000 : 9000,
          frequency: "ANNUAL",
        },
      });

      // Annual Activity
      await prisma.feeStructure.create({
        data: {
          campusId: campus.id,
          academicYearId: ay2025.id,
          classId: cls.id,
          feeHeadId: heads["ACT"].id,
          amount: 4500,
          frequency: "ANNUAL",
        },
      });

      // Lab Fee for Senior Classes
      if (cls.numericGrade >= 9) {
        await prisma.feeStructure.create({
          data: {
            campusId: campus.id,
            academicYearId: ay2025.id,
            classId: cls.id,
            feeHeadId: heads["LAB"].id,
            amount: 6000,
            frequency: "QUARTERLY",
          },
        });
      }
    }
  }

  console.log("📊 Created Fee Structures for 2025-26.");

  // 6. Create Seed Students with Diverse Lifecycles
  // (Active, Sibling discount, Defaulters, TC Issued, Alumni)
  const azdCampus = createdCampuses["AZD"];
  const barCampus = createdCampuses["BAR"];
  const kidCampus = createdCampuses["KID"];
  const srvCampus = createdCampuses["SRV"];

  // Student 1: Aarav Sharma (Active, Class X-A, Azad Nagar)
  const clsX_AZD = campusClassesMap["AZD"]["Class X"];
  const secA_X_AZD = campusSectionsMap["AZD"]["Class X"][0];

  const student1 = await prisma.student.create({
    data: {
      scholarNo: "DPS-AZD-2018-0245",
      admissionNo: "AZD/2018/245",
      admissionDate: new Date("2018-04-05"),
      academicYearIn: "2018-2019",
      firstName: "Aarav",
      lastName: "Sharma",
      dob: new Date("2010-06-14"),
      gender: "MALE",
      bloodGroup: "B+",
      aadhaarNo: "7849-2391-4920",
      house: "Ganga",
      campusId: azdCampus.id,
      classId: clsX_AZD.id,
      sectionId: secA_X_AZD.id,
      rollNo: 12,
      status: "ACTIVE",
      currentAddress: "14/82, Civil Lines, Kanpur",
      permanentAddress: "14/82, Civil Lines, Kanpur",
      emergencyContact: "+91 98390 12345",
      guardians: {
        create: [
          {
            relation: "FATHER",
            name: "Rajesh Sharma",
            phone: "9839012345",
            email: "rajesh.sharma@example.com",
            occupation: "Chartered Accountant",
            organization: "R. Sharma & Associates",
            annualIncome: "₹18,00,000",
            isPrimary: true,
          },
          {
            relation: "MOTHER",
            name: "Sunita Sharma",
            phone: "9839012346",
            email: "sunita.sharma@example.com",
            occupation: "Architect",
            organization: "Urban Studio Kanpur",
            annualIncome: "₹12,00,000",
          },
        ],
      },
      documents: {
        create: [
          {
            docType: "BIRTH_CERTIFICATE",
            title: "Municipal Birth Certificate",
            fileName: "aarav_birth_cert.pdf",
            fileUrl: "/docs/sample-birth-cert.pdf",
            fileSize: "1.2 MB",
          },
          {
            docType: "AADHAAR_CARD",
            title: "Student Aadhaar Card",
            fileName: "aarav_aadhaar.pdf",
            fileUrl: "/docs/sample-aadhaar.pdf",
            fileSize: "850 KB",
          },
        ],
      },
    },
  });

  // Student 2: Ananya Sharma (Aarav's Sister - Sibling Discount 20%, Class VI-A, Azad Nagar)
  const clsVI_AZD = campusClassesMap["AZD"]["Class VI"];
  const secA_VI_AZD = campusSectionsMap["AZD"]["Class VI"][0];

  const student2 = await prisma.student.create({
    data: {
      scholarNo: "DPS-AZD-2022-0610",
      admissionNo: "AZD/2022/610",
      admissionDate: new Date("2022-04-10"),
      academicYearIn: "2022-2023",
      firstName: "Ananya",
      lastName: "Sharma",
      dob: new Date("2014-09-22"),
      gender: "FEMALE",
      bloodGroup: "B+",
      aadhaarNo: "6521-8932-1104",
      house: "Ganga",
      campusId: azdCampus.id,
      classId: clsVI_AZD.id,
      sectionId: secA_VI_AZD.id,
      rollNo: 7,
      status: "ACTIVE",
      currentAddress: "14/82, Civil Lines, Kanpur",
      permanentAddress: "14/82, Civil Lines, Kanpur",
      emergencyContact: "+91 98390 12345",
      guardians: {
        create: [
          {
            relation: "FATHER",
            name: "Rajesh Sharma",
            phone: "9839012345",
            email: "rajesh.sharma@example.com",
            occupation: "Chartered Accountant",
            isPrimary: true,
          },
        ],
      },
      discounts: {
        create: [
          {
            discountType: "SIBLING",
            percentage: 20.0,
            reason: "Sibling Concession (Elder brother Aarav Sharma, Scholar No. DPS-AZD-2018-0245)",
            approvedBy: "Principal DPS Azad Nagar",
          },
        ],
      },
    },
  });

  // Student 3: Vihaan Patel (Overdue/Defaulter Student, Class VIII-B, Barra Campus)
  const clsVIII_BAR = campusClassesMap["BAR"]["Class VIII"];
  const secB_VIII_BAR = campusSectionsMap["BAR"]["Class VIII"][1];

  const student3 = await prisma.student.create({
    data: {
      scholarNo: "DPS-BAR-2021-0389",
      admissionNo: "BAR/2021/389",
      admissionDate: new Date("2021-04-12"),
      academicYearIn: "2021-2022",
      firstName: "Vihaan",
      lastName: "Patel",
      dob: new Date("2012-11-03"),
      gender: "MALE",
      bloodGroup: "O+",
      aadhaarNo: "4198-5520-9912",
      house: "Yamuna",
      campusId: barCampus.id,
      classId: clsVIII_BAR.id,
      sectionId: secB_VIII_BAR.id,
      rollNo: 23,
      status: "ACTIVE",
      currentAddress: "Sector 3, Avas Vikas Colony, Barra",
      emergencyContact: "+91 94150 56789",
      guardians: {
        create: [
          {
            relation: "FATHER",
            name: "Manoj Patel",
            phone: "9415056789",
            email: "manoj.patel@example.com",
            occupation: "Civil Contractor",
            isPrimary: true,
          },
        ],
      },
    },
  });

  // Student 4: Sanvi Gupta (TC Issued - Relocated to Bengaluru, Kidwai Nagar)
  const clsV_KID = campusClassesMap["KID"]["Class V"];
  const secA_V_KID = campusSectionsMap["KID"]["Class V"][0];

  const student4 = await prisma.student.create({
    data: {
      scholarNo: "DPS-KID-2020-0118",
      admissionNo: "KID/2020/118",
      admissionDate: new Date("2020-04-06"),
      academicYearIn: "2020-2021",
      firstName: "Sanvi",
      lastName: "Gupta",
      dob: new Date("2015-02-18"),
      gender: "FEMALE",
      bloodGroup: "A+",
      aadhaarNo: "3312-8874-5501",
      house: "Jhelum",
      campusId: kidCampus.id,
      classId: clsV_KID.id,
      sectionId: secA_V_KID.id,
      rollNo: 15,
      status: "TC_ISSUED",
      currentAddress: "K-Block, Kidwai Nagar, Kanpur",
      guardians: {
        create: [
          {
            relation: "FATHER",
            name: "Amit Gupta",
            phone: "9838045678",
            email: "amit.gupta@example.com",
            occupation: "Software Engineering Manager",
            isPrimary: true,
          },
          {
            relation: "MOTHER",
            name: "Pooja Gupta",
            phone: "9838045679",
            occupation: "Banking Professional",
          },
        ],
      },
    },
  });

  // Create CBSE Transfer Certificate for Sanvi Gupta
  await prisma.transferCertificate.create({
    data: {
      studentId: student4.id,
      tcNumber: "DPS/KID/TC/2026/0042",
      bookNumber: "Vol-08",
      serialNumber: "42",
      applicationDate: new Date("2026-03-10"),
      issueDate: new Date("2026-03-25"),
      dateOfLeaving: new Date("2026-03-31"),
      motherName: "Mrs. Pooja Gupta",
      fatherName: "Mr. Amit Gupta",
      nationality: "Indian",
      isBelongToSchedule: "No",
      dateOfFirstAdmission: new Date("2020-04-06"),
      classInWhichFirstAdmitted: "Class Prep",
      classLastStudied: "Class V (Fifth)",
      schoolBoardExamLastTaken: "Annual Examination, Passed Class V",
      isFailed: "No",
      subjectsStudied: "English, Hindi, Mathematics, Environmental Studies, Computer Science, General Knowledge",
      isQualifiedForPromotion: "Yes, Promoted to Class VI (Sixth)",
      monthUptoWhichFeesPaid: "March 2026 (No Dues)",
      feeConcessionDetails: "None",
      totalWorkingDays: 216,
      totalDaysPresent: 204,
      isNccCadetBoyScout: "N/A",
      gamesPlayedCoCurricular: "Inter-House Swimming Gold Medalist, Debate Club",
      generalConduct: "Exemplary",
      reasonForLeaving: "Parent Job Transfer to Bengaluru",
      anyOtherRemarks: "Hardworking, disciplined and enthusiastic student. Best wishes.",
      preparedBy: "Mrs. Ritu Rastogi (Senior Clerk)",
      checkedBy: "Mrs. Anupama Seth (Headmistress)",
      principalName: "Dr. Nidhi Singh (Principal)",
      verificationToken: "TC-KID-2026-V8-0042-VERIFIED",
      status: "ISSUED",
    },
  });

  // Student 5: Rohan Mehrotra (Alumni - Class XII Batch of 2024, Azad Nagar)
  const clsXII_AZD = campusClassesMap["AZD"]["Class XII (Science)"];
  const secA_XII_AZD = campusSectionsMap["AZD"]["Class XII (Science)"][0];

  const student5 = await prisma.student.create({
    data: {
      scholarNo: "DPS-AZD-2012-0092",
      admissionNo: "AZD/2012/92",
      admissionDate: new Date("2012-04-02"),
      academicYearIn: "2012-2013",
      firstName: "Rohan",
      lastName: "Mehrotra",
      dob: new Date("2006-08-11"),
      gender: "MALE",
      bloodGroup: "AB+",
      aadhaarNo: "9081-3342-7612",
      house: "Chenab",
      campusId: azdCampus.id,
      classId: clsXII_AZD.id,
      sectionId: secA_XII_AZD.id,
      rollNo: 1,
      status: "ALUMNI",
      currentAddress: "Swaroop Nagar, Kanpur",
      guardians: {
        create: [
          {
            relation: "FATHER",
            name: "Dr. Sanjay Mehrotra",
            phone: "9839188899",
            email: "sanjay.mehrotra@example.com",
            occupation: "Cardiologist",
            isPrimary: true,
          },
        ],
      },
    },
  });

  // Student 6: Myra Kapoor (Pre-Primary, Servodaya Nagar)
  const clsNUR_SRV = campusClassesMap["SRV"]["Nursery"];
  const secA_NUR_SRV = campusSectionsMap["SRV"]["Nursery"][0];

  const student6 = await prisma.student.create({
    data: {
      scholarNo: "DPS-SRV-2025-0081",
      admissionNo: "SRV/2025/81",
      admissionDate: new Date("2025-04-01"),
      academicYearIn: "2025-2026",
      firstName: "Myra",
      lastName: "Kapoor",
      dob: new Date("2021-12-05"),
      gender: "FEMALE",
      bloodGroup: "O+",
      aadhaarNo: "1198-4432-8899",
      house: "Ravi",
      campusId: srvCampus.id,
      classId: clsNUR_SRV.id,
      sectionId: secA_NUR_SRV.id,
      rollNo: 4,
      status: "ACTIVE",
      currentAddress: "11/304, Servodaya Nagar, Kanpur",
      emergencyContact: "+91 97922 44556",
      guardians: {
        create: [
          {
            relation: "FATHER",
            name: "Vikram Kapoor",
            phone: "9792244556",
            email: "vikram.kapoor@example.com",
            occupation: "Business Entrepreneur",
            isPrimary: true,
          },
        ],
      },
    },
  });

  console.log("👨‍🎓 Created sample Students with Guardians & Documents.");

  // 7. Create Fee Invoices & Payment Receipts
  // Invoice 1: Aarav Sharma - Paid Q1 Invoice with receipt
  const inv1 = await prisma.feeInvoice.create({
    data: {
      invoiceNo: "INV-AZD-2025-Q1-0012",
      studentId: student1.id,
      campusId: azdCampus.id,
      academicYearId: ay2025.id,
      periodName: "Quarter 1 (Apr 2025 - Jun 2025)",
      dueDate: new Date("2025-04-20"),
      grossAmount: 36500.0, // Tuition (24500) + Development (12000)
      discountAmount: 0.0,
      fineAmount: 0.0,
      netAmount: 36500.0,
      paidAmount: 36500.0,
      balanceAmount: 0.0,
      status: "PAID",
      items: {
        create: [
          { feeHeadId: campusFeeHeads["AZD"]["TUI"].id, amount: 24500.0 },
          { feeHeadId: campusFeeHeads["AZD"]["DEV"].id, amount: 12000.0 },
        ],
      },
    },
  });

  await prisma.feePayment.create({
    data: {
      receiptNo: "REC-AZD-2025-00184",
      invoiceId: inv1.id,
      studentId: student1.id,
      paymentDate: new Date("2025-04-15"),
      paymentMode: "ONLINE_UPI",
      amountPaid: 36500.0,
      transactionRef: "UPI/510492819033/ICICI",
      cashierName: "Online Parent Gateway",
      notes: "Paid via Quick Pay Portal",
      status: "SUCCESS",
    },
  });

  // Invoice 2: Aarav Sharma - Q2 Pending
  await prisma.feeInvoice.create({
    data: {
      invoiceNo: "INV-AZD-2025-Q2-0012",
      studentId: student1.id,
      campusId: azdCampus.id,
      academicYearId: ay2025.id,
      periodName: "Quarter 2 (Jul 2025 - Sep 2025)",
      dueDate: new Date("2025-07-20"),
      grossAmount: 24500.0,
      discountAmount: 0.0,
      fineAmount: 0.0,
      netAmount: 24500.0,
      paidAmount: 0.0,
      balanceAmount: 24500.0,
      status: "PENDING",
      items: {
        create: [{ feeHeadId: campusFeeHeads["AZD"]["TUI"].id, amount: 24500.0 }],
      },
    },
  });

  // Invoice 3: Ananya Sharma (with 20% Sibling Discount Applied)
  const inv3 = await prisma.feeInvoice.create({
    data: {
      invoiceNo: "INV-AZD-2025-Q1-0013",
      studentId: student2.id,
      campusId: azdCampus.id,
      academicYearId: ay2025.id,
      periodName: "Quarter 1 (Apr 2025 - Jun 2025)",
      dueDate: new Date("2025-04-20"),
      grossAmount: 30000.0, // Tuition (21000) + Development (9000)
      discountAmount: 4200.0, // 20% on Tuition (21000 * 0.2)
      fineAmount: 0.0,
      netAmount: 25800.0,
      paidAmount: 25800.0,
      balanceAmount: 0.0,
      status: "PAID",
      notes: "Sibling Discount applied (20% off tuition)",
      items: {
        create: [
          { feeHeadId: campusFeeHeads["AZD"]["TUI"].id, amount: 21000.0 },
          { feeHeadId: campusFeeHeads["AZD"]["DEV"].id, amount: 9000.0 },
        ],
      },
    },
  });

  await prisma.feePayment.create({
    data: {
      receiptNo: "REC-AZD-2025-00185",
      invoiceId: inv3.id,
      studentId: student2.id,
      paymentDate: new Date("2025-04-15"),
      paymentMode: "POS_CARD",
      amountPaid: 25800.0,
      transactionRef: "HDFC-POS-AUTH-992140",
      cashierName: "Rakesh Kumar (Fee Counter)",
      notes: "Paid at school accounts desk",
      status: "SUCCESS",
    },
  });

  // Invoice 4: Vihaan Patel (Overdue Defaulter with Late Fine)
  await prisma.feeInvoice.create({
    data: {
      invoiceNo: "INV-BAR-2025-Q1-0089",
      studentId: student3.id,
      campusId: barCampus.id,
      academicYearId: ay2025.id,
      periodName: "Quarter 1 (Apr 2025 - Jun 2025)",
      dueDate: new Date("2025-04-20"),
      grossAmount: 30000.0,
      discountAmount: 0.0,
      fineAmount: 750.0, // Late fee fine
      netAmount: 30750.0,
      paidAmount: 10000.0, // Partial payment
      balanceAmount: 20750.0,
      status: "OVERDUE",
      notes: "First installment ₹10,000 paid in Cash; balance ₹20,750 overdue",
      items: {
        create: [
          { feeHeadId: campusFeeHeads["BAR"]["TUI"].id, amount: 21000.0 },
          { feeHeadId: campusFeeHeads["BAR"]["DEV"].id, amount: 9000.0 },
        ],
      },
    },
  });

  // Invoice 5: Myra Kapoor (Nursery Servodaya Nagar - Paid in Cash at Counter)
  const inv5 = await prisma.feeInvoice.create({
    data: {
      invoiceNo: "INV-SRV-2025-Q1-0045",
      studentId: student6.id,
      campusId: srvCampus.id,
      academicYearId: ay2025.id,
      periodName: "Quarter 1 (Apr 2025 - Jun 2025)",
      dueDate: new Date("2025-04-20"),
      grossAmount: 27000.0, // Tuition (18000) + Development (9000)
      discountAmount: 0.0,
      fineAmount: 0.0,
      netAmount: 27000.0,
      paidAmount: 27000.0,
      balanceAmount: 0.0,
      status: "PAID",
      items: {
        create: [
          { feeHeadId: campusFeeHeads["SRV"]["TUI"].id, amount: 18000.0 },
          { feeHeadId: campusFeeHeads["SRV"]["DEV"].id, amount: 9000.0 },
        ],
      },
    },
  });

  await prisma.feePayment.create({
    data: {
      receiptNo: "REC-SRV-2025-00045",
      invoiceId: inv5.id,
      studentId: student6.id,
      paymentDate: new Date("2025-04-10"),
      paymentMode: "CASH",
      amountPaid: 27000.0,
      transactionRef: "CASH-COUNTER-01",
      cashierName: "Sunil Verma (Accounts Officer)",
      notes: "Received exact cash with receipt",
      status: "SUCCESS",
    },
  });

  console.log("🧾 Created Invoices and Receipts.");
  console.log("✅ Database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
