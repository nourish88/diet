-- AlterTable: add delivery tracking to DietComment
ALTER TABLE "DietComment"
  ADD COLUMN "isDelivered" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "deliveredAt" TIMESTAMP(3);

-- Backfill: existing messages are considered delivered at their createdAt
UPDATE "DietComment"
SET "isDelivered" = true,
    "deliveredAt" = "createdAt"
WHERE "isDelivered" = false;
