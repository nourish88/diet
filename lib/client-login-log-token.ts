import { createHmac, timingSafeEqual } from "node:crypto";

function signature(value: string) {
  const secret = process.env.CLIENT_PHONE_AUTH_SECRET || process.env.SUPABASE_JWT_SECRET;
  return secret ? createHmac("sha256", secret).update(`login-diagnostics:${value}`).digest() : null;
}

export function createClientLoginLogToken(clientId: number) {
  const expires = Date.now() + 60 * 60_000;
  const value = `${clientId}.${expires}`;
  const proof = signature(value);
  return proof ? `${value}.${proof.toString("base64url")}` : undefined;
}

export function verifyClientLoginLogToken(token: string) {
  const [id, expiry, hash, extra] = token.split(".");
  const clientId = Number(id);
  const expires = Number(expiry);
  if (extra !== undefined || !Number.isSafeInteger(clientId) || clientId <= 0 || !Number.isSafeInteger(expires) || expires < Date.now() || !/^[\w-]{43}$/.test(hash ?? "")) return null;
  const expected = signature(`${id}.${expiry}`);
  const actual = Buffer.from(hash, "base64url");
  return expected && actual.length === expected.length && timingSafeEqual(expected, actual) ? clientId : null;
}
