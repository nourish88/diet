import { PrismaClient } from "@prisma/client";
import { Pool } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { WebSocket } from "ws";

// Configure Neon for serverless environment
const configureNeon = () => {
  // Only needed in Node.js, not in the browser
  if (typeof window === "undefined") {
    // For Vercel serverless functions
    const { neonConfig } = require("@neondatabase/serverless");
    neonConfig.webSocketConstructor = WebSocket;
  }
};

// Configure Neon
configureNeon();

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
// Learn more: https://pris.ly/d/help/next-js-best-practices

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  (() => {
    try {
      // For serverless environments (Vercel)
      const connectionString = process.env.DATABASE_URL!;
      const pool = new Pool({ connectionString });
      const adapter = new PrismaNeon(pool);
      const prismaClient = new PrismaClient({ adapter });

      // Add a hook for debugging in development
      if (process.env.NODE_ENV !== "production") {
        prismaClient.$use(async (params, next) => {
          const before = Date.now();
          const result = await next(params);
          const after = Date.now();
          console.log(
            `Query ${params.model}.${params.action} took ${after - before}ms`
          );
          return result;
        });
      }

      return prismaClient;
    } catch (error) {
      console.error("Error initializing Prisma Client:", error);
      throw error;
    }
  })();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
