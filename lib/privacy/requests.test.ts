import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(), findClient: vi.fn(), findRequest: vi.fn(), updateRequest: vi.fn(), createEvent: vi.fn(), audit: vi.fn(), broadcast: vi.fn(), transaction: vi.fn(), query: vi.fn(),
}));
vi.mock("@/lib/api-auth", () => ({ authenticateRequest: mocks.auth }));
vi.mock("@/lib/logger", () => ({ createLogger: () => ({ error: vi.fn() }) }));
const database = {
  client: { findUnique: mocks.findClient },
  privacyRequest: { findFirst: mocks.findRequest, update: mocks.updateRequest },
  privacyRequestEvent: { create: mocks.createEvent }, privacyAuditLog: { create: mocks.audit },
  broadcastMessage: { create: mocks.broadcast }, $transaction: mocks.transaction, $queryRaw: mocks.query,
};
vi.mock("@/lib/prisma", () => ({ default: {
  client: { findUnique: mocks.findClient }, privacyRequest: { findFirst: mocks.findRequest, update: mocks.updateRequest },
  privacyRequestEvent: { create: mocks.createEvent }, privacyAuditLog: { create: mocks.audit },
  broadcastMessage: { create: mocks.broadcast }, $transaction: mocks.transaction, $queryRaw: mocks.query,
} }));
import { GET, PATCH } from "@/app/api/privacy/requests/[id]/route";
import { encryptIdentity } from "./evidence";

const requestId = randomUUID();
const ctx = { params: Promise.resolve({ id: requestId }) };
beforeEach(() => {
  vi.stubEnv("KVKK_PRIVACY_V2_ENABLED", "true");
  vi.resetAllMocks();
  vi.stubEnv("KVKK_REQUEST_ENCRYPTION_KEY", Buffer.alloc(32, 1).toString("base64"));
  mocks.auth.mockResolvedValue({ user: { id: 9, role: "dietitian" }, authType: "supabase" });
  mocks.findRequest.mockResolvedValue({ id: requestId, clientId: 12, dietitianId: 9, userId: 4, kind: "erasure", verifiedAt: null, respondedAt: null, receivedAt: new Date("2026-10-04T12:00:00Z"), dueAt: new Date("2026-11-03T12:00:00Z"), identityCiphertext: encryptIdentity("TESTPASSPORT42") });
  mocks.findClient.mockResolvedValue({ name: "Test", surname: "Danışan" });
  mocks.transaction.mockImplementation(fn => fn(database));
  mocks.updateRequest.mockResolvedValue({ id: requestId, status: "under_review" });
});
function patch(body: unknown) {
  return PATCH(new NextRequest(`http://localhost/api/privacy/requests/${requestId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }), ctx);
}
describe("privacy request handling", () => {
  it("refuses fulfillment before identity verification", async () => {
    const response = await patch({ status: "fulfilled", message: "İşlem tamamlandı, detayları aşağıda.", completionReference: "imha-001" });
    expect(response.status).toBe(400); expect(mocks.updateRequest).not.toHaveBeenCalled();
  });
  it("requires actual disposal evidence before completing erasure", async () => {
    const response = await patch({ status: "fulfilled", identityVerified: true, message: "İmha işlemi değerlendirildi." });
    expect(response.status).toBe(400); expect(mocks.createEvent).not.toHaveBeenCalled();
  });
  it("keeps the original deadline while awaiting identity information", async () => {
    const response = await patch({ status: "identity_required", message: "Kimliğinizi güvenilir bir yöntemle doğrulamamız gerekiyor." });
    expect(response.status).toBe(200);
    const data = mocks.updateRequest.mock.calls[0][0].data;
    expect(data).toEqual({ status: "identity_required" });
    expect(data).not.toHaveProperty("dueAt"); expect(data).not.toHaveProperty("receivedAt");
  });
  it("records the final written answer, verification and private inbox notification together", async () => {
    const response = await patch({ status: "fulfilled", identityVerified: true, message: "Talebinizin gereği yerine getirildi.", completionReference: "imha-001: saklama dayanağı olmayan kayıtlar ve alıcı bildirimleri" });
    expect(response.status).toBe(200);
    expect(mocks.createEvent.mock.calls[0][0].data.message).toContain("imha-001");
    expect(mocks.updateRequest.mock.calls[0][0].data.respondedAt).toBeInstanceOf(Date);
    expect(mocks.updateRequest.mock.calls[0][0].data.verifiedAt).toBeInstanceOf(Date);
    expect(mocks.broadcast.mock.calls[0][0].data.message).not.toContain("imha-001");
    expect(mocks.broadcast.mock.calls[0][0].data.recipients.create.clientId).toBe(12);
  });
  it("does not overwrite a final response", async () => {
    mocks.findRequest.mockResolvedValue({ id: requestId, respondedAt: new Date() });
    const response = await patch({ status: "under_review", message: "Cevabı yeniden incelemeye alıyoruz." });
    expect(response.status).toBe(409); expect(mocks.updateRequest).not.toHaveBeenCalled();
  });
  it("scopes identity access to the owner and audits disclosure", async () => {
    const response = await GET(new NextRequest(`http://localhost/api/privacy/requests/${requestId}`), ctx);
    expect(response.status).toBe(200);
    expect(mocks.findRequest.mock.calls[0][0].where).toEqual({ id: requestId, dietitianId: 9 });
    const body = await response.json();
    expect(body.data.request.identityNumber).toBe("TESTPASSPORT42");
    expect(body.data.request).not.toHaveProperty("identityCiphertext");
    expect(mocks.audit.mock.calls[0][0].data.action).toBe("request_identity_viewed");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
  it("returns no identity information for another controller's request", async () => {
    mocks.findRequest.mockResolvedValue(null);
    const response = await GET(new NextRequest(`http://localhost/api/privacy/requests/${requestId}`), ctx);
    expect(response.status).toBe(404); expect(mocks.audit).not.toHaveBeenCalled();
  });
});
