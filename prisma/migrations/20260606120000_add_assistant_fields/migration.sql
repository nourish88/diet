-- Add assistant role support to User table.
-- Assistants belong to a parent dietitian (assistant_of_id) and carry a JSON
-- permissions blob. Only the "birthday reminders" notification flag is enforced
-- by the application today; other fields are placeholders for future use.

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "name" TEXT,
  ADD COLUMN IF NOT EXISTS "assistant_of_id" INTEGER,
  ADD COLUMN IF NOT EXISTS "assistant_permissions" JSONB;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'User_assistant_of_id_fkey'
  ) THEN
    ALTER TABLE "User"
      ADD CONSTRAINT "User_assistant_of_id_fkey"
      FOREIGN KEY ("assistant_of_id")
      REFERENCES "User"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "User_assistant_of_id_idx" ON "User"("assistant_of_id");
