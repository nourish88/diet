CREATE TABLE "DietShareLink" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "dietId" INTEGER NOT NULL,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastAccessedAt" TIMESTAMP(3),

    CONSTRAINT "DietShareLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DietShareLink_token_key" ON "DietShareLink"("token");
CREATE UNIQUE INDEX "DietShareLink_dietId_key" ON "DietShareLink"("dietId");
CREATE INDEX "DietShareLink_dietId_idx" ON "DietShareLink"("dietId");
CREATE INDEX "DietShareLink_createdById_idx" ON "DietShareLink"("createdById");

ALTER TABLE "DietShareLink"
ADD CONSTRAINT "DietShareLink_dietId_fkey"
FOREIGN KEY ("dietId") REFERENCES "Diet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DietShareLink"
ADD CONSTRAINT "DietShareLink_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
