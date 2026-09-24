import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting Fee Head Cleanup...");

  const campuses = await prisma.campus.findMany();

  for (const campus of campuses) {
    console.log(`Processing campus: ${campus.name} (${campus.code})...`);

    // 1. Ensure REG exists
    const regHead = await prisma.feeHead.upsert({
      where: { campusId_code: { campusId: campus.id, code: "REG" } },
      update: { name: "Registration Fees", description: "One time registration fees.", isOptional: false, isRefundable: false },
      create: { campusId: campus.id, code: "REG", name: "Registration Fees", description: "One time registration fees.", isOptional: false, isRefundable: false },
    });

    // 2. Ensure ADM exists
    const admHead = await prisma.feeHead.upsert({
      where: { campusId_code: { campusId: campus.id, code: "ADM" } },
      update: { name: "Admission Fees", description: "Admission fees paid after admission confirmation", isOptional: false, isRefundable: false },
      create: { campusId: campus.id, code: "ADM", name: "Admission Fees", description: "Admission fees paid after admission confirmation", isOptional: false, isRefundable: false },
    });

    // 3. Ensure QFS exists
    const qfsHead = await prisma.feeHead.upsert({
      where: { campusId_code: { campusId: campus.id, code: "QFS" } },
      update: { name: "Quarterly Fees", description: "Quarterly fees", isOptional: false, isRefundable: false },
      create: { campusId: campus.id, code: "QFS", name: "Quarterly Fees", description: "Quarterly fees", isOptional: false, isRefundable: false },
    });

    // Find heads to keep vs heads to remove
    const allowedCodes = ["REG", "ADM", "QFS"];
    const headsToRemove = await prisma.feeHead.findMany({
      where: {
        campusId: campus.id,
        code: { notIn: allowedCodes },
      },
    });

    for (const oldHead of headsToRemove) {
      console.log(`  Deleting old head: ${oldHead.code} - ${oldHead.name}...`);

      // Delete dependent FeeInvoiceItem and FeeStructure entries referencing oldHead
      await prisma.feeInvoiceItem.deleteMany({
        where: { feeHeadId: oldHead.id },
      });

      await prisma.feeStructure.deleteMany({
        where: { feeHeadId: oldHead.id },
      });

      await prisma.feeHead.delete({
        where: { id: oldHead.id },
      });
    }
  }

  console.log("Cleanup completed successfully!");
}

main()
  .catch((err) => {
    console.error("Cleanup error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
