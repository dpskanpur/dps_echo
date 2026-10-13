import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const cachedPrisma = globalForPrisma.prisma;
const hasLatestModels = cachedPrisma && typeof (cachedPrisma as any).employee !== "undefined";

export const prisma =
  hasLatestModels
    ? cachedPrisma!
    : new PrismaClient({
        log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
      });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
