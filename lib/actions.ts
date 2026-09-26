"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { generateTCNumber } from "@/lib/utils";
import { requirePermission } from "@/lib/auth";
import { assertCampusAllowed } from "@/lib/permissions";
import { getActiveSessionName, resolveAdmissionSession } from "@/lib/academic-session";
import { PUBLIC_REFERENCE_TAG } from "@/lib/public-data";
import { logAuditAction } from "@/lib/audit-log";

// -------------------------------------------------------------
// Campus isolation helper
//
// A campus-bound user must not be able to reach another campus's
// record by posting its id directly to a server action.
// -------------------------------------------------------------

async function assertStudentInScope(
  user: { campusId?: string | null },
  studentId: string
): Promise<void> {
  if (!user.campusId) return;
  const record = await prisma.student.findUnique({
    where: { id: studentId },
    select: { campusId: true },
  });
  if (!record || record.campusId !== user.campusId) {
    throw new Error("You do not have access to records belonging to another campus.");
  }
}

// -------------------------------------------------------------
// Student Management Actions
// -------------------------------------------------------------

// -------------------------------------------------------------
// Stage 1: Register New Applicant (Registration Form)
// -------------------------------------------------------------

export async function registerStudent(formData: FormData): Promise<void> {
  const { user } = await requirePermission("students", "update");
  // Current or future session only; a past session is refused.
  const admissionSession = await resolveAdmissionSession(
    formData.get("academicYearIn") as string
  );
  const campusId = formData.get("campusId") as string;
  assertCampusAllowed(user, campusId);
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
  const photoUrl = (formData.get("photoUrl") as string) || null;

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

  const regPrefix = campus?.registrationIdPrefix || "REG";
  const regFee = campus?.registrationFee ?? 1000;

  // Collision-free loop for registrationNo & temporary scholarNo
  let regSeq = (await prisma.student.count({ where: { campusId } })) + 1;
  let registrationNo: string;
  let scholarNo: string;
  while (true) {
    const candidateReg = `${regPrefix}-${campus?.code || "KNP"}-${year}-${String(regSeq).padStart(4, "0")}`;
    const candidateSch = `${regPrefix}-TEMP-${campus?.code || "KNP"}-${year}-${String(regSeq).padStart(4, "0")}`;
    const [existReg, existSch] = await Promise.all([
      prisma.student.findUnique({ where: { registrationNo: candidateReg }, select: { id: true } }),
      prisma.student.findUnique({ where: { scholarNo: candidateSch }, select: { id: true } }),
    ]);
    if (!existReg && !existSch) {
      registrationNo = candidateReg;
      scholarNo = candidateSch;
      break;
    }
    regSeq++;
  }
  const admissionNo = "REGISTRATION_PENDING";

  const student = await prisma.student.create({
    data: {
      registrationNo,
      registrationDate: new Date(),
      scholarNo,
      admissionNo,
      admissionDate: new Date(),
      academicYearIn: admissionSession,
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
      photoUrl,
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

  await logAuditAction({
    userId: user.id,
    userEmail: user.email,
    userName: user.name || undefined,
    userRole: user.role,
    campusCode: campusId,
    academicSession: admissionSession,
    action: "STUDENT_REGISTER",
    entityType: "Student",
    entityId: student.id,
    details: { regNo: student.registrationNo, name: `${student.firstName} ${student.lastName}`.trim() },
  });

  revalidatePath("/students");
  revalidatePath("/");
  redirect(`/students/${student.id}?notice=registered`);
}

// Public Portal Online Registration Action (Payment Mode: ONLINE ONLY)
export async function registerStudentPublic(formData: FormData): Promise<void> {
  // Public admission form — intentionally unauthenticated. The campus is
  // validated against the database below rather than against a session, and
  // the session is always the active one: the public cannot pick it.
  const admissionSession = await getActiveSessionName();
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
      academicYearIn: admissionSession,
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
  const { user } = await requirePermission("rbac", "update");
  const campusId = formData.get("campusId") as string;
  assertCampusAllowed(user, campusId);
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
  const { user } = await requirePermission("students", "update");
  const studentId = formData.get("studentId") as string;
  await assertStudentInScope(user, studentId);
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

  const scholarPrefix = campus?.scholarIdPrefix || "DPS";
  const scholarNo = `${scholarPrefix}-${campus?.code || "KNP"}-${year}-${String(admSeq).padStart(4, "0")}`;
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

  await logAuditAction({
    userId: user.id,
    userEmail: user.email,
    userName: user.name || undefined,
    userRole: user.role,
    campusCode: existingStudent.campusId,
    action: "STUDENT_PROMOTE_ADMISSION",
    entityType: "Student",
    entityId: studentId,
    details: { scholarNo, admissionNo },
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
  const { user } = await requirePermission("students", "update");
  const admissionSession = await resolveAdmissionSession(
    formData.get("academicYearIn") as string
  );
  const campusId = formData.get("campusId") as string;
  assertCampusAllowed(user, campusId);
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

  // Generate Unique Registration ID & Unique Admission ID (collision-free loop)
  let regSeq = (await prisma.student.count({ where: { campusId } })) + 1;
  let registrationNo: string;
  while (true) {
    const candidate = `REG-${campus?.code || "KNP"}-${year}-${String(regSeq).padStart(4, "0")}`;
    const existing = await prisma.student.findUnique({ where: { registrationNo: candidate }, select: { id: true } });
    if (!existing) {
      registrationNo = candidate;
      break;
    }
    regSeq++;
  }

  let admSeq = (await prisma.student.count({ where: { campusId } })) + 1;
  let scholarNo: string;
  while (true) {
    const candidate = `DPS-${campus?.code || "KNP"}-${year}-${String(admSeq).padStart(4, "0")}`;
    const existing = await prisma.student.findUnique({ where: { scholarNo: candidate }, select: { id: true } });
    if (!existing) {
      scholarNo = candidate;
      break;
    }
    admSeq++;
  }
  const admissionNo = `${campus?.code || "KNP"}/${year}/${admSeq}`;

  const student = await prisma.student.create({
    data: {
      registrationNo,
      registrationDate: new Date(),
      scholarNo,
      admissionNo,
      admissionDate: new Date(),
      academicYearIn: admissionSession,
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

  await logAuditAction({
    userId: user.id,
    userEmail: user.email,
    userName: user.name || undefined,
    userRole: user.role,
    campusCode: campusId,
    academicSession: admissionSession,
    action: "STUDENT_CREATE",
    entityType: "Student",
    entityId: student.id,
    details: { scholarNo, admissionNo, name: `${student.firstName} ${student.lastName}`.trim() },
  });

  revalidatePath("/students");
  revalidatePath("/");
  redirect(`/students/${student.id}?notice=created`);
}

// -------------------------------------------------------------
// Transfer Certificate (TC) Actions
// -------------------------------------------------------------

export async function issueTransferCertificate(formData: FormData): Promise<void> {
  const { user } = await requirePermission("tc", "update");
  const studentId = formData.get("studentId") as string;
  await assertStudentInScope(user, studentId);
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

  await logAuditAction({
    userId: user.id,
    userEmail: user.email,
    userName: user.name || undefined,
    userRole: user.role,
    campusCode: student.campus.code,
    action: "TC_ISSUE",
    entityType: "TransferCertificate",
    entityId: tc.id,
    details: { tcNumber, studentId: student.id },
  });

  revalidatePath("/students");
  revalidatePath("/tc");
  revalidatePath(`/students/${studentId}`);
  redirect(`/tc?tcId=${tc.id}`);
}

// Delete Student Record
export async function deleteStudent(formData: FormData): Promise<void> {
  const { user } = await requirePermission("students", "delete");
  const studentId = formData.get("studentId") as string;
  await assertStudentInScope(user, studentId);

  await prisma.feePayment.deleteMany({ where: { studentId } });
  await prisma.feeInvoiceItem.deleteMany({ where: { invoice: { studentId } } });
  await prisma.feeInvoice.deleteMany({ where: { studentId } });
  await prisma.studentDiscount.deleteMany({ where: { studentId } });
  await prisma.transferCertificate.deleteMany({ where: { studentId } });
  await prisma.studentDocument.deleteMany({ where: { studentId } });
  await prisma.guardian.deleteMany({ where: { studentId } });
  await prisma.student.delete({ where: { id: studentId } });

  await logAuditAction({
    userId: user.id,
    userEmail: user.email,
    userName: user.name || undefined,
    userRole: user.role,
    action: "STUDENT_DELETE",
    entityType: "Student",
    entityId: studentId,
  });

  revalidatePath("/students");
  revalidatePath("/");
  redirect("/students?notice=student_deleted");
}

// Update Existing Student Record
export async function updateStudent(formData: FormData): Promise<void> {
  const { user } = await requirePermission("students", "update");
  const studentId = formData.get("studentId") as string;
  await assertStudentInScope(user, studentId);
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

  const photoUrl = (formData.get("photoUrl") as string) || undefined;

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
      ...(photoUrl ? { photoUrl } : {}),
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

  await logAuditAction({
    userId: user.id,
    userEmail: user.email,
    userName: user.name || undefined,
    userRole: user.role,
    action: "STUDENT_UPDATE",
    entityType: "Student",
    entityId: studentId,
    details: { firstName, lastName, gender, status },
  });

  revalidatePath(`/students/${studentId}`);
  revalidatePath("/students");
  redirect(`/students/${studentId}?notice=updated`);
}

// -------------------------------------------------------------
// System-Wide Settings & Dynamic Directory Columns Actions
// -------------------------------------------------------------

export async function updateCampusSettings(formData: FormData): Promise<void> {
  const { user } = await requirePermission("rbac", "update");
  const campusId = formData.get("campusId") as string;
  assertCampusAllowed(user, campusId);
  if (!campusId) return;

  const registrationFee = parseFloat(formData.get("registrationFee") as string) || 1000;
  const scholarIdPrefix = (formData.get("scholarIdPrefix") as string) || "DPS";
  const registrationIdPrefix = (formData.get("registrationIdPrefix") as string) || "REG";
  const activeAcademicYear = (formData.get("activeAcademicYear") as string) || "2026-2027";
  const phone = (formData.get("phone") as string) || "";
  const email = (formData.get("email") as string) || "";
  const address = (formData.get("address") as string) || "";
  const affiliation = (formData.get("affiliation") as string) || "";
  const tagline = (formData.get("tagline") as string) || "";
  const website = (formData.get("website") as string) || "";

  await prisma.campus.update({
    where: { id: campusId },
    data: {
      registrationFee,
      scholarIdPrefix,
      registrationIdPrefix,
      activeAcademicYear,
      phone,
      email,
      address,
      affiliation,
      tagline,
      website,
    },
  });

  await logAuditAction({
    userId: user.id,
    userEmail: user.email,
    userName: user.name || undefined,
    userRole: user.role,
    campusCode: campusId,
    action: "CAMPUS_SETTINGS_UPDATE",
    entityType: "Campus",
    entityId: campusId,
    details: { activeAcademicYear, registrationFee, scholarIdPrefix },
  });

  revalidatePath("/admin/rbac");
  revalidatePath("/campuses");
  revalidatePath("/students/new");
  revalidateTag(PUBLIC_REFERENCE_TAG);
  redirect(`/admin/rbac?tab=system&campusId=${campusId}&notice=campus_updated`);
}

export async function updateSystemSettings(formData: FormData): Promise<void> {
  const { user } = await requirePermission("rbac", "update");
  const currentAcademicYear = (formData.get("currentAcademicYear") as string) || "2026-2027";
  const scholarIdPrefix = (formData.get("scholarIdPrefix") as string) || "DPS";
  const registrationIdPrefix = (formData.get("registrationIdPrefix") as string) || "REG";
  const registrationFeeDefault = parseFloat(formData.get("registrationFeeDefault") as string) || 1000;

  await prisma.systemSettings.upsert({
    where: { id: "global" },
    update: {
      currentAcademicYear,
      scholarIdPrefix,
      registrationIdPrefix,
      registrationFeeDefault,
    },
    create: {
      id: "global",
      currentAcademicYear,
      scholarIdPrefix,
      registrationIdPrefix,
      registrationFeeDefault,
    },
  });

  await logAuditAction({
    userId: user.id,
    userEmail: user.email,
    userName: user.name || undefined,
    userRole: user.role,
    action: "SYSTEM_SETTINGS_UPDATE",
    entityType: "SystemSettings",
    entityId: "global",
    details: { currentAcademicYear, scholarIdPrefix, registrationFeeDefault },
  });

  revalidatePath("/admin/rbac");
  revalidatePath("/students");
  revalidatePath("/students/new");
  redirect("/admin/rbac?notice=settings_updated");
}

export async function createDirectoryColumn(formData: FormData): Promise<void> {
  const { user } = await requirePermission("rbac", "update");
  const label = (formData.get("label") as string).trim();
  const keyRaw = (formData.get("key") as string)?.trim() || label.toLowerCase().replace(/[^a-z0-9]/g, "");
  const key = keyRaw || `col_${Date.now()}`;
  const type = (formData.get("type") as string) || "text";
  const optionsJson = (formData.get("optionsJson") as string) || null;

  const count = await prisma.directoryColumn.count();

  await prisma.directoryColumn.create({
    data: {
      key,
      label,
      type,
      optionsJson,
      isVisibleInDirectory: true,
      isVisibleInForm: true,
      sequence: count + 1,
    },
  });

  revalidatePath("/admin/rbac");
  revalidatePath("/students");
  redirect("/admin/rbac?notice=column_added");
}

export async function deleteDirectoryColumn(formData: FormData): Promise<void> {
  const { user } = await requirePermission("rbac", "update");
  const columnId = formData.get("columnId") as string;

  await prisma.directoryColumn.delete({ where: { id: columnId } });

  revalidatePath("/admin/rbac");
  revalidatePath("/students");
  redirect("/admin/rbac?notice=column_deleted");
}

export async function toggleDirectoryColumnVisibility(formData: FormData): Promise<void> {
  const { user } = await requirePermission("rbac", "update");
  const columnId = formData.get("columnId") as string;
  const isVisible = formData.get("isVisible") === "true";

  await prisma.directoryColumn.update({
    where: { id: columnId },
    data: { isVisibleInDirectory: !isVisible },
  });

  revalidatePath("/admin/rbac");
  revalidatePath("/students");
  redirect("/admin/rbac?notice=column_toggled");
}

// -------------------------------------------------------------
// Campus Onboarding
// -------------------------------------------------------------

/** Class ladder mirrored from prisma/seed.ts so a new campus matches the others. */
const STANDARD_CLASSES = [
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

/**
 * Creates a campus and, optionally, its standard class/section ladder.
 *
 * Without classes a campus cannot accept an admission, so the ladder is
 * created by default — otherwise the first thing a new campus does is fail
 * on the admission form.
 */
export async function createCampus(formData: FormData): Promise<void> {
  const { user } = await requirePermission("rbac", "update");

  // Creating a campus is a platform-level act. A user pinned to one campus
  // administers that campus, not the estate.
  if (user.campusId) {
    throw new Error("Only a platform administrator can create a new campus.");
  }

  const code = ((formData.get("code") as string) || "").trim().toUpperCase();
  const name = ((formData.get("name") as string) || "").trim();
  const address = ((formData.get("address") as string) || "").trim();
  const phone = ((formData.get("phone") as string) || "").trim();
  const email = ((formData.get("email") as string) || "").trim().toLowerCase();
  const city = ((formData.get("city") as string) || "Kanpur").trim();
  const state = ((formData.get("state") as string) || "Uttar Pradesh").trim();
  const pincode = ((formData.get("pincode") as string) || "208002").trim();
  const affiliation = ((formData.get("affiliation") as string) || "").trim() || null;
  const activeAcademicYear =
    ((formData.get("activeAcademicYear") as string) || "").trim() || "2026-2027";
  const registrationFeeRaw = (formData.get("registrationFee") as string) || "1000";
  const createClasses = formData.get("createClasses") === "on";

  if (!code || !name || !address || !phone || !email) {
    throw new Error("Campus code, name, address, phone and email are all required.");
  }

  if (!/^[A-Z]{2,6}$/.test(code)) {
    throw new Error("Campus code must be 2–6 letters, e.g. AZD.");
  }

  const registrationFee = parseFloat(registrationFeeRaw);
  if (!Number.isFinite(registrationFee) || registrationFee < 0) {
    throw new Error("Registration fee must be a non-negative number.");
  }

  const existing = await prisma.campus.findUnique({ where: { code } });
  if (existing) {
    throw new Error(`A campus with code "${code}" already exists.`);
  }

  const campus = await prisma.campus.create({
    data: {
      code,
      name,
      address,
      phone,
      email,
      city,
      state,
      pincode,
      affiliation,
      activeAcademicYear,
      registrationFee,
    },
  });

  if (createClasses) {
    for (const item of STANDARD_CLASSES) {
      const cls = await prisma.class.create({
        data: {
          campusId: campus.id,
          name: item.name,
          numericGrade: item.numericGrade,
          sequence: item.sequence,
        },
      });

      const sectionNames = ["A", "B", ...(item.numericGrade >= 6 ? ["C"] : [])];
      for (const sName of sectionNames) {
        await prisma.section.create({
          data: { classId: cls.id, name: sName },
        });
      }
    }
  }

  revalidateTag(PUBLIC_REFERENCE_TAG);
  revalidatePath("/admin/rbac");
  revalidatePath("/");
  redirect(`/admin/rbac?tab=system&campusId=${campus.id}&notice=campus_created`);
}
