/*
  Warnings:

  - Added the required column `name` to the `BesinGroup` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "BesinGroup" ADD COLUMN "name" TEXT;

-- Update existing rows with a default value
UPDATE "BesinGroup" SET "name" = description;

-- Then make the column required
ALTER TABLE "BesinGroup" ALTER COLUMN "name" SET NOT NULL;
