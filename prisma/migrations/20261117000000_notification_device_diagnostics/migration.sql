ALTER TABLE "PushSubscription" ADD COLUMN "deviceInfo" JSONB;
ALTER TABLE "NotificationLog"
  ADD COLUMN "subscriptionId" INTEGER,
  ADD COLUMN "deviceInfo" JSONB,
  ADD COLUMN "pushStatusCode" INTEGER;
