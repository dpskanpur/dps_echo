"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { generateTCNumber, generateReceiptNumber } from "@/lib/utils";

// -------------------------------------------------------------
// Student Management Actions
// -------------------------------------------------------------

// -------------------------------------------------------------
// Stage 1: Register New Applicant (Registration Form)
// -------------------------------------------------------------

export async function registerStudent(formData: FormData): Promise<void> {
  const campusId = formData.get("campusId") as string;
  const classId = formData.get("classId") as string;
  const firstName = formData.get("firstName") as string;
  const middleName = (formData.get("middleName") as string) || null;
  const lastName = formData.get("lastName") as string;
  const dob = new Date(formData.get("dob") as string);
  const dobInWords = (formData.get("dobInWords") as string) || null;
  const gender = (formData.get("gender") as string) || "MALE";
  const nationality = (formData.get("nationality") as string) || "Indian";
  const motherTongue = (formData.get("motherTongue") as string) || "Hindi";
  const religion = (formData.get("religion") as string) || "Hinduism";
  const category = (formData.get("category") as string) || "General";
  const aadhaarNo = (formData.get("aadhaarNo") as string) || null;
  const studentMobile = (formData.get("studentMobile") as string) || null;
  const studentEmail = (formData.get("studentEmail") as string) || null;
  const currentAddress = (formData.get("currentAddress") as string) || "";
  const currentPincode = (formData.get("currentPincode") as string) || "";
  const permanentAddress = (formData.get("permanentAddress") as string) || "";
  const permanentPincode = (formData.get("permanentPincode") as string) || "";
  const emergencyContact = (formData.get("emergencyContact") as string) || studentMobile || "";

  // Additional Form Questions & Prior Schooling
  const howHeardAboutUs = (formData.get("howHeardAboutUs") as string) || null;
  const reasonJoining = (formData.get("reasonJoining") as string) || null;
  const previousSchool = (formData.get("previousSchool") as string) || null;
  const penNo = (formData.get("penNo") as string) || null;
  const previousBoard = (formData.get("previousBoard") as string) || null;
  const previousClass = (formData.get("previousClass") as string) || null;
  const mediumInstruction = (formData.get("mediumInstruction") as string) || null;
  const reasonLeavingPrevious = (formData.get("reasonLeavingPrevious") as string) || null;
  const previousMarksJson = (formData.get("previousMarksJson") as string) || null;
  const siblingsJson = (formData.get("siblingsJson") as string) || null;

  // Father's Details
  const fatherName = (formData.get("fatherName") as string) || "";
  const fatherEmail = (formData.get("fatherEmail") as string) || "";
  const fatherOccupation = (formData.get("fatherOccupation") as string) || "";
  const fatherOrganization = (formData.get("fatherOrganization") as string) || "";
  const fatherDesignation = (formData.get("fatherDesignation") as string) || "";
  const fatherQualification = (formData.get("fatherQualification") as string) || "";
  const fatherAadhaar = (formData.get("fatherAadhaar") as string) || "";
  const fatherAddress = (formData.get("fatherAddress") as string) || "";
  const fatherPincode = (formData.get("fatherPincode") as string) || "";
  const fatherPhone = (formData.get("fatherPhone") as string) || "";
  const fatherOfficeAddress = (formData.get("fatherOfficeAddress") as string) || "";
  const fatherOfficePincode = (formData.get("fatherOfficePincode") as string) || "";
  const fatherOfficeContact = (formData.get("fatherOfficeContact") as string) || "";
  const fatherMonthlyIncome = (formData.get("fatherMonthlyIncome") as string) || "";

  // Mother's Details
  const motherName = (formData.get("motherName") as string) || "";
  const motherEmail = (formData.get("motherEmail") as string) || "";
  const motherOccupation = (formData.get("motherOccupation") as string) || "";
  const motherOrganization = (formData.get("motherOrganization") as string) || "";
  const motherDesignation = (formData.get("motherDesignation") as string) || "";
  const motherQualification = (formData.get("motherQualification") as string) || "";
  const motherAadhaar = (formData.get("motherAadhaar") as string) || "";
  const motherAddress = (formData.get("motherAddress") as string) || "";
  const motherPincode = (formData.get("motherPincode") as string) || "";
  const motherPhone = (formData.get("motherPhone") as string) || "";
  const motherOfficeAddress = (formData.get("motherOfficeAddress") as string) || "";
  const motherOfficePincode = (formData.get("motherOfficePincode") as string) || "";
  const motherOfficeContact = (formData.get("motherOfficeContact") as string) || "";
  const motherMonthlyIncome = (formData.get("motherMonthlyIncome") as string) || "";

  // Local Guardian's Details (if applicable)
  const guardianName = (formData.get("guardianName") as string) || "";
  const guardianEmail = (formData.get("guardianEmail") as string) || "";
  const guardianOccupation = (formData.get("guardianOccupation") as string) || "";
  const guardianOrganization = (formData.get("guardianOrganization") as string) || "";
  const guardianDesignation = (formData.get("guardianDesignation") as string) || "";
  const guardianQualification = (formData.get("guardianQualification") as string) || "";
  const guardianAadhaar = (formData.get("guardianAadhaar") as string) || "";
  const guardianAddress = (formData.get("guardianAddress") as string) || "";
  const guardianPincode = (formData.get("guardianPincode") as string) || "";
  const guardianPhone = (formData.get("guardianPhone") as string) || "";
  const guardianRelation = (formData.get("guardianRelation") as string) || "";
  const guardianOfficeAddress = (formData.get("guardianOfficeAddress") as string) || "";
  const guardianOfficePincode = (formData.get("guardianOfficePincode") as string) || "";
  const guardianOfficeContact = (formData.get("guardianOfficeContact") as string) || "";

  const campus = await prisma.campus.findUnique({ where: { id: campusId } });
  const year = new Date().getFullYear();

  // Count total registrations for generating unique REG ID
  const regCount = await prisma.student.count({
    where: { campusId, registrationNo: { not: null } },
  });
  const regSeq = regCount + 1;

  const registrationNo = `REG-${campus?.code || "KNP"}-${year}-${String(regSeq).padStart(4, "0")}`;
  // Temporary scholarNo for registration record until full admission promotion
  const scholarNo = `REG-TEMP-${campus?.code || "KNP"}-${year}-${String(regSeq).padStart(4, "0")}`;
  const admissionNo = "REGISTRATION_PENDING";

  const student = await prisma.student.create({
    data: {
      registrationNo,
      registrationDate: new Date(),
      scholarNo,
      admissionNo,
      admissionDate: new Date(),
      academicYearIn: `${year}-${year + 1}`,
      firstName,
      middleName,
      lastName,
      dob,
      dobInWords,
      gender,
      nationality,
      motherTongue,
      religion,
      category,
      aadhaarNo,
      studentMobile,
      studentEmail,
      currentAddress,
      currentPincode,
      permanentAddress,
      permanentPincode,
      emergencyContact: emergencyContact || fatherPhone || motherPhone,
      howHeardAboutUs,
      reasonJoining,
      previousSchool,
      penNo,
      previousBoard,
      previousClass,
      mediumInstruction,
      reasonLeavingPrevious,
      previousMarksJson,
      siblingsJson,
      campusId,
      classId,
      status: "REGISTERED",
      registrationSource: "STAFF_PORTAL",
      registrationPaymentMode: "CASH",
      registrationFeePaid: campus?.registrationFee || 1000,
      registrationPaymentStatus: "PAID",
      registrationPaymentTxnId: `CASH-${registrationNo}`,
      guardians: {
        create: [
          ...(fatherName
            ? [
                {
                  relation: "FATHER",
                  name: fatherName,
                  phone: fatherPhone || emergencyContact,
                  email: fatherEmail,
                  occupation: fatherOccupation,
                  organization: fatherOrganization,
                  designation: fatherDesignation,
                  qualification: fatherQualification,
                  aadhaarNo: fatherAadhaar,
                  address: fatherAddress,
                  pincode: fatherPincode,
                  officeAddress: fatherOfficeAddress,
                  officePincode: fatherOfficePincode,
                  officeContact: fatherOfficeContact,
                  monthlyIncome: fatherMonthlyIncome,
                  isPrimary: true,
                },
              ]
            : []),
          ...(motherName
            ? [
                {
                  relation: "MOTHER",
                  name: motherName,
                  phone: motherPhone,
                  email: motherEmail,
                  occupation: motherOccupation,
                  organization: motherOrganization,
                  designation: motherDesignation,
                  qualification: motherQualification,
                  aadhaarNo: motherAadhaar,
                  address: motherAddress,
                  pincode: motherPincode,
                  officeAddress: motherOfficeAddress,
                  officePincode: motherOfficePincode,
                  officeContact: motherOfficeContact,
                  monthlyIncome: motherMonthlyIncome,
                  isPrimary: !fatherName,
                },
              ]
            : []),
          ...(guardianName
            ? [
                {
                  relation: guardianRelation || "LOCAL_GUARDIAN",
                  name: guardianName,
                  phone: guardianPhone,
                  email: guardianEmail,
                  occupation: guardianOccupation,
                  organization: guardianOrganization,
                  designation: guardianDesignation,
                  qualification: guardianQualification,
                  aadhaarNo: guardianAadhaar,
                  address: guardianAddress,
                  pincode: guardianPincode,
                  officeAddress: guardianOfficeAddress,
                  officePincode: guardianOfficePincode,
                  officeContact: guardianOfficeContact,
                  isPrimary: !fatherName && !motherName,
                },
              ]
            : []),
        ],
      },
    },
  });

  revalidatePath("/students");
  revalidatePath("/");
  redirect(`/students/${student.id}?notice=registered`);
}

