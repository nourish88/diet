BEGIN;

ALTER TABLE "NotificationLog"
  ADD COLUMN "replacementSubscriptionId" INTEGER,
  ADD COLUMN "retryOfId" INTEGER,
  ADD COLUMN "retryAfterId" INTEGER,
  ADD CONSTRAINT "NotificationLog_retryOfId_fkey" FOREIGN KEY ("retryOfId")
    REFERENCES "NotificationLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "NotificationLog_retryOfId_retryAfterId_key"
  ON "NotificationLog"("retryOfId", "retryAfterId");

ALTER TABLE "ApplicationError" ADD COLUMN "recoveredAt" TIMESTAMP(3);

COMMIT;
