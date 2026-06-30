import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  try {
    console.log("Adding missing columns to Client table...")
    await prisma.$executeRaw`ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT false;`
    await prisma.$executeRaw`ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "isOnline" BOOLEAN NOT NULL DEFAULT false;`
    
    console.log("Creating ClientBillingInfo table...")
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "ClientBillingInfo" (
          "id" SERIAL NOT NULL,
          "clientId" INTEGER NOT NULL,
          "tcNo" TEXT,
          "address" TEXT,
          "city" TEXT,
          "district" TEXT,
          "taxNo" TEXT,
          CONSTRAINT "ClientBillingInfo_pkey" PRIMARY KEY ("id")
      );
    `
    // Ensure the unique index exists
    await prisma.$executeRaw`CREATE UNIQUE INDEX IF NOT EXISTS "ClientBillingInfo_clientId_key" ON "ClientBillingInfo"("clientId");`
    
    try {
      await prisma.$executeRaw`ALTER TABLE "ClientBillingInfo" ADD CONSTRAINT "ClientBillingInfo_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;`
    } catch (e) {
      // Ignore if constraint already exists
    }

    console.log("Creating Invoice table...")
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Invoice" (
          "id" SERIAL NOT NULL,
          "clientId" INTEGER NOT NULL,
          "date" TIMESTAMP(3) NOT NULL,
          "subject" TEXT NOT NULL,
          "quantity" INTEGER NOT NULL,
          "vatRate" DOUBLE PRECISION NOT NULL,
          "amountWithVat" DOUBLE PRECISION NOT NULL,
          "amountWithoutVat" DOUBLE PRECISION NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
      );
    `
    
    try {
      await prisma.$executeRaw`ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;`
    } catch (e) {
      // Ignore if constraint already exists
    }

    console.log("Database schema updated manually without data loss!")
  } catch (e) {
    console.error("Error updating schema:", e)
  } finally {
    await prisma.$disconnect()
  }
}
main()
