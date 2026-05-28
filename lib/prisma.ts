// Prisma 6 with new prisma-client generator — typed as any to allow model access
// The actual runtime client is in lib/generated/prisma
/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaClient as GeneratedPrismaClient } from "@/lib/generated/prisma/client";

type PrismaClientType = any;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientType | undefined;
};

const prisma: PrismaClientType =
  globalForPrisma.prisma ??
  new GeneratedPrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export { prisma };
export default prisma;
