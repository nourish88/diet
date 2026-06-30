import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  try {
    await prisma.$executeRaw`DROP INDEX IF EXISTS "Client_tanitaMemberId_key";`
    console.log("Index dropped successfully")
  } catch (e) {
    console.error("Error:", e)
  } finally {
    await prisma.$disconnect()
  }
}
main()
