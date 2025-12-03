-- CreateTable
CREATE TABLE "TanitaUser" (
    "id" SERIAL NOT NULL,
    "tanitaMemberId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "surname" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "dob" TEXT,
    "gender" TEXT,
    "bodyType" TEXT,
    "height" TEXT,
    "identityNumber" TEXT,
    "notes" TEXT,
    "clientId" INTEGER,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TanitaUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TanitaMeasurement" (
    "id" SERIAL NOT NULL,
    "tanitaMeasurementId" INTEGER NOT NULL,
    "tanitaMemberId" INTEGER NOT NULL,
    "measureDate" TIMESTAMP(3) NOT NULL,
    "weight" DOUBLE PRECISION,
    "fatRate" DOUBLE PRECISION,
    "fatMass" DOUBLE PRECISION,
    "muscleMass" DOUBLE PRECISION,
    "boneMass" DOUBLE PRECISION,
    "totalBodyWater" DOUBLE PRECISION,
    "bodyWaterRate" DOUBLE PRECISION,
    "bmi" DOUBLE PRECISION,
    "visceralFatRate" INTEGER,
    "basalMetabolism" INTEGER,
    "bmr" INTEGER,
    "detailedData" JSONB,
    "progressEntryId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TanitaMeasurement_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Client" ADD COLUMN "tanitaMemberId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "TanitaUser_tanitaMemberId_key" ON "TanitaUser"("tanitaMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "TanitaUser_clientId_key" ON "TanitaUser"("clientId");

-- CreateIndex
CREATE INDEX "TanitaUser_tanitaMemberId_idx" ON "TanitaUser"("tanitaMemberId");

-- CreateIndex
CREATE INDEX "TanitaUser_clientId_idx" ON "TanitaUser"("clientId");

-- CreateIndex
CREATE INDEX "TanitaUser_email_idx" ON "TanitaUser"("email");

-- CreateIndex
CREATE INDEX "TanitaUser_phone_idx" ON "TanitaUser"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "TanitaMeasurement_tanitaMeasurementId_key" ON "TanitaMeasurement"("tanitaMeasurementId");

-- CreateIndex
CREATE UNIQUE INDEX "TanitaMeasurement_progressEntryId_key" ON "TanitaMeasurement"("progressEntryId");

-- CreateIndex
CREATE INDEX "TanitaMeasurement_tanitaMemberId_measureDate_idx" ON "TanitaMeasurement"("tanitaMemberId", "measureDate");

-- CreateIndex
CREATE INDEX "TanitaMeasurement_tanitaMeasurementId_idx" ON "TanitaMeasurement"("tanitaMeasurementId");

-- CreateIndex
CREATE UNIQUE INDEX "Client_tanitaMemberId_key" ON "Client"("tanitaMemberId");

-- AddForeignKey
ALTER TABLE "TanitaUser" ADD CONSTRAINT "TanitaUser_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TanitaMeasurement" ADD CONSTRAINT "TanitaMeasurement_tanitaMemberId_fkey" FOREIGN KEY ("tanitaMemberId") REFERENCES "TanitaUser"("tanitaMemberId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TanitaMeasurement" ADD CONSTRAINT "TanitaMeasurement_progressEntryId_fkey" FOREIGN KEY ("progressEntryId") REFERENCES "ProgressEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

