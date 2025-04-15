-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('ERKEK', 'KADIN');

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "gender" "Gender";
