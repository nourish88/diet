-- Archiving only changes client-side visibility; notification content and
-- dietitian audit history remain intact.
ALTER TABLE "BroadcastRecipient" ADD COLUMN "archivedAt" TIMESTAMP(3);

CREATE INDEX "BroadcastRecipient_clientId_archivedAt_idx"
  ON "BroadcastRecipient"("clientId", "archivedAt");
