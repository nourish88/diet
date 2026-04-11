import { createHash } from "crypto";
import { normalizeClientPhoneNumber } from "@/lib/phone-normalize";

const PHONE_AUTH_SECRET =
  process.env.CLIENT_PHONE_AUTH_SECRET || "fallback-client-phone-auth-secret";

export { normalizeClientPhoneNumber };

export function buildClientPhoneCredentials(normalizedPhone: string): {
  email: string;
  password: string;
} {
  const idHash = createHash("sha256")
    .update(`id:${normalizedPhone}:${PHONE_AUTH_SECRET}`)
    .digest("hex")
    .slice(0, 24);

  const passwordHash = createHash("sha256")
    .update(`pw:${normalizedPhone}:${PHONE_AUTH_SECRET}`)
    .digest("hex");

  return {
    email: `client.${idHash}@phone-login.local`,
    password: `Pw!${passwordHash.slice(0, 20)}`,
  };
}
