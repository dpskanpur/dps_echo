import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const kidwaiNagarStudents = [
  {
    firstName: "Anvi",
    lastName: "Tripathi",
    className: "Class III",
    sectionName: "A",
    gender: "FEMALE",
    dob: new Date("2017-02-19"),
    bloodGroup: "AB+",
    house: "Ravi",
    fatherName: "Praveen Tripathi",
    fatherPhone: "9839044556",
    fatherEmail: "praveen.tripathi@example.com",
    fatherOccupation: "Senior Accountant",
    motherName: "Kavita Tripathi",
    motherPhone: "9839044557",
    currentAddress: "Block K, Kidwai Nagar, Kanpur",
    currentPincode: "208011",
  },
  {
    firstName: "Aarav",
    lastName: "Kushwaha",
    className: "Class V",
    sectionName: "A",
    gender: "MALE",
    dob: new Date("2015-05-14"),
    bloodGroup: "O+",
    house: "Ganga",
    fatherName: "Ramesh Kushwaha",
    fatherPhone: "9839122334",
    fatherEmail: "ramesh.kushwaha@example.com",
    fatherOccupation: "Business Owner",
    motherName: "Sunita Kushwaha",
    motherPhone: "9839122335",
    currentAddress: "128/45, Kidwai Nagar Block M, Kanpur",
    currentPincode: "208011",
  },
  {
    firstName: "Shruti",
    lastName: "Pandey",
    className: "Class VIII",
    sectionName: "B",
    gender: "FEMALE",
    dob: new Date("2012-09-08"),
    bloodGroup: "B+",
    house: "Yamuna",
    fatherName: "Sanjay Pandey",
    fatherPhone: "9415033445",
    fatherEmail: "sanjay.pandey@example.com",
    fatherOccupation: "Advocate",
    motherName: "Mamta Pandey",
    motherPhone: "9415033446",
    currentAddress: "133/210, Transport Nagar, Kidwai Nagar, Kanpur",
    currentPincode: "208011",
  },
  {
    firstName: "Kushagra",
    lastName: "Srivastava",
    className: "Class X",
    sectionName: "A",
    gender: "MALE",
    dob: new Date("2010-12-01"),
    bloodGroup: "A+",
    house: "Jhelum",
    fatherName: "Vivek Srivastava",
    fatherPhone: "9838044556",
    fatherEmail: "vivek.sri@example.com",
    fatherOccupation: "Bank Manager",
    motherName: "Ritu Srivastava",
    motherPhone: "9838044557",
    currentAddress: "127/90, Kidwai Nagar Block W, Kanpur",
    currentPincode: "208011",
  },
  {
    firstName: "Prisha",
    lastName: "Agrahari",
    className: "Class I",
    sectionName: "A",
    gender: "FEMALE",
    dob: new Date("2019-03-22"),
    bloodGroup: "O-",
    house: "Chenab",
    fatherName: "Deepak Agrahari",
    fatherPhone: "9793055667",
    fatherEmail: "deepak.agrahari@example.com",
    fatherOccupation: "Jeweller",
    motherName: "Archana Agrahari",
    motherPhone: "9793055668",
    currentAddress: "K-15, Main Market, Kidwai Nagar, Kanpur",
    currentPincode: "208011",
  },
  {
    firstName: "Yash",
    lastName: "Gupta",
    className: "Class VII",
    sectionName: "A",
    gender: "MALE",
    dob: new Date("2013-07-11"),
    fatherName: "Gaurav Gupta",
    fatherPhone: "9839166778",
    fatherEmail: "gaurav.gupta@example.com",
    fatherOccupation: "Merchant",
    motherName: "Nisha Gupta",
    motherPhone: "9839166779",
    currentAddress: "130/14, Y-Block, Kidwai Nagar, Kanpur",
    currentPincode: "208011",
  },
  {
    firstName: "Aditi",
    lastName: "Dixit",
    className: "Class IX",
    sectionName: "B",
    gender: "FEMALE",
    dob: new Date("2011-01-29"),
    bloodGroup: "B+",
    house: "Ravi",
    fatherName: "Alok Dixit",
    fatherPhone: "9450077889",
    fatherEmail: "alok.dixit@example.com",
    fatherOccupation: "Professor",
    motherName: "Dr. Sudha Dixit",
    motherPhone: "9450077890",
    currentAddress: "128/300, Kidwai Nagar, Kanpur",
    currentPincode: "208011",
  },
  {
    firstName: "Madhav",
    lastName: "Joshi",
    className: "Class VI",
    sectionName: "A",
    gender: "MALE",
    dob: new Date("2014-10-17"),
    bloodGroup: "A+",
    house: "Sutlej",
    fatherName: "Kamlesh Joshi",
    fatherPhone: "9838188990",
    fatherEmail: "kamlesh.joshi@example.com",
    fatherOccupation: "Software Engineer",
    motherName: "Preeti Joshi",
    motherPhone: "9838188991",
    currentAddress: "132/88, Kidwai Nagar Block N, Kanpur",
    currentPincode: "208011",
  },
  {
    firstName: "Navya",
    lastName: "Shukla",
    className: "Class IV",
    sectionName: "B",
    gender: "FEMALE",
    dob: new Date("2016-06-25"),
    bloodGroup: "AB+",
    house: "Ganga",
    fatherName: "Anand Shukla",
    fatherPhone: "9794299001",
    fatherEmail: "anand.shukla@example.com",
    fatherOccupation: "Civil Contractor",
    motherName: "Richa Shukla",
    motherPhone: "9794299002",
    currentAddress: "127/14, Kidwai Nagar, Kanpur",
    currentPincode: "208011",
  },
  {
    firstName: "Tejas",
    lastName: "Singh",
    className: "Class II",
    sectionName: "A",
    gender: "MALE",
    dob: new Date("2018-04-09"),
    bloodGroup: "O+",
    house: "Yamuna",
    fatherName: "Bhavnesh Singh",
    fatherPhone: "9839300112",
    fatherEmail: "bhavnesh.singh@example.com",
    fatherOccupation: "Police Inspector",
    motherName: "Sarita Singh",
    motherPhone: "9839300113",
    currentAddress: "Police Colony, Kidwai Nagar, Kanpur",
    currentPincode: "208011",
  },
  {
    firstName: "Vanya",
    lastName: "Chaudhary",
    className: "Nursery",
    sectionName: "A",
    gender: "FEMALE",
    dob: new Date("2021-08-14"),
    bloodGroup: "A+",
    house: "Jhelum",
    fatherName: "Kapil Chaudhary",
    fatherPhone: "9415411223",
    fatherEmail: "kapil.c@example.com",
    fatherOccupation: "Architect",
    motherName: "Shweta Chaudhary",
    motherPhone: "9415411224",
    currentAddress: "128/90-B, Kidwai Nagar, Kanpur",
    currentPincode: "208011",
  },
  {
    firstName: "Atharva",
    lastName: "Mishra",
    className: "Prep",
    sectionName: "A",
    gender: "MALE",
    dob: new Date("2020-02-03"),
    bloodGroup: "B+",
    house: "Chenab",
    fatherName: "Dharmendra Mishra",
    fatherPhone: "9838522334",
    fatherEmail: "dharmendra.m@example.com",
    fatherOccupation: "Govt Employee",
    motherName: "Suman Mishra",
    motherPhone: "9838522335",
    currentAddress: "133/45, Kidwai Nagar, Kanpur",
    currentPincode: "208011",
  },
];