// Public Portal Online Registration Action (Payment Mode: ONLINE ONLY)
export async function registerStudentPublic(formData: FormData): Promise<void> {
  const campusId = formData.get("campusId") as string;
  const classId = formData.get("classId") as string;
  const firstName = (formData.get("firstName") as string).trim();
  const middleName = (formData.get("middleName") as string)?.trim() || "";
  const lastName = (formData.get("lastName") as string).trim();
  const dobStr = formData.get("dob") as string;
  const dob = new Date(dobStr);
  const dobInWords = (formData.get("dobInWords") as string) || "";
  const gender = formData.get("gender") as string;
  const nationality = (formData.get("nationality") as string) || "Indian";
  const motherTongue = (formData.get("motherTongue") as string) || "Hindi";
  const religion = (formData.get("religion") as string) || "Hinduism";
  const category = (formData.get("category") as string) || "General";
  const aadhaarNo = (formData.get("aadhaarNo") as string) || "";
  const studentMobile = (formData.get("studentMobile") as string) || "";
  const studentEmail = (formData.get("studentEmail") as string) || "";

  const currentAddress = (formData.get("currentAddress") as string) || "";
  const currentPincode = (formData.get("currentPincode") as string) || "";
  const permanentAddress = (formData.get("permanentAddress") as string) || "";
  const permanentPincode = (formData.get("permanentPincode") as string) || "";
  const emergencyContact = (formData.get("emergencyContact") as string) || "";

  const howHeardAboutUs = (formData.get("howHeardAboutUs") as string) || "";
  const reasonJoining = (formData.get("reasonJoining") as string) || "";

  const previousSchool = (formData.get("previousSchool") as string) || "";
  const penNo = (formData.get("penNo") as string) || "";
  const previousBoard = (formData.get("previousBoard") as string) || "";
  const previousClass = (formData.get("previousClass") as string) || "";
  const mediumInstruction = (formData.get("mediumInstruction") as string) || "";
  const reasonLeavingPrevious = (formData.get("reasonLeavingPrevious") as string) || "";
  const previousMarksJson = (formData.get("previousMarksJson") as string) || "";
  const siblingsJson = (formData.get("siblingsJson") as string) || "";

  // Guardian details
  const fatherName = (formData.get("fatherName") as string) || "";
  const fatherPhone = (formData.get("fatherPhone") as string) || "";
  const fatherEmail = (formData.get("fatherEmail") as string) || "";
  const fatherOccupation = (formData.get("fatherOccupation") as string) || "";
  const fatherOrganization = (formData.get("fatherOrganization") as string) || "";

  const motherName = (formData.get("motherName") as string) || "";
  const motherPhone = (formData.get("motherPhone") as string) || "";
  const motherEmail = (formData.get("motherEmail") as string) || "";

  const onlinePaymentGateway = (formData.get("paymentGateway") as string) || "RAZORPAY";

  const campus = await prisma.campus.findUnique({ where: { id: campusId } });
  const year = new Date().getFullYear();

  const regCount = await prisma.student.count({
    where: { campusId, registrationNo: { not: null } },
  });
  const regSeq = regCount + 1;

  const registrationNo = `REG-${campus?.code || "KNP"}-${year}-${String(regSeq).padStart(4, "0")}`;
  const scholarNo = `REG-TEMP-${campus?.code || "KNP"}-${year}-${String(regSeq).padStart(4, "0")}`;
  const txnId = `TXN-${onlinePaymentGateway}-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const student = await prisma.student.create({
    data: {
      registrationNo,
      registrationDate: new Date(),
      scholarNo,
      admissionNo: "REGISTRATION_PENDING",
      admissionDate: new Date(),
      academicYearIn: `${year}-${year + 1}`,
      firstName,
      middleName,
      lastName,
      dob,
      dobInWords,
      gender,
      nationality,
      motherTongue,
      religion,
      category,
      aadhaarNo,
      studentMobile,
      studentEmail,
      currentAddress,
      currentPincode,
      permanentAddress,
      permanentPincode,
      emergencyContact: emergencyContact || fatherPhone || motherPhone,
      howHeardAboutUs,
      reasonJoining,
      previousSchool,
      penNo,
      previousBoard,
      previousClass,
      mediumInstruction,
      reasonLeavingPrevious,
      previousMarksJson,
      siblingsJson,
      campusId,
      classId,
      status: "REGISTERED",
      registrationSource: "PUBLIC_ONLINE",
      registrationPaymentMode: "ONLINE",
      registrationFeePaid: campus?.registrationFee || 1000,
      registrationPaymentStatus: "PAID",
      registrationPaymentTxnId: txnId,
      guardians: {
        create: [
          ...(fatherName
            ? [
                {
                  relation: "FATHER",
                  name: fatherName,
                  phone: fatherPhone || emergencyContact,
                  email: fatherEmail,
                  occupation: fatherOccupation,
                  organization: fatherOrganization,
                  isPrimary: true,
                },
              ]
            : []),
          ...(motherName
            ? [
                {
                  relation: "MOTHER",
                  name: motherName,
                  phone: motherPhone,
                  email: motherEmail,
                  isPrimary: !fatherName,
                },
              ]
            : []),
        ],
      },
    },
  });

  revalidatePath("/students");
  revalidatePath("/");
  redirect(`/public-registration/success?registrationNo=${student.registrationNo}&id=${student.id}`);
}

// Update Fixed Campus Registration Fee Action for Admin Portal
export async function updateCampusRegistrationFee(formData: FormData): Promise<void> {
  const campusId = formData.get("campusId") as string;
  const registrationFee = parseFloat(formData.get("registrationFee") as string) || 1000;

  await prisma.campus.update({
    where: { id: campusId },
    data: { registrationFee },
  });

  revalidatePath("/campuses");
  revalidatePath("/students/new");
  revalidatePath("/public-registration");
  redirect("/campuses?notice=fee_updated");
}

// -------------------------------------------------------------
// Stage 2: Promote Registration to Full Admission
// -------------------------------------------------------------

export async function promoteStudentToAdmission(formData: FormData): Promise<void> {
  const studentId = formData.get("studentId") as string;
  const sectionId = (formData.get("sectionId") as string) || null;
  const rollNo = formData.get("rollNo") ? parseInt(formData.get("rollNo") as string, 10) : null;
  const bloodGroup = (formData.get("bloodGroup") as string) || "B+";
  const category = (formData.get("category") as string) || "General";
  const house = (formData.get("house") as string) || "Ganga";
  const aadhaarNo = (formData.get("aadhaarNo") as string) || null;
  const currentAddress = (formData.get("currentAddress") as string) || "";
  const permanentAddress = (formData.get("permanentAddress") as string) || "";
  const city = (formData.get("city") as string) || "Kanpur";
  const emergencyContact = (formData.get("emergencyContact") as string) || "";
  const previousSchool = (formData.get("previousSchool") as string) || null;
  const previousClass = (formData.get("previousClass") as string) || null;
  const previousTcNo = (formData.get("previousTcNo") as string) || null;

  const existingStudent = await prisma.student.findUnique({
    where: { id: studentId },
    include: { campus: true },
  });

  if (!existingStudent) {
    throw new Error("Student registration record not found.");
  }

  const campus = existingStudent.campus;
  const year = new Date().getFullYear();

  // Count active admissions to generate unique Scholar / Admission ID
  const admCount = await prisma.student.count({
    where: { campusId: existingStudent.campusId, status: "ACTIVE" },
  });
  const admSeq = admCount + 1;

  const scholarNo = `DPS-${campus?.code || "KNP"}-${year}-${String(admSeq).padStart(4, "0")}`;
  const admissionNo = `${campus?.code || "KNP"}/${year}/${admSeq}`;

  await prisma.student.update({
    where: { id: studentId },
    data: {
      scholarNo,
      admissionNo,
      admissionDate: new Date(),
      sectionId,
      rollNo,
      bloodGroup,
      category,
      house,
      aadhaarNo,
      currentAddress,
      permanentAddress,
      city,
      emergencyContact,
      previousSchool,
      previousClass,
      previousTcNo,
      status: "ACTIVE",
    },
  });

  revalidatePath(`/students/${studentId}`);
  revalidatePath("/students");
  revalidatePath("/");
  redirect(`/students/${studentId}?notice=promoted`);
}

// -------------------------------------------------------------
// Direct 1-Step Admission (Creates both Reg & Admission ID)
// -------------------------------------------------------------

export async function createStudent(formData: FormData): Promise<void> {
  const campusId = formData.get("campusId") as string;
  const classId = formData.get("classId") as string;
  const sectionId = (formData.get("sectionId") as string) || null;
  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const dob = new Date(formData.get("dob") as string);
  const gender = (formData.get("gender") as string) || "MALE";
  const bloodGroup = (formData.get("bloodGroup") as string) || "B+";
  const house = (formData.get("house") as string) || "Ganga";
  const aadhaarNo = (formData.get("aadhaarNo") as string) || null;
  const currentAddress = (formData.get("currentAddress") as string) || "";
  const emergencyContact = (formData.get("emergencyContact") as string) || "";

  // Guardian details
  const fatherName = formData.get("fatherName") as string;
  const fatherPhone = formData.get("fatherPhone") as string;
  const fatherEmail = (formData.get("fatherEmail") as string) || "";
  const fatherOccupation = (formData.get("fatherOccupation") as string) || "";

  const motherName = (formData.get("motherName") as string) || "";
  const motherPhone = (formData.get("motherPhone") as string) || "";

  const campus = await prisma.campus.findUnique({ where: { id: campusId } });
  const year = new Date().getFullYear();

  // Generate Unique Registration ID & Unique Admission ID
  const regCount = await prisma.student.count({ where: { campusId } });
  const regSeq = regCount + 1;
  const registrationNo = `REG-${campus?.code || "KNP"}-${year}-${String(regSeq).padStart(4, "0")}`;

  const admCount = await prisma.student.count({
    where: { campusId, status: "ACTIVE" },
  });
  const admSeq = admCount + 1;
  const scholarNo = `DPS-${campus?.code || "KNP"}-${year}-${String(admSeq).padStart(4, "0")}`;
  const admissionNo = `${campus?.code || "KNP"}/${year}/${admSeq}`;

  const student = await prisma.student.create({
    data: {
      registrationNo,
      registrationDate: new Date(),
      scholarNo,
      admissionNo,
      admissionDate: new Date(),
      academicYearIn: `${year}-${year + 1}`,
      firstName,
      lastName,
      dob,
      gender,
      bloodGroup,
      house,
      aadhaarNo,
      currentAddress,
      emergencyContact,
      campusId,
      classId,
      sectionId,
      status: "ACTIVE",
      guardians: {
        create: [
          ...(fatherName
            ? [
                {
                  relation: "FATHER",
                  name: fatherName,
                  phone: fatherPhone || emergencyContact,
                  email: fatherEmail,
                  occupation: fatherOccupation,
                  isPrimary: true,
                },
              ]
            : []),
          ...(motherName
            ? [
                {
                  relation: "MOTHER",
                  name: motherName,
                  phone: motherPhone,
                  isPrimary: !fatherName,
                },
              ]
            : []),
        ],
      },
    },
  });

  revalidatePath("/students");
  revalidatePath("/");
  redirect(`/students/${student.id}?notice=created`);
}

// -------------------------------------------------------------
// Transfer Certificate (TC) Actions
// -------------------------------------------------------------

export async function issueTransferCertificate(formData: FormData): Promise<void> {
  const studentId = formData.get("studentId") as string;
  const reasonForLeaving = (formData.get("reasonForLeaving") as string) || "Parent Relocation";
  const generalConduct = (formData.get("generalConduct") as string) || "Good";
  const subjectsStudied =
    (formData.get("subjectsStudied") as string) ||
    "English, Hindi, Mathematics, Science, Social Science";
  const isQualifiedForPromotion =
    (formData.get("isQualifiedForPromotion") as string) || "Yes, Promoted";
  const monthUptoWhichFeesPaid =
    (formData.get("monthUptoWhichFeesPaid") as string) || "March 2026";
  const totalWorkingDays = parseInt((formData.get("totalWorkingDays") as string) || "210", 10);
  const totalDaysPresent = parseInt((formData.get("totalDaysPresent") as string) || "195", 10);
  const coCurricular = (formData.get("gamesPlayedCoCurricular") as string) || "Active participant";

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      campus: true,
      class: true,
      guardians: true,
    },
  });

  if (!student) {
    throw new Error("Student not found");
  }

  const father = student.guardians.find((g) => g.relation === "FATHER")?.name || "Mr. Guardian";
  const mother = student.guardians.find((g) => g.relation === "MOTHER")?.name || "Mrs. Guardian";

  const year = new Date().getFullYear();
  const count = await prisma.transferCertificate.count();
  const tcNumber = generateTCNumber(student.campus.code, year, count + 1);
  const verificationToken = `TC-${student.campus.code}-${year}-${Date.now().toString(36).toUpperCase()}`;

  const tc = await prisma.transferCertificate.create({
    data: {
      studentId: student.id,
      tcNumber,
      applicationDate: new Date(),
      issueDate: new Date(),
      dateOfLeaving: new Date(),
      motherName: mother,
      fatherName: father,
      nationality: student.nationality || "Indian",
      dateOfFirstAdmission: student.admissionDate,
      classInWhichFirstAdmitted: student.class.name,
      classLastStudied: student.class.name,
      schoolBoardExamLastTaken: `Annual Examination, ${student.class.name}`,
      subjectsStudied,
      isQualifiedForPromotion,
      monthUptoWhichFeesPaid,
      totalWorkingDays,
      totalDaysPresent,
      gamesPlayedCoCurricular: coCurricular,
      generalConduct,
      reasonForLeaving,
      preparedBy: "Accounts & Records Officer",
      checkedBy: "Headmistress",
      principalName: `Principal, ${student.campus.name}`,
      verificationToken,
      status: "ISSUED",
    },
  });

  // Mark student status as TC_ISSUED
  await prisma.student.update({
    where: { id: studentId },
    data: { status: "TC_ISSUED" },
  });

  revalidatePath("/students");
  revalidatePath("/tc");
  revalidatePath(`/students/${studentId}`);
  redirect(`/tc?tcId=${tc.id}`);
}

// -------------------------------------------------------------
// Fee Collection & Payment Actions
// -------------------------------------------------------------

export async function collectFeePayment(formData: FormData): Promise<void> {
  const invoiceId = formData.get("invoiceId") as string;
  const paymentMode = (formData.get("paymentMode") as string) || "CASH";
  const amountPaid = parseFloat((formData.get("amountPaid") as string) || "0");
  const transactionRef = (formData.get("transactionRef") as string) || "CASH-COUNTER";
  const notes = (formData.get("notes") as string) || "";
  const cashierName = (formData.get("cashierName") as string) || "Accounts Desk";
  const returnUrl = formData.get("returnUrl") as string;

  if (amountPaid <= 0) {
    throw new Error("Payment amount must be greater than zero.");
  }

  const invoice = await prisma.feeInvoice.findUnique({
    where: { id: invoiceId },
    include: { campus: true, student: true },
  });

  if (!invoice) {
    throw new Error("Invoice not found.");
  }

  const year = new Date().getFullYear();
  const count = await prisma.feePayment.count();
  const receiptNo = generateReceiptNumber(invoice.campus.code, year, count + 1);

  await prisma.feePayment.create({
    data: {
      receiptNo,
      invoiceId: invoice.id,
      studentId: invoice.studentId,
      paymentDate: new Date(),
      paymentMode,
      amountPaid,
      transactionRef,
      cashierName,
      notes,
      status: "SUCCESS",
    },
  });

  // Update invoice paid & balance amount
  const newPaidAmount = invoice.paidAmount + amountPaid;
  const newBalance = Math.max(0, invoice.netAmount - newPaidAmount);
  const newStatus = newBalance === 0 ? "PAID" : newPaidAmount > 0 ? "PARTIALLY_PAID" : "PENDING";

  await prisma.feeInvoice.update({
    where: { id: invoice.id },
    data: {
      paidAmount: newPaidAmount,
      balanceAmount: newBalance,
      status: newStatus,
    },
  });

  revalidatePath("/fees/collect");
  revalidatePath("/fees/invoices");
  revalidatePath("/fees/defaulters");
  revalidatePath("/fees/cashier");
  revalidatePath(`/students/${invoice.studentId}`);

  if (returnUrl) {
    redirect(returnUrl);
  } else {
    redirect(`/fees/cashier`);
  }
}

// Delete Student Record
export async function deleteStudent(formData: FormData): Promise<void> {
  const studentId = formData.get("studentId") as string;

  await prisma.feePayment.deleteMany({ where: { studentId } });
  await prisma.feeInvoiceItem.deleteMany({ where: { invoice: { studentId } } });
  await prisma.feeInvoice.deleteMany({ where: { studentId } });
  await prisma.studentDiscount.deleteMany({ where: { studentId } });
  await prisma.transferCertificate.deleteMany({ where: { studentId } });
  await prisma.studentDocument.deleteMany({ where: { studentId } });
  await prisma.guardian.deleteMany({ where: { studentId } });
  await prisma.student.delete({ where: { id: studentId } });

  revalidatePath("/students");
  revalidatePath("/");
  redirect("/students?notice=student_deleted");
}

// Update Existing Student Record
export async function updateStudent(formData: FormData): Promise<void> {
  const studentId = formData.get("studentId") as string;
  const firstName = (formData.get("firstName") as string).trim();
  const middleName = (formData.get("middleName") as string)?.trim() || null;
  const lastName = (formData.get("lastName") as string).trim();
  const dobStr = formData.get("dob") as string;
  const dob = dobStr ? new Date(dobStr) : undefined;
  const gender = formData.get("gender") as string;
  const bloodGroup = (formData.get("bloodGroup") as string) || null;
  const category = (formData.get("category") as string) || null;
  const nationality = (formData.get("nationality") as string) || "Indian";
  const motherTongue = (formData.get("motherTongue") as string) || null;
  const religion = (formData.get("religion") as string) || null;
  const aadhaarNo = (formData.get("aadhaarNo") as string) || null;
  const studentMobile = (formData.get("studentMobile") as string) || null;
  const studentEmail = (formData.get("studentEmail") as string) || null;

  const currentAddress = (formData.get("currentAddress") as string) || null;
  const currentPincode = (formData.get("currentPincode") as string) || null;
  const permanentAddress = (formData.get("permanentAddress") as string) || null;
  const permanentPincode = (formData.get("permanentPincode") as string) || null;

  const classId = formData.get("classId") as string;
  const sectionId = (formData.get("sectionId") as string) || null;
  const house = (formData.get("house") as string) || null;
  const rollNo = formData.get("rollNo") ? parseInt(formData.get("rollNo") as string, 10) : null;

  // Guardian details
  const fatherName = (formData.get("fatherName") as string) || "";
  const fatherPhone = (formData.get("fatherPhone") as string) || "";
  const fatherEmail = (formData.get("fatherEmail") as string) || "";
  const fatherOccupation = (formData.get("fatherOccupation") as string) || "";

  const motherName = (formData.get("motherName") as string) || "";
  const motherPhone = (formData.get("motherPhone") as string) || "";
  const motherEmail = (formData.get("motherEmail") as string) || "";
  const motherOccupation = (formData.get("motherOccupation") as string) || "";

  await prisma.student.update({
    where: { id: studentId },
    data: {
      firstName,
      middleName,
      lastName,
      ...(dob ? { dob } : {}),
      gender,
      bloodGroup,
      category,
      nationality,
      motherTongue,
      religion,
      aadhaarNo,
      studentMobile,
      studentEmail,
      currentAddress,
      currentPincode,
      permanentAddress,
      permanentPincode,
      classId,
      sectionId,
      house,
      rollNo,
    },
  });

  // Update or create guardians
  if (fatherName) {
    const existingFather = await prisma.guardian.findFirst({
      where: { studentId, relation: "FATHER" },
    });
    if (existingFather) {
      await prisma.guardian.update({
        where: { id: existingFather.id },
        data: {
          name: fatherName,
          phone: fatherPhone,
          email: fatherEmail || null,
          occupation: fatherOccupation || null,
        },
      });
    } else {
      await prisma.guardian.create({
        data: {
          studentId,
          name: fatherName,
          relation: "FATHER",
          phone: fatherPhone,
          email: fatherEmail || null,
          occupation: fatherOccupation || null,
          isPrimary: true,
        },
      });
    }
  }

  if (motherName) {
    const existingMother = await prisma.guardian.findFirst({
      where: { studentId, relation: "MOTHER" },
    });
    if (existingMother) {
      await prisma.guardian.update({
        where: { id: existingMother.id },
        data: {
          name: motherName,
          phone: motherPhone,
          email: motherEmail || null,
          occupation: motherOccupation || null,
        },
      });
    } else {
      await prisma.guardian.create({
        data: {
          studentId,
          name: motherName,
          relation: "MOTHER",
          phone: motherPhone,
          email: motherEmail || null,
          occupation: motherOccupation || null,
          isPrimary: false,
        },
      });
    }
  }

  revalidatePath(`/students/${studentId}`);
  revalidatePath("/students");
  redirect(`/students/${studentId}?notice=updated`);
}
