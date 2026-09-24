import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const APP_MODULES = [
  "students",
  "fees",
  "tc",
  "alumni",
  "notifications",
  "sessions",
  "rbac",
];

async function main() {
  console.log("🚀 Provisioning Jitendra Sharma Account (All Campuses, View-Only)...");

  const email = "jitendra@dpskanpur.com";
  const name = "Jitendra Sharma";

  const dbUser = await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: {
      name,
      role: "STAFF",
      status: "ACTIVE",
      campusId: null, // Unbound: can view all schools/campuses
    },
    create: {
      email: email.toLowerCase(),
      name,
      role: "STAFF",
      status: "ACTIVE",
      campusId: null, // Unbound: can view all schools/campuses
    },
  });

  console.log(`✅ Provisioned user ${dbUser.email} (All Campuses Scope)`);

  // Assign View-Only permissions for all modules
  for (const mod of APP_MODULES) {
    await prisma.userPermission.upsert({
      where: {
        userId_module: {
          userId: dbUser.id,
          module: mod,
        },
      },
      update: {
        canView: true,
        canUpdate: false,
        canDelete: false,
      },
      create: {
        userId: dbUser.id,
        module: mod,
        canView: true,
        canUpdate: false,
        canDelete: false,
      },
    });
  }

  console.log(`🔒 Assigned View-Only permissions across ${APP_MODULES.length} modules for ${dbUser.email}.`);
  console.log("🎉 Account provisioning complete!");
}

main()
  .catch((e) => {
    console.error("❌ Error provisioning user:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
