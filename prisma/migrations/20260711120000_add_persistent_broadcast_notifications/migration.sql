-- Durable dietitian announcements. These tables are deliberately separate
-- from DietComment (chat) and NotificationLog (technical push attempts).
CREATE TABLE "BroadcastMessage" (
    "id" SERIAL NOT NULL,
    "dietitianId" INTEGER,
    "dietitianName" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Diyetisyeninizden mesaj var',
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BroadcastMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BroadcastRecipient" (
    "id" SERIAL NOT NULL,
    "broadcastMessageId" INTEGER NOT NULL,
    "clientId" INTEGER,
    "clientName" TEXT NOT NULL,
    "deliveryStatus" TEXT NOT NULL DEFAULT 'pending',
    "subscriptionCount" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "pushSentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BroadcastRecipient_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BroadcastMessage_dietitianId_idx" ON "BroadcastMessage"("dietitianId");
CREATE INDEX "BroadcastRecipient_broadcastMessageId_idx" ON "BroadcastRecipient"("broadcastMessageId");
CREATE INDEX "BroadcastRecipient_clientId_isRead_idx" ON "BroadcastRecipient"("clientId", "isRead");
CREATE INDEX "BroadcastRecipient_deliveryStatus_idx" ON "BroadcastRecipient"("deliveryStatus");

ALTER TABLE "BroadcastMessage"
  ADD CONSTRAINT "BroadcastMessage_dietitianId_fkey"
  FOREIGN KEY ("dietitianId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BroadcastRecipient"
  ADD CONSTRAINT "BroadcastRecipient_broadcastMessageId_fkey"
  FOREIGN KEY ("broadcastMessageId") REFERENCES "BroadcastMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BroadcastRecipient"
  ADD CONSTRAINT "BroadcastRecipient_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
