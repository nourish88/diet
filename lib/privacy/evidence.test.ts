import { afterEach, describe, expect, it, vi } from "vitest";
import { buildPrivacyDocument, canonicalJson, csvCell, decryptIdentity, encryptIdentity, evidenceHash, fileHash, privateIpHash, requestDeadline, requestEncryptionReady } from "./evidence";
import { ConsentDecisionSchema, PublishPolicySchema } from "./schemas";
import { createHash } from "node:crypto";

const facts = {
  version: "test-v2", controllerName: "Test veri sorumlusu", controllerAddress: "Yalnızca test için örnek tebligat adresi",
  contactEmail: "privacy@example.test", collectionMethods: "Kimliği doğrulanmış portal formu",
  processingDetails: "İletişim verileri; sözleşmenin ifası; KVKK m.5/2(c).",
  recipients: "Yetkili hizmet personeli; hizmet sunumu için sınırlı erişim.",
  internationalTransfers: "Bu test senaryosunda yurt dışı aktarım yapılmaz.",
  retentionPolicy: "Test kayıtları test tamamlandığında imha edilir.", healthDataCategories: "Ağırlık ve beslenme kaydı",
  healthPurpose: "Beslenme planının danışan talebiyle hazırlanması",
  healthLegalBasis: "explicit_consent" as const, healthLegalJustification: "Belirli sağlık verisi kategorileri için ayrı açık rıza.",
  refusalConsequences: "Portal üzerinden yeni sağlık verisi girişi durur; diğer başvuru yolları açıktır.",
  reviewReference: "Test inceleme referansı", reviewed: true as const,
};
afterEach(() => vi.unstubAllEnvs());
describe("privacy evidence", () => {
  it("keeps notice and health consent separate and specific", () => {
    const input = PublishPolicySchema.parse(facts);
    const document = buildPrivacyDocument(input);
    expect(document.noticeText).toContain("Bu metnin sunulması ve okunduğunun kaydı açık rıza değildir.");
    expect(document.consentText).toContain(facts.healthPurpose);
    expect(document.consentText).toContain(facts.healthDataCategories);
    expect(document.noticeText).toContain("en geç 30 gün");
    expect(document.consentText).toContain("geri çekebilirim");
  });
  it("does not seek consent when the confirmed healthcare basis applies", () => {
    const document = buildPrivacyDocument({ ...facts, healthLegalBasis: "healthcare" });
    expect(document.consentText).toBeNull();
    expect(document.noticeText).toContain("KVKK m.6/3(e)");
  });
  it("requires explicit affirmative decisions and rejects the old version-only payload", () => {
    expect(ConsentDecisionSchema.safeParse({ consentVersion: "2026-04-06-v1", channel: "web" }).success).toBe(false);
    expect(ConsentDecisionSchema.safeParse({ policyId: crypto.randomUUID(), documentHash: "a".repeat(64), action: "granted", affirmed: false, requestId: crypto.randomUUID() }).success).toBe(false);
  });
  it("produces identical hashes regardless of object key order and Date serialization", () => {
    const date = new Date("2026-10-04T09:30:00.000Z");
    expect(evidenceHash({ z: date, a: { b: 1, a: null } })).toBe(evidenceHash({ a: { a: null, b: 1 }, z: date.toISOString() }));
    expect(canonicalJson({ z: undefined, a: 1 })).toBe('{"a":1}');
    expect(evidenceHash({ action: "granted" })).not.toBe(evidenceHash({ action: "withdrawn" }));
  });
  it("hashes exported file bytes without adding JSON quoting", () => {
    const payload = "\uFEFF\"tarih\"\r\n\"2026-10-04\"";
    expect(fileHash(payload)).toBe(createHash("sha256").update(payload).digest("hex"));
  });
  it.each(["=1+1", " +cmd", "@SUM(1)", "-2+1", "\t=cmd", "\rmalicious"]) ("neutralizes spreadsheet formula input %j", value => {
    expect(csvCell(value)).toMatch(/^"'/);
  });
  it("escapes quoted multiline data without corrupting normal values", () => {
    expect(csvCell('Örnek "metin"\nSatır')).toBe('"Örnek ""metin""\nSatır"');
    expect(csvCell(123)).toBe('"123"');
  });
  it("never records an IP unless both a trusted proxy and a secret are configured", () => {
    vi.stubEnv("KVKK_TRUST_PROXY", "false"); vi.stubEnv("KVKK_IP_HMAC_KEY", "k".repeat(32));
    const headers = new Headers({ "x-forwarded-for": "192.0.2.1, 192.0.2.2" });
    expect(privateIpHash(headers)).toBeNull();
    vi.stubEnv("KVKK_TRUST_PROXY", "true");
    const first = privateIpHash(headers);
    expect(first).toHaveLength(64);
    vi.stubEnv("KVKK_IP_HMAC_KEY", "j".repeat(32));
    expect(privateIpHash(headers)).not.toBe(first);
  });
  it("encrypts identity with fresh nonces and rejects ciphertext tampering", () => {
    vi.stubEnv("KVKK_REQUEST_ENCRYPTION_KEY", Buffer.alloc(32, 7).toString("base64"));
    const first = encryptIdentity("TESTPASSPORT42"); const second = encryptIdentity("TESTPASSPORT42");
    expect(first).not.toBe(second); expect(first).not.toContain("TESTPASSPORT42");
    expect(decryptIdentity(first)).toBe("TESTPASSPORT42");
    const parts = first.split(":"); parts[3] = Buffer.from("tampered").toString("base64");
    expect(() => decryptIdentity(parts.join(":"))).toThrow();
  });
  it("fails closed for missing encryption configuration", () => {
    vi.stubEnv("KVKK_REQUEST_ENCRYPTION_KEY", "");
    expect(requestEncryptionReady()).toBe(false);
    expect(() => encryptIdentity("test")).toThrow();
  });
  it("calculates the thirty-day deadline across a month boundary", () => {
    expect(requestDeadline(new Date("2026-12-15T10:00:00.000Z")).toISOString()).toBe("2027-01-14T10:00:00.000Z");
  });
});
