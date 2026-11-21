CREATE TABLE "ApplicationError" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "subject" TEXT,
  "status" INTEGER,
  "device" TEXT,
  "referenceId" INTEGER,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApplicationError_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ApplicationError_eventId_key" ON "ApplicationError"("eventId");
CREATE INDEX "ApplicationError_createdAt_idx" ON "ApplicationError"("createdAt");
CREATE INDEX "ApplicationError_subject_createdAt_idx" ON "ApplicationError"("subject", "createdAt");
CREATE INDEX "ApplicationError_code_createdAt_idx" ON "ApplicationError"("code", "createdAt");
