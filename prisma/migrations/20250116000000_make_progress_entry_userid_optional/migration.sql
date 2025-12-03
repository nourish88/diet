-- AlterTable: Make userId optional in ProgressEntry
ALTER TABLE "ProgressEntry" ALTER COLUMN "userId" DROP NOT NULL;

