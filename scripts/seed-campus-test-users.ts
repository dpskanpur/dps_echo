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

const TARGET_USERS = [
  {
    email: "dpsbarra@dpskanpur.com",
    name: "DPS Barra Staff",
    campusCode: "BAR",
  },
  {
    email: "dpsserrvodayanagar@dpskanpur.com",
    name: "DPS Servodaya Nagar Staff",
    campusCode: "SRV",
  },
  {
    email: "dpskidwainagar@dpskanpur.com",
    name: "DPS Kidwai Nagar Staff",
    campusCode: "KID",
  },
  {
    email: "dpsazaadnagar@dpskanpur.com",
    name: "DPS Azad Nagar Staff",
    campusCode: "AZD",
  },
];

async function main() {
  console.log("🚀 Provisioning Campus Test Accounts with View-Only Access...");

  for (const u of TARGET_USERS) {
    const campus = await prisma.campus.findUnique({
      where: { code: u.campusCode },
    });

    if (!campus) {
      console.error(`❌ Campus with code "${u.campusCode}" not found!`);
      continue;
    }

    const dbUser = await prisma.user.upsert({
      where: { email: u.email.toLowerCase() },
      update: {
        name: u.name,
        role: "STAFF",
        status: "ACTIVE",
        campusId: campus.id,
      },
      create: {
        email: u.email.toLowerCase(),
        name: u.name,
        role: "STAFF",
        status: "ACTIVE",
        campusId: campus.id,
      },
    });

    console.log(`✅ Provisioned user ${dbUser.email} -> Campus: ${campus.name} (${campus.code})`);

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

    console.log(`   🔒 Assigned View-Only permissions across ${APP_MODULES.length} modules for ${dbUser.email}.`);
  }

  console.log("🎉 All 4 campus test accounts have been successfully created and configured!");
}

main()
  .catch((e) => {
    console.error("❌ Error provisioning test users:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
