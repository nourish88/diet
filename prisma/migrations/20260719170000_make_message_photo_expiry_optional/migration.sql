-- Message attachments are conversation history and must not disappear after
-- the standalone meal-photo retention window.
ALTER TABLE "MealPhoto" ALTER COLUMN "expiresAt" DROP NOT NULL;
