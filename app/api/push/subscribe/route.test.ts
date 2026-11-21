import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), upsert: vi.fn() }));
vi.mock("@/lib/api-auth", () => ({ authenticateRequest: mocks.auth }));
vi.mock("@/lib/env", () => ({ clientEnv: { NEXT_PUBLIC_DEBUG: "0" } }));
vi.mock("@/lib/prisma", () => ({ default: { pushSubscription: { upsert: mocks.upsert } } }));
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
