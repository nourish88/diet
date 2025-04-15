/*
  Warnings:

  - You are about to drop the column `orderNumber` on the `Ogun` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Ogun" DROP COLUMN "orderNumber",
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0;
