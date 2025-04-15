/*
  Warnings:

  - Added the required column `name` to the `Ogun` table without a default value. This is not possible if the table is not empty.
  - Added the required column `time` to the `Ogun` table without a default value. This is not possible if the table is not empty.
  - Made the column `order` on table `Ogun` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Ogun" DROP CONSTRAINT "Ogun_dietId_fkey";

-- AlterTable
ALTER TABLE "Ogun" ADD COLUMN     "detail" TEXT,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "time" TEXT NOT NULL,
ALTER COLUMN "order" SET NOT NULL,
ALTER COLUMN "order" SET DEFAULT 0;

-- AddForeignKey
ALTER TABLE "Ogun" ADD CONSTRAINT "Ogun_dietId_fkey" FOREIGN KEY ("dietId") REFERENCES "Diet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
