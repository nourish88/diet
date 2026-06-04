-- Create notification log table for meal reminder / manual test delivery history
CREATE TABLE "NotificationLog" (
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
    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "NotificationLog_userId_sentAt_idx" ON "NotificationLog"("userId", "sentAt");
CREATE INDEX "NotificationLog_clientId_idx" ON "NotificationLog"("clientId");
CREATE INDEX "NotificationLog_sentAt_idx" ON "NotificationLog"("sentAt");

ALTER TABLE "NotificationLog"
  ADD CONSTRAINT "NotificationLog_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NotificationLog"
  ADD CONSTRAINT "NotificationLog_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NotificationLog"
  ADD CONSTRAINT "NotificationLog_ogunId_fkey"
  FOREIGN KEY ("ogunId") REFERENCES "Ogun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
