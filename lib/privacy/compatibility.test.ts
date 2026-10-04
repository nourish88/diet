import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(), ownClient: vi.fn(), clientFind: vi.fn(), clientUpdate: vi.fn(), clientDelete: vi.fn(),
  records: vi.fn(), recordCount: vi.fn(), execute: vi.fn(), transaction: vi.fn(),
  policyFind: vi.fn(), requests: vi.fn(),
}));
vi.mock("@/lib/api-auth", () => ({ authenticateRequest: mocks.auth, requireOwnClient: mocks.ownClient }));
vi.mock("@/lib/logger", () => ({ createLogger: () => ({ error: vi.fn() }) }));
vi.mock("@/lib/prisma", () => ({ default: {
  client: { findUnique: mocks.clientFind, update: mocks.clientUpdate, delete: mocks.clientDelete },
  clientConsentRecord: { findMany: mocks.records, count: mocks.recordCount },
  privacyPolicy: { findMany: mocks.policyFind }, privacyRequest: { findMany: mocks.requests },
  $executeRaw: mocks.execute, $transaction: mocks.transaction,
} }));

import { GET as status, POST as accept } from "@/app/api/client/consent/kvkk/route";
import { GET as report } from "@/app/api/consents/route";
import { GET as clientReport } from "@/app/api/clients/[id]/consents/route";
import { DELETE as deleteClient, PATCH as patchClient } from "@/app/api/clients/[id]/route";
import { GET as policies } from "@/app/api/privacy/policies/route";
import { GET as ownRequests } from "@/app/api/client/privacy/requests/route";
import { assertPortalHealthProcessing } from "./service";
import { privacyV2Enabled } from "./rollout";
import { KVKK_PORTAL_CONSENT_VERSION } from "@/lib/kvkk-consent-config";

const emptyContext = { params: Promise.resolve({}) };
const clientContext = { params: Promise.resolve({ id: "12" }) };
const clientAuth = { user: { id: 4, role: "client", isApproved: true }, authType: "supabase" };
const ownerAuth = { user: { id: 9, role: "dietitian", isApproved: true }, authType: "supabase" };
function request(path: string, body?: unknown, method = "POST") {
  return new NextRequest(`http://localhost/api/${path}`, body === undefined ? undefined : {
    method, headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  });
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("KVKK_PRIVACY_V2_ENABLED", undefined);
  mocks.auth.mockResolvedValue(clientAuth);
  mocks.ownClient.mockResolvedValue(true);
  mocks.clientFind.mockResolvedValue({ id: 12, kvkkPortalConsentAt: new Date(), kvkkPortalConsentVersion: KVKK_PORTAL_CONSENT_VERSION });
  mocks.policyFind.mockRejectedValue(new Prisma.PrismaClientKnownRequestError("Table does not exist", { code: "P2021", clientVersion: "6.5.0" }));
  mocks.requests.mockRejectedValue(new Error("Table does not exist"));
  mocks.recordCount.mockRejectedValue(new Error("Unexpected evidence query"));
  mocks.records.mockResolvedValue([{ id: 1, clientId: 12, consentVersion: KVKK_PORTAL_CONSENT_VERSION,
    consentType: "portal_kvkk_and_health_processing", acceptedAt: new Date("2026-04-06T09:00:00Z"), channel: "mobile", userId: 4, ipHash: null, userAgent: null, client: { name: "Test", surname: "Client" } }]);
  mocks.transaction.mockImplementation(fn => fn({ client: { findUnique: mocks.clientFind, update: mocks.clientUpdate }, $executeRaw: mocks.execute }));
});

