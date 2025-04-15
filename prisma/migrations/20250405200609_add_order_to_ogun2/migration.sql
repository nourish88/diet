/*
  Warnings:

  - You are about to drop the column `order` on the `Ogun` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Ogun" DROP COLUMN "order",
ADD COLUMN     "orderNumber" INTEGER NOT NULL DEFAULT 0;
