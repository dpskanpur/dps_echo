import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

/**
 * Reference data for the public pages.
 *
 * Campuses and their class lists change roughly once a year, but the
 * admission form re-queried both on every single visit. These are cached
 * across requests and revalidated hourly, so a parent opening the form does
 * not wait on the database for data that has not moved since April.
 *
 * Tagged so an admin action that edits a campus or class can invalidate them
 * immediately via revalidateTag("public-reference").
 */

export const PUBLIC_REFERENCE_TAG = "public-reference";

export const getPublicCampuses = unstable_cache(
  async () =>
    prisma.campus.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        code: true,
        name: true,
        registrationFee: true,
        address: true,
        city: true,
        phone: true,
      },
    }),
  ["public-campuses"],
  { revalidate: 3600, tags: [PUBLIC_REFERENCE_TAG] }
);

export const getPublicClasses = unstable_cache(
  async (campusId: string) =>
    prisma.class.findMany({
      where: { campusId },
      orderBy: { sequence: "asc" },
      select: {
        id: true,
        name: true,
        numericGrade: true,
        sections: { select: { id: true, name: true } },
      },
    }),
  ["public-classes"],
  { revalidate: 3600, tags: [PUBLIC_REFERENCE_TAG] }
);

export const getPublicSystemSettings = unstable_cache(
  async () => {
    try {
      let settings = await prisma.systemSettings.findUnique({
        where: { id: "global" },
      });
      if (!settings) {
        settings = await prisma.systemSettings.create({
          data: { id: "global" },
        });
      }
      return settings;
    } catch (err) {
      return {
        id: "global",
        currentAcademicYear: "2026-2027",
        scholarIdPrefix: "DPS",
        registrationIdPrefix: "REG",
        registrationFeeDefault: 1000,
        isSmsEnabled: true,
        smsDisabledReason: "",
        isEmailEnabled: true,
        emailDisabledReason: "",
        isOnlinePaymentEnabled: true,
        onlinePaymentDisabledReason: "",
        isRegistrationOpen: true,
        registrationClosedNotice: "Online registration is currently closed for new admissions.",
        registrationOpenDateNotice: "Admissions for the upcoming academic session will reopen soon. Please contact the admission office for details.",
        registrationContactPhone: "+91 512 2580000, +91 512 2580001",
        registrationContactEmail: "admissions@dpskanpur.com",
        updatedAt: new Date(),
      };
    }
  },
  ["public-system-settings"],
  { revalidate: 3600, tags: [PUBLIC_REFERENCE_TAG] }
);