describe("KVKK rollout backwards compatibility", () => {
  it("requires the exact opt-in setting", () => {
    expect(privacyV2Enabled()).toBe(false);
    for (const value of ["false", "TRUE", "1", ""]) {
      vi.stubEnv("KVKK_PRIVACY_V2_ENABLED", value); expect(privacyV2Enabled()).toBe(false);
    }
    vi.stubEnv("KVKK_PRIVACY_V2_ENABLED", "true"); expect(privacyV2Enabled()).toBe(true);
  });
  it("does not add database checks to existing health writes while disabled", async () => {
    await expect(assertPortalHealthProcessing(4)).resolves.toBeUndefined();
    expect(mocks.clientFind).not.toHaveBeenCalled(); expect(mocks.policyFind).not.toHaveBeenCalled();
  });
  it("reads the current consent without referencing any new columns", async () => {
    const response = await status(request("client/consent/kvkk"), emptyContext);
    expect(response.status).toBe(200);
    expect((await response.json()).data).toMatchObject({ mode: "legacy", noticeAcknowledged: true, canProcessHealth: true });
    expect(mocks.clientFind.mock.calls[0][0]).toEqual({ where: { userId: 4 }, select: { id: true, kvkkPortalConsentAt: true, kvkkPortalConsentVersion: true } });
    expect(mocks.records).not.toHaveBeenCalled();
  });
  it("still requests the original consent when its version is missing", async () => {
    mocks.clientFind.mockResolvedValue({ id: 12, kvkkPortalConsentAt: null, kvkkPortalConsentVersion: null });
    const response = await status(request("client/consent/kvkk"), emptyContext);
    expect((await response.json()).data).toMatchObject({ mode: "legacy", noticeAcknowledged: false });
  });
  it("accepts the original mobile request and response contract before migration", async () => {
    const response = await accept(request("client/consent/kvkk", { consentVersion: KVKK_PORTAL_CONSENT_VERSION, channel: "mobile" }), emptyContext);
    expect(response.status).toBe(200);
    expect((await response.json()).data).toEqual({ success: true, version: KVKK_PORTAL_CONSENT_VERSION });
    const [strings, ...values] = mocks.execute.mock.calls[0];
    expect(strings.join("?")).toBe('INSERT INTO "ClientConsentRecord" ("clientId", "userId", "consentVersion", "consentType", "acceptedAt", "channel", "userAgent", "ipHash") VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    expect(values.slice(0, 4)).toEqual([12, 4, KVKK_PORTAL_CONSENT_VERSION, "portal_kvkk_and_health_processing"]);
    expect(values[5]).toBe("mobile");
    expect(mocks.clientUpdate.mock.calls[0][0]).toMatchObject({ select: { id: true }, data: { kvkkPortalConsentVersion: KVKK_PORTAL_CONSENT_VERSION } });
  });
  it("retains web as the default channel", async () => {
    expect((await accept(request("client/consent/kvkk", { consentVersion: KVKK_PORTAL_CONSENT_VERSION }), emptyContext)).status).toBe(200);
    expect(mocks.execute.mock.calls[0][6]).toBe("web");
  });
  it("retains the approval requirement without any writes", async () => {
    mocks.auth.mockResolvedValue({ ...clientAuth, user: { ...clientAuth.user, isApproved: false } });
    expect((await accept(request("client/consent/kvkk", { consentVersion: KVKK_PORTAL_CONSENT_VERSION }), emptyContext)).status).toBe(403);
    expect(mocks.execute).not.toHaveBeenCalled();
  });
  it("rejects a different legacy version without writing", async () => {
    expect((await accept(request("client/consent/kvkk", { consentVersion: "different" }), emptyContext)).status).toBe(400);
    expect(mocks.execute).not.toHaveBeenCalled();
  });
  it("retains legacy assistant reporting without querying new evidence columns", async () => {
    mocks.auth.mockResolvedValue({ ...ownerAuth, user: { ...ownerAuth.user, isAssistant: true } });
    const response = await report(request("consents"), emptyContext);
    expect(response.status).toBe(200);
    expect((await response.json()).data.records[0]).toMatchObject({ id: 1, channel: "mobile", clientName: "Test Client" });
    const query = mocks.records.mock.calls[0][0];
    expect(query.where.client.dietitianId).toBe(9);
    expect(Object.keys(query.select).sort()).toEqual(["acceptedAt", "channel", "client", "clientId", "consentType", "consentVersion", "id", "ipHash", "userAgent", "userId"].sort());
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("preserves the CSV filename and columns for existing client downloads", async () => {
    mocks.auth.mockResolvedValue({ ...ownerAuth, authType: "api-key" });
    const response = await clientReport(request("clients/12/consents?format=csv"), clientContext);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toBe('attachment; filename="client-12-kvkk-consents.csv"');
    expect(response.headers.get("access-control-allow-origin")).toBeTruthy();
    expect((await response.text()).split("\n")[0]).toBe("id,consentVersion,consentType,acceptedAt,channel,userId,ipHash,userAgent");
  });
  it("applies date filters to legacy records too", async () => {
    mocks.auth.mockResolvedValue(ownerAuth);
    await report(request("consents?from=2026-04-01T00:00:00Z&to=2026-05-01T00:00:00Z&page=2&pageSize=20"), emptyContext);
    expect(mocks.records.mock.calls[0][0].where.acceptedAt).toEqual({ gte: new Date("2026-04-01T00:00:00Z"), lte: new Date("2026-05-01T00:00:00Z") });
  });
  it("keeps existing deletion independent of the new request tables", async () => {
    mocks.auth.mockResolvedValue(ownerAuth);
    expect((await deleteClient(request("clients/12"), clientContext)).status).toBe(200);
    expect(mocks.clientDelete).toHaveBeenCalledWith({ where: { id: 12 } });
    expect(mocks.recordCount).not.toHaveBeenCalled();
  });
  it("allows current profile edits and protects consent and ownership fields", async () => {
    mocks.auth.mockResolvedValue(ownerAuth);
    const response = await patchClient(request("clients/12", { name: "Updated", surname: "Client", illness: "Existing note", gender: 1, isActive: true, isOnline: true, kvkkPortalConsentAt: "forged", userId: 200, dietitianId: 200 }, "PATCH"), clientContext);
    expect(response.status).toBe(200);
    expect(mocks.clientUpdate.mock.calls[0][0].data).toEqual({ name: "Updated", surname: "Client", illness: "Existing note", gender: 1, isActive: true, isOnline: true });
  });
  it("shows preparation instead of a server error when migration is absent", async () => {
    mocks.auth.mockResolvedValue(ownerAuth);
    const response = await policies(request("privacy/policies"), emptyContext);
    expect(response.status).toBe(200);
    expect((await response.json()).data).toMatchObject({ schemaReady: false, managedEnabled: false, policies: [] });
  });
  it("does not conceal unrelated preparation errors", async () => {
    mocks.auth.mockResolvedValue(ownerAuth); mocks.policyFind.mockRejectedValue(new Error("Database connection failed"));
    expect((await policies(request("privacy/policies"), emptyContext)).status).toBe(500);
  });
  it("never falls back to legacy consent after explicit activation", async () => {
    vi.stubEnv("KVKK_PRIVACY_V2_ENABLED", "true");
    expect((await accept(request("client/consent/kvkk", { consentVersion: KVKK_PORTAL_CONSENT_VERSION, channel: "mobile" }), emptyContext)).status).toBe(422);
    expect(mocks.execute).not.toHaveBeenCalled();
    mocks.auth.mockResolvedValue(ownerAuth);
    expect((await policies(request("privacy/policies"), emptyContext)).status).toBe(500);
  });
  it("does not touch nonexistent rights tables while preparing", async () => {
    const response = await ownRequests(request("client/privacy/requests"), emptyContext);
    expect(response.status).toBe(200);
    expect((await response.json()).data).toMatchObject({ requests: [], requestEncryptionReady: false });
    expect(mocks.requests).not.toHaveBeenCalled();
    expect(mocks.clientFind).not.toHaveBeenCalled();
  });
});
