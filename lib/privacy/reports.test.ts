import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(), count: vi.fn(), audit: vi.fn(), transaction: vi.fn(), authenticate: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ default: {
  clientConsentRecord: { findMany: mocks.findMany, count: mocks.count },
  privacyAuditLog: { create: mocks.audit }, $transaction: mocks.transaction,
} }));
vi.mock("@/lib/api-auth", () => ({ authenticateRequest: mocks.authenticate }));
vi.mock("@/lib/logger", () => ({ createLogger: () => ({ error: vi.fn() }) }));
import { GET } from "@/app/api/consents/route";
import { consentReport } from "./reports";
import type { AuthResult } from "@/lib/api-auth";
import { evidenceHash, fileHash } from "./evidence";

const auth = { user: { id: 9, role: "dietitian" }, authType: "supabase" } as AuthResult;
const policy = { id: "policy", version: "v2", healthLegalBasis: "explicit_consent", document: { noticeText: "Ayrı aydınlatma metni", consentText: "Belirli amaç için rıza" }, documentHash: "" };
policy.documentHash = evidenceHash({ version: policy.version, healthLegalBasis: policy.healthLegalBasis, document: policy.document });
function record(action = "granted") {
  const data = { clientId: 12, userId: 4, consentVersion: policy.version, consentType: "health_processing", acceptedAt: new Date("2026-10-04T09:00:00.000Z"), channel: "web", userAgent: null, ipHash: null,
    action, policyId: policy.id, documentHash: policy.documentHash, eventSequence: 2, previousHash: "a".repeat(64), requestId: "request" };
  return { id: 3, ...data, eventHash: evidenceHash(data), client: { name: "=FORMULA", surname: "Test" }, policy };
}
beforeEach(() => {
  vi.stubEnv("KVKK_PRIVACY_V2_ENABLED", "true");
  vi.resetAllMocks(); mocks.authenticate.mockResolvedValue(auth);
  mocks.findMany.mockResolvedValue([record()]); mocks.count.mockResolvedValue(1);
  mocks.transaction.mockImplementation(promises => Promise.all(promises));
});
describe("KVKK audit reports", () => {
  it("preserves exact JSON file bytes, authentication, download headers and stored hash", async () => {
    const response = await GET(new NextRequest("http://localhost/api/consents?format=json"), { params: Promise.resolve({}) });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toContain("attachment;");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    const payload = await response.text();
    const report = JSON.parse(payload);
    expect(report).not.toHaveProperty("data");
    expect(report.policies[0].document.noticeText).toBe(policy.document.noticeText);
    expect(report.records[0].evidenceStatus).toBe("hash_verified");
    expect(response.headers.get("x-report-hash")).toBe(fileHash(payload));
    expect(mocks.audit.mock.calls[0][0].data).toMatchObject({ actorId: 9, rowCount: 1, payloadHash: fileHash(payload) });
  });
  it("scopes all queries to the current owner and paginates views", async () => {
    await consentReport(new NextRequest("http://localhost/api/consents?search=Test%20Name&page=2&pageSize=20"), auth);
    const query = mocks.findMany.mock.calls[0][0];
    expect(query.where.client.dietitianId).toBe(9);
    expect(query.where.client.AND).toHaveLength(2);
    expect(query).toMatchObject({ take: 20, skip: 20 });
  });
  it("marks legacy records honestly and detects changed decision evidence", async () => {
    const changed = { ...record(), action: "withdrawn" };
    const legacy = { ...record(), eventHash: null, policy: null, policyId: null };
    mocks.findMany.mockResolvedValue([changed, legacy]); mocks.count.mockResolvedValue(2);
    const response = await consentReport(new NextRequest("http://localhost/api/consents"), auth);
    const json = await response.json();
    expect(json.data.records.map(row => row.evidenceStatus)).toEqual(["integrity_mismatch", "legacy_no_document_snapshot"]);
  });
  it("exports safe spreadsheet cells and the exact accepted notice", async () => {
    const response = await consentReport(new NextRequest("http://localhost/api/consents?format=csv"), auth);
    const csv = await response.text();
    expect(csv).toContain("'\u003dFORMULA Test");
    expect(csv).toContain(policy.document.noticeText);
    expect(csv).toContain("2026-10-04T09:00:00.000Z");
  });
  it("rejects oversized exports instead of silently omitting evidence", async () => {
    mocks.findMany.mockResolvedValue(Array.from({ length: 10001 }, () => record()));
    await expect(consentReport(new NextRequest("http://localhost/api/consents?format=csv"), auth)).rejects.toMatchObject({ code: "bad_request" });
    expect(mocks.audit).not.toHaveBeenCalled();
  });
  it.each(["page=-1", "pageSize=101", "from=invalid", "format=pdf", "from=2026-10-04T00:00:00.000Z&to=2026-10-03T00:00:00.000Z"])("rejects invalid filters: %s", async query => {
    await expect(consentReport(new NextRequest(`http://localhost/api/consents?${query}`), auth)).rejects.toMatchObject({ code: "bad_request" });
  });
  it("denies assistant reports before querying any evidence", async () => {
    mocks.authenticate.mockResolvedValue({ ...auth, user: { ...auth.user!, isAssistant: true } });
    const response = await GET(new NextRequest("http://localhost/api/consents?format=json"), { params: Promise.resolve({}) });
    expect(response.status).toBe(403); expect(mocks.findMany).not.toHaveBeenCalled();
  });
});
