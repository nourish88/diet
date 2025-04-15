/*
  Warnings:

  - You are about to drop the `BannedBesin` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "BannedBesin" DROP CONSTRAINT "BannedBesin_besinId_fkey";

-- DropForeignKey
ALTER TABLE "BannedBesin" DROP CONSTRAINT "BannedBesin_clientId_fkey";

-- DropTable
DROP TABLE "BannedBesin";

-- CreateTable
CREATE TABLE "BannedFood" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clientId" INTEGER NOT NULL,
    "besinId" INTEGER NOT NULL,
    "reason" TEXT,

    CONSTRAINT "BannedFood_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BannedFood_clientId_besinId_key" ON "BannedFood"("clientId", "besinId");

-- AddForeignKey
ALTER TABLE "BannedFood" ADD CONSTRAINT "BannedFood_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BannedFood" ADD CONSTRAINT "BannedFood_besinId_fkey" FOREIGN KEY ("besinId") REFERENCES "Besin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
