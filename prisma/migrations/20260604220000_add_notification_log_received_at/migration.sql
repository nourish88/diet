-- Track real device delivery: service worker pings back when push event fires
ALTER TABLE "NotificationLog" ADD COLUMN "receivedAt" TIMESTAMP(3);
CREATE INDEX "NotificationLog_receivedAt_idx" ON "NotificationLog"("receivedAt");
