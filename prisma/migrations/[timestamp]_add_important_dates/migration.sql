-- CreateTable
CREATE TABLE "ImportantDate" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ImportantDate_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Diet" ADD COLUMN "importantDateId" INTEGER,
ADD COLUMN "isImportantDateCelebrated" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "Diet" ADD CONSTRAINT "Diet_importantDateId_fkey" FOREIGN KEY ("importantDateId") REFERENCES "ImportantDate"("id") ON DELETE SET NULL ON UPDATE CASCADE;