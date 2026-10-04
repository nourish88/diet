import { beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";

const db = vi.hoisted(() => ({
  client: { findUnique: vi.fn(), update: vi.fn() },
  privacyPolicy: { findFirst: vi.fn() },
  clientConsentRecord: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
  $queryRaw: vi.fn(), $transaction: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ default: db }));
vi.mock("@/lib/logger", () => ({ createLogger: () => ({ error: vi.fn() }) }));
vi.mock("@/lib/api-auth", () => ({ authenticateRequest: vi.fn() }));
import { assertPortalHealthProcessing, privacyState, recordPrivacyDecision, requirePrivacyOwner } from "./service";
import type { AuthResult } from "@/lib/api-auth";
import { evidenceHash } from "./evidence";

const policy = { id: "10000000-0000-4000-8000-000000000001", dietitianId: 9, version: "test-v2", healthLegalBasis: "explicit_consent", documentHash: "a".repeat(64) };
const payload = () => ({ policyId: policy.id, documentHash: policy.documentHash, action: "granted" as const, affirmed: true as const, requestId: randomUUID(), channel: "web" as const });
beforeEach(() => {
  vi.stubEnv("KVKK_PRIVACY_V2_ENABLED", "true");
  vi.resetAllMocks();
  db.$transaction.mockImplementation(fn => fn(db));
  db.client.findUnique.mockResolvedValue({ id: 12, dietitianId: 9 });
  db.privacyPolicy.findFirst.mockResolvedValue(policy);
  db.clientConsentRecord.findUnique.mockResolvedValue(null);
  db.clientConsentRecord.create.mockImplementation(async ({ data }) => ({ id: 77, ...data }));
  db.clientConsentRecord.findFirst.mockImplementation(async ({ where }) => where.action === "notice_acknowledged" ? { id: 1 } : null);
});
describe("privacy decisions and authorization", () => {
  it("never treats a legacy summary as a current lawful basis", async () => {
    db.clientConsentRecord.findFirst.mockResolvedValue(null);
    expect(await privacyState(12, policy as never)).toMatchObject({ noticeAcknowledged: false, canProcessHealth: false });
    await expect(assertPortalHealthProcessing(4)).rejects.toMatchObject({ code: "forbidden" });
  });
  it("rejects a grant until the separate notice was acknowledged", async () => {
    db.clientConsentRecord.findFirst.mockResolvedValue(null);
    await expect(recordPrivacyDecision(4, payload(), new Headers())).rejects.toMatchObject({ code: "bad_request" });
    expect(db.clientConsentRecord.create).not.toHaveBeenCalled();
  });
  it("rejects stale policy identifiers and tampered document hashes", async () => {
    await expect(recordPrivacyDecision(4, { ...payload(), policyId: randomUUID() }, new Headers())).rejects.toMatchObject({ code: "conflict" });
    await expect(recordPrivacyDecision(4, { ...payload(), documentHash: "b".repeat(64) }, new Headers())).rejects.toMatchObject({ code: "conflict" });
  });
  it("records a bound event and updates the summary at the identical server time", async () => {
    await recordPrivacyDecision(4, payload(), new Headers({ "user-agent": "x".repeat(500) }));
    const data = db.clientConsentRecord.create.mock.calls[0][0].data;
    expect(data.userId).toBe(4); expect(data.clientId).toBe(12);
    expect(data.userAgent).toHaveLength(256); expect(data.ipHash).toBeNull();
    const { eventHash, ...evidence } = data;
    expect(eventHash).toBe(evidenceHash(evidence));
    expect(db.client.update.mock.calls[0][0].data.kvkkPortalConsentAt).toBe(data.acceptedAt);
    expect(db.$queryRaw).toHaveBeenCalledTimes(2);
  });
  it("replays the same request without creating duplicate evidence", async () => {
    const body = payload();
    db.clientConsentRecord.findUnique.mockResolvedValue({ id: 22, action: body.action, policyId: body.policyId, documentHash: body.documentHash });
    expect(await recordPrivacyDecision(4, body, new Headers())).toMatchObject({ recordId: 22, replayed: true });
    expect(db.clientConsentRecord.create).not.toHaveBeenCalled();
  });
  it("does not allow an idempotency key to change its meaning", async () => {
    db.clientConsentRecord.findUnique.mockResolvedValue({ id: 22, action: "declined", policyId: policy.id, documentHash: policy.documentHash });
    await expect(recordPrivacyDecision(4, payload(), new Headers())).rejects.toMatchObject({ code: "conflict" });
  });
  it("withdraws active consent and preserves the earlier event in a hash chain", async () => {
    db.clientConsentRecord.findFirst.mockImplementation(async ({ where }) => where.action ? { id: 1 } : where.eventSequence ? { eventSequence: 3, eventHash: "previous" } : { action: "granted" });
    await recordPrivacyDecision(4, { ...payload(), action: "withdrawn" }, new Headers());
    const data = db.clientConsentRecord.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ action: "withdrawn", previousHash: "previous", eventSequence: 4 });
    expect(db.client.update.mock.calls[0][0].data).toEqual({ kvkkPortalConsentAt: null, kvkkPortalConsentVersion: null });
  });
  it.each(["declined", "withdrawn"])("stops new health writes after %s", async action => {
    db.clientConsentRecord.findFirst.mockImplementation(async ({ where }) => where.action ? { id: 1 } : { action });
    await expect(assertPortalHealthProcessing(4)).rejects.toMatchObject({ code: "forbidden" });
  });
  it("allows documented healthcare processing without asking for consent", async () => {
    db.privacyPolicy.findFirst.mockResolvedValue({ ...policy, healthLegalBasis: "healthcare" });
    await expect(assertPortalHealthProcessing(4)).resolves.toBeUndefined();
    await expect(recordPrivacyDecision(4, payload(), new Headers())).rejects.toMatchObject({ code: "bad_request" });
  });
  it("rejects a withdrawal without an active grant", async () => {
    await expect(recordPrivacyDecision(4, { ...payload(), action: "withdrawn" }, new Headers())).rejects.toMatchObject({ code: "conflict" });
  });
  it("does not activate health processing when no policy has been published", async () => {
    db.privacyPolicy.findFirst.mockResolvedValue(null);
    await expect(assertPortalHealthProcessing(4)).rejects.toMatchObject({ code: "forbidden" });
  });
  it("restricts reports to a personal owner session, excluding assistants and API keys", () => {
    const auth = { user: { id: 9, role: "dietitian" }, authType: "supabase" } as AuthResult;
    expect(requirePrivacyOwner(auth)).toBe(9);
    expect(() => requirePrivacyOwner({ ...auth, user: { ...auth.user!, isAssistant: true } })).toThrow();
    expect(() => requirePrivacyOwner({ ...auth, authType: "api-key" })).toThrow();
    expect(() => requirePrivacyOwner({ ...auth, user: { ...auth.user!, role: "client" } })).toThrow();
  });
});
