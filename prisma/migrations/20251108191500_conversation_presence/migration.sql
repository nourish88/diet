-- CreateTable
CREATE TABLE "ConversationPresence" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "dietId" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConversationPresence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConversationPresence_userId_dietId_key" ON "ConversationPresence"("userId", "dietId");

-- CreateIndex
CREATE INDEX "ConversationPresence_dietId_isActive_idx" ON "ConversationPresence"("dietId", "isActive");

-- AddForeignKey
ALTER TABLE "ConversationPresence"
ADD CONSTRAINT "ConversationPresence_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationPresence"
ADD CONSTRAINT "ConversationPresence_dietId_fkey"
FOREIGN KEY ("dietId") REFERENCES "Diet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

