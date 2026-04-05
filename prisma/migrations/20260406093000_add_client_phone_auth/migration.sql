ALTER TABLE "Client" DROP CONSTRAINT IF EXISTS "Client_phoneNumber_key";

CREATE TABLE "ClientPhoneAuth" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "phoneRaw" TEXT NOT NULL,
    "phoneNormalized" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientPhoneAuth_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClientPhoneAuth_clientId_key" ON "ClientPhoneAuth"("clientId");
CREATE INDEX "ClientPhoneAuth_phoneNormalized_idx" ON "ClientPhoneAuth"("phoneNormalized");

ALTER TABLE "ClientPhoneAuth"
ADD CONSTRAINT "ClientPhoneAuth_clientId_fkey"
FOREIGN KEY ("clientId") REFERENCES "Client"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Best-effort backfill for existing valid Turkish mobile numbers
WITH normalized AS (
  SELECT
    c."id" AS "clientId",
    c."phoneNumber" AS "phoneRaw",
    regexp_replace(COALESCE(c."phoneNumber", ''), '[^0-9]', '', 'g') AS digits
  FROM "Client" c
  WHERE c."phoneNumber" IS NOT NULL
    AND btrim(c."phoneNumber") <> ''
), transformed AS (
  SELECT
    "clientId",
    "phoneRaw",
    CASE
      WHEN length(digits) = 10 AND left(digits, 1) = '5' THEN '+90' || digits
      WHEN length(digits) = 11 AND left(digits, 1) = '0' AND substring(digits, 2, 1) = '5' THEN '+90' || substring(digits, 2)
      WHEN length(digits) = 12 AND left(digits, 2) = '90' AND substring(digits, 3, 1) = '5' THEN '+' || digits
      ELSE NULL
    END AS "phoneNormalized"
  FROM normalized
)
INSERT INTO "ClientPhoneAuth" ("clientId", "phoneRaw", "phoneNormalized", "createdAt", "updatedAt")
SELECT
  t."clientId",
  t."phoneRaw",
  t."phoneNormalized",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM transformed t
WHERE t."phoneNormalized" IS NOT NULL
  AND t."phoneNormalized" !~ '^\+90([0-9])\1{9}$'
ON CONFLICT ("clientId") DO NOTHING;
