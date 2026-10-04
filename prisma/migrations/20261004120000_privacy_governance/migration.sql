-- AlterTable
ALTER TABLE "ClientConsentRecord" ADD COLUMN     "action" TEXT NOT NULL DEFAULT 'legacy_accepted',
ADD COLUMN     "documentHash" TEXT,
ADD COLUMN     "eventHash" TEXT,
ADD COLUMN     "eventSequence" INTEGER,
ADD COLUMN     "policyId" TEXT,
ADD COLUMN     "previousHash" TEXT,
ADD COLUMN     "requestId" TEXT;

-- CreateTable
CREATE TABLE "PrivacyPolicy" (
    "id" TEXT NOT NULL,
    "revision" SERIAL NOT NULL,
    "dietitianId" INTEGER NOT NULL,
    "version" TEXT NOT NULL,
    "healthLegalBasis" TEXT NOT NULL,
    "document" JSONB NOT NULL,
    "documentHash" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedById" INTEGER NOT NULL,
    "reviewReference" TEXT NOT NULL,

    CONSTRAINT "PrivacyPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivacyRequest" (
    "id" TEXT NOT NULL,
    "clientId" INTEGER NOT NULL,
    "dietitianId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "requestId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "nationality" TEXT NOT NULL,
    "identityCiphertext" TEXT NOT NULL,
    "contactAddress" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'received',
    "verifiedAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "responseAccessedAt" TIMESTAMP(3),

    CONSTRAINT "PrivacyRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivacyRequestEvent" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "actorId" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrivacyRequestEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivacyAuditLog" (
    "id" TEXT NOT NULL,
    "dietitianId" INTEGER NOT NULL,
    "actorId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "subjectId" TEXT,
    "format" TEXT,
    "filters" JSONB,
    "rowCount" INTEGER,
    "payloadHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrivacyAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PrivacyPolicy_dietitianId_revision_idx" ON "PrivacyPolicy"("dietitianId", "revision");
CREATE UNIQUE INDEX "PrivacyPolicy_revision_key" ON "PrivacyPolicy"("revision");

-- CreateIndex
CREATE UNIQUE INDEX "PrivacyPolicy_dietitianId_version_key" ON "PrivacyPolicy"("dietitianId", "version");

-- CreateIndex
CREATE INDEX "PrivacyRequest_dietitianId_status_dueAt_idx" ON "PrivacyRequest"("dietitianId", "status", "dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "PrivacyRequest_clientId_requestId_key" ON "PrivacyRequest"("clientId", "requestId");

-- CreateIndex
CREATE INDEX "PrivacyRequestEvent_requestId_createdAt_idx" ON "PrivacyRequestEvent"("requestId", "createdAt");

-- CreateIndex
CREATE INDEX "PrivacyAuditLog_dietitianId_createdAt_idx" ON "PrivacyAuditLog"("dietitianId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ClientConsentRecord_clientId_eventSequence_key" ON "ClientConsentRecord"("clientId", "eventSequence");

-- CreateIndex
CREATE UNIQUE INDEX "ClientConsentRecord_clientId_requestId_key" ON "ClientConsentRecord"("clientId", "requestId");

-- AddForeignKey
ALTER TABLE "ClientConsentRecord" ADD CONSTRAINT "ClientConsentRecord_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "PrivacyPolicy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivacyPolicy" ADD CONSTRAINT "PrivacyPolicy_dietitianId_fkey" FOREIGN KEY ("dietitianId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivacyRequest" ADD CONSTRAINT "PrivacyRequest_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivacyRequestEvent" ADD CONSTRAINT "PrivacyRequestEvent_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "PrivacyRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PrivacyPolicy" ADD CONSTRAINT "PrivacyPolicy_healthLegalBasis_check"
  CHECK ("healthLegalBasis" IN ('explicit_consent', 'healthcare'));
ALTER TABLE "ClientConsentRecord" ADD CONSTRAINT "ClientConsentRecord_action_check"
  CHECK ("action" IN ('legacy_accepted', 'notice_acknowledged', 'granted', 'declined', 'withdrawn'));
ALTER TABLE "ClientConsentRecord" ADD CONSTRAINT "ClientConsentRecord_evidence_check"
  CHECK ("action" = 'legacy_accepted' OR (
    "policyId" IS NOT NULL AND "documentHash" IS NOT NULL AND "eventHash" IS NOT NULL
    AND "eventSequence" > 0 AND "requestId" IS NOT NULL));
ALTER TABLE "PrivacyRequest" ADD CONSTRAINT "PrivacyRequest_status_check"
  CHECK ("status" IN ('received', 'identity_required', 'under_review', 'fulfilled', 'rejected'));
ALTER TABLE "PrivacyRequest" ADD CONSTRAINT "PrivacyRequest_dueAt_check" CHECK ("dueAt" >= "receivedAt");

-- Application credentials must not own these tables or have ALTER/TRUNCATE rights.
-- Retention-based disposal requires the documented, separately authorized DBA process.
CREATE FUNCTION "privacy_evidence_immutable"() RETURNS trigger LANGUAGE plpgsql AS $body$
BEGIN
  -- Preparation must preserve existing cascades for legacy-only clients.
  -- New evidence is protected even if the rollout flag is later disabled.
  IF TG_TABLE_NAME = 'ClientConsentRecord' AND TG_OP = 'DELETE'
    AND to_jsonb(OLD)->>'action' = 'legacy_accepted' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'Privacy evidence is append-only; use the authorized retention process' USING ERRCODE = '55000';
END;
$body$;

CREATE TRIGGER "ClientConsentRecord_immutable" BEFORE UPDATE OR DELETE ON "ClientConsentRecord"
  FOR EACH ROW EXECUTE FUNCTION "privacy_evidence_immutable"();
CREATE TRIGGER "PrivacyPolicy_immutable" BEFORE UPDATE OR DELETE ON "PrivacyPolicy"
  FOR EACH ROW EXECUTE FUNCTION "privacy_evidence_immutable"();
CREATE TRIGGER "PrivacyRequestEvent_immutable" BEFORE UPDATE OR DELETE ON "PrivacyRequestEvent"
  FOR EACH ROW EXECUTE FUNCTION "privacy_evidence_immutable"();
CREATE TRIGGER "PrivacyAuditLog_immutable" BEFORE UPDATE OR DELETE ON "PrivacyAuditLog"
  FOR EACH ROW EXECUTE FUNCTION "privacy_evidence_immutable"();
