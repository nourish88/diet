-- Repair production databases where the notification log migration was marked
-- applied but the physical table is missing.
CREATE TABLE IF NOT EXISTS "NotificationLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "clientId" INTEGER NOT NULL,
    "ogunId" INTEGER,
    "type" TEXT NOT NULL,
    "title" TEXT,
    "body" TEXT,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedAt" TIMESTAMP(3),
    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "NotificationLog" ADD COLUMN IF NOT EXISTS "receivedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "NotificationLog_userId_sentAt_idx" ON "NotificationLog"("userId", "sentAt");
CREATE INDEX IF NOT EXISTS "NotificationLog_clientId_idx" ON "NotificationLog"("clientId");
CREATE INDEX IF NOT EXISTS "NotificationLog_sentAt_idx" ON "NotificationLog"("sentAt");
CREATE INDEX IF NOT EXISTS "NotificationLog_receivedAt_idx" ON "NotificationLog"("receivedAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'NotificationLog_userId_fkey'
  ) THEN
    ALTER TABLE "NotificationLog"
      ADD CONSTRAINT "NotificationLog_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'NotificationLog_clientId_fkey'
  ) THEN
    ALTER TABLE "NotificationLog"
      ADD CONSTRAINT "NotificationLog_clientId_fkey"
      FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'NotificationLog_ogunId_fkey'
  ) THEN
    ALTER TABLE "NotificationLog"
      ADD CONSTRAINT "NotificationLog_ogunId_fkey"
      FOREIGN KEY ("ogunId") REFERENCES "Ogun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
