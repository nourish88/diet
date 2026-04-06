-- AlterTable
ALTER TABLE "Client" ADD COLUMN "kvkkPortalConsentAt" TIMESTAMP(3),
ADD COLUMN "kvkkPortalConsentVersion" TEXT;

-- CreateTable
CREATE TABLE "ClientConsentRecord" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "consentVersion" TEXT NOT NULL,
    "consentType" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "channel" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipHash" TEXT,

    CONSTRAINT "ClientConsentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClientConsentRecord_clientId_acceptedAt_idx" ON "ClientConsentRecord"("clientId", "acceptedAt");

-- CreateIndex
CREATE INDEX "ClientConsentRecord_clientId_consentVersion_idx" ON "ClientConsentRecord"("clientId", "consentVersion");

-- AddForeignKey
ALTER TABLE "ClientConsentRecord" ADD CONSTRAINT "ClientConsentRecord_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientConsentRecord" ADD CONSTRAINT "ClientConsentRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
