import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), upsert: vi.fn(), history: vi.fn(), retire: vi.fn(), transaction: vi.fn() }));
vi.mock("@/lib/api-auth", () => ({ authenticateRequest: mocks.auth }));
vi.mock("@/lib/env", () => ({ clientEnv: { NEXT_PUBLIC_DEBUG: "0" } }));
vi.mock("@/lib/prisma", () => ({ default: { pushSubscription: { upsert: mocks.upsert, deleteMany: mocks.retire }, notificationLog: { findMany: mocks.history }, $transaction: mocks.transaction } }));
import { POST } from "./route";

const base = { userId: 7, subscription: { endpoint: "https://push.test/target", keys: { auth: "secret", p256dh: "secret" } } };
function send(body: unknown) {
  return POST(new NextRequest("https://diet.test/api/push/subscribe", {
    method: "POST", headers: { "content-type": "application/json", "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36" },
    body: JSON.stringify(body),
  }), { params: Promise.resolve({}) });
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: 7, role: "client" } });
  mocks.upsert.mockResolvedValue({ id: 8 });
  mocks.history.mockResolvedValue([]);
  mocks.transaction.mockImplementation((queries) => Promise.all(queries));
});
describe("subscription diagnostics persistence", () => {
  it("writes normalized metadata on both create and refresh without copying secrets into diagnostics", async () => {
    const response = await send({ ...base, device: { standalone: true, ios: false, permission: "granted", model: "Pixel 9", platformVersion: "15", endpoint: "unexpected-secret" } });
    expect(response.status).toBe(200);
    const saved = mocks.upsert.mock.calls[0][0];
    expect(saved.update.deviceInfo).toEqual(saved.create.deviceInfo);
    expect(saved.create.deviceInfo).toMatchObject({ model: "Pixel 9", osVersion: "15", browser: "Chrome" });
    expect(JSON.stringify(saved.create.deviceInfo)).not.toContain("secret");
  });
  it("saves the replacement and retires only the signed-in user's old endpoint together", async () => {
    expect((await send({ ...base, previousEndpoint: "https://push.test/old" })).status).toBe(200);
    expect(mocks.transaction).toHaveBeenCalledOnce();
    expect(mocks.retire).toHaveBeenCalledWith({ where: { endpoint: "https://push.test/old", userId: 7 } });
  });

  it("recommends repair only after three overdue receipts for the same subscription", async () => {
    const overdue = { receivedAt: null, sentAt: new Date(Date.now() - 3600000) };
    mocks.history.mockResolvedValue([overdue, overdue, overdue]);
    expect((await (await send(base)).json()).data.needsDeliveryCheck).toBe(true);
    expect(mocks.history).toHaveBeenCalledWith(expect.objectContaining({
      take: 3, where: expect.objectContaining({ userId: 7, subscriptionId: 8, status: "success" }),
    }));
    for (const last of [{ ...overdue, receivedAt: new Date() }, { ...overdue, sentAt: new Date() }]) {
      mocks.history.mockResolvedValue([last, overdue, overdue]);
      expect((await (await send(base)).json()).data.needsDeliveryCheck).toBe(false);
    }
    mocks.history.mockRejectedValue(new Error("history unavailable"));
    expect((await send(base)).status).toBe(200);
  });

  it("accepts older clients without diagnostics", async () => {
    expect((await send(base)).status).toBe(200);
    expect(mocks.upsert.mock.calls[0][0].create.deviceInfo.permission).toBeNull();
  });
  it("rejects updates for another user's registration", async () => {
    expect((await send({ ...base, userId: 9 })).status).toBe(403);
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
  it("requires authentication and bounds metadata before persistence", async () => {
    expect((await send({ ...base, device: { standalone: true, ios: false, permission: "granted", model: "x".repeat(121) } })).status).toBe(422);
    expect(mocks.upsert).not.toHaveBeenCalled();
    mocks.auth.mockResolvedValue({ user: null });
    expect((await send(base)).status).toBe(401);
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
});
