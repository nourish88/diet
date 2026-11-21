import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  findOgun: vi.fn(), findClients: vi.fn(), deleteLogs: vi.fn(), createLog: vi.fn(), updateLog: vi.fn(), deleteSubscription: vi.fn(), send: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ default: {
  ogun: { findUnique: mocks.findOgun },
  client: { findMany: mocks.findClients },
  notificationLog: { create: mocks.createLog, update: mocks.updateLog, deleteMany: mocks.deleteLogs },
  pushSubscription: { delete: mocks.deleteSubscription },
} }));
vi.mock("@/lib/web-push", () => ({ isWebPushConfigured: () => true, sendWebPushNotification: mocks.send }));
import { sendMealReminderForOgun, sendMealReminders } from "./MealReminderService";

const deviceInfo = {
  os: "Android", osVersion: "14", browser: "Chrome", browserVersion: "142", model: "Pixel 8",
  standalone: true, permission: "granted", capturedAt: "2026-11-17T08:00:00Z",
};
beforeEach(() => {
  vi.resetAllMocks();
  mocks.createLog.mockResolvedValue({ id: 91 });
  mocks.updateLog.mockResolvedValue({});
  mocks.deleteSubscription.mockResolvedValue({});
  mocks.findOgun.mockResolvedValue({
    id: 3, name: "Öğle", time: "12:00", detail: null, items: [],
    diet: { id: 2, tarih: new Date("2026-11-17"), client: {
      id: 4, name: "Test", surname: "Danışan", user: { id: 5, pushSubscriptions: [
        { id: 7, endpoint: "https://example.com/private-endpoint", auth: "secret-auth", p256dh: "secret-key", deviceInfo },
      ] },
    } },
  });
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
describe("notification target snapshots", () => {
  it("preserves each device through scheduled reminder grouping", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-17T09:00:00Z"));
    vi.spyOn(console, "log").mockImplementation(() => {});
    const ogun = await mocks.findOgun();
    const first = ogun.diet.client.user.pushSubscriptions[0];
    mocks.findClients.mockResolvedValue([{
      ...ogun.diet.client, userId: 5,
      user: { ...ogun.diet.client.user, pushSubscriptions: [first, { ...first, id: 8, endpoint: "https://push.test/second", deviceInfo: { ...deviceInfo, os: "iOS / iPadOS", model: "iPhone" } }] },
      diets: [{ ...ogun.diet, oguns: [ogun] }],
    }]);
    mocks.deleteLogs.mockResolvedValue({ count: 0 });
    await expect(sendMealReminders()).resolves.toMatchObject({ sent: 2, failed: 0 });
    const rows = mocks.createLog.mock.calls.map(([args]) => args.data);
    expect(rows.map((row) => row.subscriptionId)).toEqual([7, 8]);
    expect(rows.map((row) => row.deviceInfo.model)).toEqual(["Pixel 8", "iPhone"]);
  });
  it("logs the exact target without secrets before sending and marks accepted sends", async () => {
    await expect(sendMealReminderForOgun(3)).resolves.toMatchObject({ sent: 1, failed: 0 });
    const data = mocks.createLog.mock.calls[0][0].data;
    expect(data).toMatchObject({ status: "pending", subscriptionId: 7, deviceInfo });
    expect(JSON.stringify(data)).not.toContain("secret");
    expect(JSON.stringify(data)).not.toContain("private-endpoint");
    expect(mocks.send.mock.calls[0][1].data.logId).toBe(91);
    expect(mocks.updateLog).toHaveBeenCalledWith({ where: { id: 91 }, data: { status: "success" } });
  });
  it("does not misdiagnose a database write failure as a provider rejection", async () => {
    mocks.updateLog.mockRejectedValue(new Error("Database unavailable"));
    await expect(sendMealReminderForOgun(3)).rejects.toThrow("Database unavailable");
    expect(mocks.updateLog).toHaveBeenCalledOnce();
    expect(mocks.updateLog.mock.calls[0][0].data.status).toBe("success");
    expect(mocks.deleteSubscription).not.toHaveBeenCalled();
  });
  it("retains device evidence and the provider code when an expired subscription is deleted", async () => {
    mocks.send.mockRejectedValue({ statusCode: 410, message: "Gone" });
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      await expect(sendMealReminderForOgun(3)).resolves.toMatchObject({ sent: 0, failed: 1 });
      expect(mocks.updateLog).toHaveBeenCalledWith({ where: { id: 91 }, data: { status: "failed", pushStatusCode: 410, errorMessage: "[410] Gone" } });
      expect(mocks.deleteSubscription).toHaveBeenCalledOnce();
      expect(mocks.createLog.mock.calls[0][0].data.deviceInfo).toEqual(deviceInfo);
    } finally { errorLog.mockRestore(); }
  });
});
