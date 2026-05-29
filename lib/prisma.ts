import { PrismaClient, Prisma } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

const logLevels: Prisma.LogLevel[] =
  process.env.NODE_ENV === 'production' ? ['error'] : ['warn', 'error']

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: logLevels,
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
