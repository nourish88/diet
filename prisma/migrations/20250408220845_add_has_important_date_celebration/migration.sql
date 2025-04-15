/*
  Warnings:

  - You are about to drop the column `importantDateName` on the `Diet` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Diet" DROP COLUMN "importantDateName",
ADD COLUMN     "isImportantDateCelebrated" BOOLEAN NOT NULL DEFAULT false;