async function main() {
  console.log("Wiping all existing student directory data across all tables...");

  // Safely delete in dependency order
  await prisma.paymentOrder.deleteMany();
  await prisma.feePayment.deleteMany();
  await prisma.feeInvoiceItem.deleteMany();
  await prisma.feeInvoice.deleteMany();
  await prisma.studentDiscount.deleteMany();
  await prisma.transferCertificate.deleteMany();
  await prisma.studentDocument.deleteMany();
  await prisma.guardian.deleteMany();
  await prisma.student.deleteMany();

  console.log("All student records successfully deleted!");

  // Get DPS Kidwai Nagar campus
  const kidwaiCampus = await prisma.campus.findUnique({
    where: { code: "KID" },
    include: { classes: { include: { sections: true } } },
  });

  if (!kidwaiCampus) {
    throw new Error("DPS Kidwai Nagar (KID) campus not found in database.");
  }

  // Get active session
  let session = await prisma.academicYear.findFirst({ where: { isCurrent: true } });
  if (!session) {
    session = await prisma.academicYear.findFirst({ orderBy: { name: "desc" } });
  }
  const activeSession = session?.name || "2026-2027";
  const year = 2026;

  console.log(`Loading official student directory records for ${kidwaiCampus.name} (${activeSession})...`);

  for (let i = 0; i < kidwaiNagarStudents.length; i++) {
    const s = kidwaiNagarStudents[i];
    const seq = i + 1;

    // Find or create class
    let cls = kidwaiCampus.classes.find((c) => c.name.toLowerCase() === s.className.toLowerCase());
    if (!cls) {
      cls = await prisma.class.create({
        data: {
          campusId: kidwaiCampus.id,
          name: s.className,
          numericGrade: parseInt(s.className.replace(/[^0-9]/g, "") || "3", 10),
          sequence: seq,
        },
        include: { sections: true },
      });
    }

    // Find or create section
    let sec = cls.sections.find((secItem) => secItem.name.toUpperCase() === s.sectionName.toUpperCase());
    if (!sec) {
      sec = await prisma.section.create({
        data: {
          classId: cls.id,
          name: s.sectionName,
          maxCapacity: 40,
        },
      });
    }

    const scholarNo = `DPS-KID-${year}-${String(1000 + seq).padStart(4, "0")}`;
    const registrationNo = `REG-KID-${year}-${String(1000 + seq).padStart(4, "0")}`;
    const admissionNo = `KID/${year}/${1000 + seq}`;

    const student = await prisma.student.create({
      data: {
        registrationNo,
        registrationDate: new Date(),
        scholarNo,
        admissionNo,
        admissionDate: new Date("2026-04-01"),
        academicYearIn: activeSession,
        firstName: s.firstName,
        lastName: s.lastName,
        dob: s.dob,
        dobInWords: `${s.dob.getDate()} ${s.dob.toLocaleString("default", { month: "long" })} ${s.dob.getFullYear()}`,
        gender: s.gender,
        bloodGroup: s.bloodGroup,
        nationality: "Indian",
        religion: "Hinduism",
        category: "General",
        motherTongue: "Hindi",
        studentMobile: s.fatherPhone,
        studentEmail: s.fatherEmail,
        campusId: kidwaiCampus.id,
        classId: cls.id,
        sectionId: sec.id,
        rollNo: seq,
        house: s.house,
        status: "ACTIVE",
        currentAddress: s.currentAddress,
        currentPincode: s.currentPincode,
        permanentAddress: s.currentAddress,
        permanentPincode: s.currentPincode,
        city: "Kanpur",
        emergencyContact: s.fatherPhone,
        howHeardAboutUs: "Official School Admission",
        registrationSource: "STAFF_PORTAL",
        registrationPaymentMode: "CASH",
        registrationFeePaid: 1000,
        registrationPaymentStatus: "PAID",
        guardians: {
          create: [
            {
              relation: "FATHER",
              name: s.fatherName,
              phone: s.fatherPhone,
              email: s.fatherEmail,
              occupation: s.fatherOccupation,
              isPrimary: true,
              address: s.currentAddress,
              pincode: s.currentPincode,
            },
            {
              relation: "MOTHER",
              name: s.motherName,
              phone: s.motherPhone || s.fatherPhone,
              isPrimary: false,
              address: s.currentAddress,
              pincode: s.currentPincode,
            },
          ],
        },
      },
    });

    console.log(`[${seq}/${kidwaiNagarStudents.length}] Loaded DPS Kidwai Nagar Student: ${student.firstName} ${student.lastName} (${student.scholarNo}) - ${cls.name}`);
  }

  console.log("\nDPS Kidwai Nagar Student Directory initialization complete!");
}

main()
  .catch((e) => {
    console.error("Error during wipe and load:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
