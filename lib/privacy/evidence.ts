import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "node:crypto";
export { buildPrivacyDocument } from "./document";

export function canonicalJson(value: unknown): string {
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}
export function evidenceHash(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}
export function fileHash(payload: string): string {
  return createHash("sha256").update(payload, "utf8").digest("hex");
}
export function privateIpHash(headers: Headers): string | null {
  const key = process.env.KVKK_IP_HMAC_KEY;
  if (process.env.KVKK_TRUST_PROXY !== "true" || !key || key.length < 32) return null;
  const ip = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return ip ? createHmac("sha256", key).update(ip).digest("hex") : null;
}
function encryptionKey(): Buffer {
  const key = Buffer.from(process.env.KVKK_REQUEST_ENCRYPTION_KEY ?? "", "base64");
  if (key.length !== 32) throw new Error("KVKK_REQUEST_ENCRYPTION_KEY must contain a base64 encoded 32-byte key");
  return key;
}
export function requestEncryptionReady(): boolean {
  try { encryptionKey(); return true; } catch { return false; }
}
export function encryptIdentity(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), ciphertext.toString("base64")].join(":");
}
export function decryptIdentity(value: string): string {
  const [version, iv, tag, payload] = value.split(":");
  if (version !== "v1") throw new Error("Unsupported identity encryption version");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(payload, "base64")), decipher.final()]).toString("utf8");
}
export function requestDeadline(receivedAt: Date): Date {
  return new Date(receivedAt.getTime() + 30 * 24 * 60 * 60 * 1000);
}
export function csvCell(value: unknown): string {
  let text = value instanceof Date ? value.toISOString() : String(value ?? "");
  if (/^[\s\u0000-\u001f]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}
