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
  const gender = (formData.get("gender") as string) || "MALE";
  const currentAddress = (formData.get("currentAddress") as string) || "";
  const emergencyContact = (formData.get("emergencyContact") as string) || "";

  // Guardian details
  const fatherName = formData.get("fatherName") as string;
  const fatherPhone = formData.get("fatherPhone") as string;
  const fatherEmail = (formData.get("fatherEmail") as string) || "";
  const motherName = (formData.get("motherName") as string) || "";
  const motherPhone = (formData.get("motherPhone") as string) || "";

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
      gender,
      currentAddress,
      emergencyContact,
      campusId,
      classId,
      status: "REGISTERED",
      guardians: {
        create: [
          ...(fatherName
            ? [
                {
                  relation: "FATHER",
                  name: fatherName,
                  phone: fatherPhone || emergencyContact,
                  email: fatherEmail,
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
  redirect(`/students/${student.id}?notice=registered`);
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
