n-- First, add the column as nullable
ALTER TABLE "BesinGroup" ADD COLUMN "name" TEXT;

-- Update existing rows with a default value
UPDATE "BesinGroup" SET "name" = 'Default Group Name';

-- Then make the column required
ALTER TABLE "BesinGroup" ALTER COLUMN "name" SET NOT NULL;