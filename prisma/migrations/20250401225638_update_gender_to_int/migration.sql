/*
  Warnings:

  - The `gender` column on the `Client` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Client" DROP COLUMN "gender",
ADD COLUMN     "gender" INTEGER;

-- DropEnum
DROP TYPE "Gender";
