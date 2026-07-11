-- Weekly client check-ins and actionable durable notifications.
ALTER TABLE "BroadcastMessage"
  ADD COLUMN "type" TEXT NOT NULL DEFAULT 'announcement',
  ADD COLUMN "dedupeKey" TEXT;

ALTER TABLE "BroadcastRecipient"
  ADD COLUMN "actionUrl" TEXT,
  ADD COLUMN "weeklyCheckInId" INTEGER;

CREATE UNIQUE INDEX "BroadcastMessage_dedupeKey_key" ON "BroadcastMessage"("dedupeKey");

CREATE TABLE "WeeklyCheckIn" (
  "id" SERIAL NOT NULL,
  "clientId" INTEGER NOT NULL,
  "dietitianId" INTEGER NOT NULL,
  "weekStart" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "isTest" BOOLEAN NOT NULL DEFAULT false,
  "adherence" INTEGER,
  "hunger" INTEGER,
  "energy" INTEGER,
  "sleep" INTEGER,
  "water" INTEGER,
  "exercise" INTEGER,
  "satisfaction" INTEGER,
  "challenge" TEXT,
  "supportRequest" TEXT,
  "sentAt" TIMESTAMP(3),
  "reminderSentAt" TIMESTAMP(3),
  "submittedAt" TIMESTAMP(3),
  "contactedAt" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WeeklyCheckIn_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WeeklyCheckIn_clientId_weekStart_isTest_key" ON "WeeklyCheckIn"("clientId", "weekStart", "isTest");
CREATE INDEX "WeeklyCheckIn_dietitianId_status_idx" ON "WeeklyCheckIn"("dietitianId", "status");
CREATE INDEX "WeeklyCheckIn_dietitianId_satisfaction_submittedAt_idx" ON "WeeklyCheckIn"("dietitianId", "satisfaction", "submittedAt");
CREATE INDEX "WeeklyCheckIn_clientId_submittedAt_idx" ON "WeeklyCheckIn"("clientId", "submittedAt");
CREATE INDEX "BroadcastRecipient_weeklyCheckInId_idx" ON "BroadcastRecipient"("weeklyCheckInId");

ALTER TABLE "WeeklyCheckIn"
  ADD CONSTRAINT "WeeklyCheckIn_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WeeklyCheckIn"
  ADD CONSTRAINT "WeeklyCheckIn_dietitianId_fkey"
  FOREIGN KEY ("dietitianId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BroadcastRecipient"
  ADD CONSTRAINT "BroadcastRecipient_weeklyCheckInId_fkey"
  FOREIGN KEY ("weeklyCheckInId") REFERENCES "WeeklyCheckIn"("id") ON DELETE SET NULL ON UPDATE CASCADE;
