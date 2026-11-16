import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  db: { diet: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() }, pushSubscription: { delete: vi.fn() } },
  send: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ default: mocks.db }));
vi.mock("@/lib/web-push", () => ({ sendWebPushNotification: mocks.send }));
import { notifyClientOfNewDiet, sendNewDietNotifications } from "./DietNotificationService";
const diet = {
  id: 1, createdAt: new Date(), notifiedAt: null,
  client: { id: 2, name: "Test", surname: "Danışan", user: { notificationPreference: { dietUpdates: true }, pushSubscriptions: [{ id: 3, endpoint: "https://push.test", auth: "x", p256dh: "y" }] } },
};
beforeEach(() => {
  vi.resetAllMocks();
  mocks.db.diet.findMany.mockResolvedValue([diet]);
  mocks.db.diet.findUnique.mockResolvedValue(diet);
});
describe("diet notification retry eligibility", () => {
  it("keeps failed immediate sends eligible for the cron retry", async () => {
    mocks.send.mockRejectedValue(new Error("Service unavailable"));
    expect(await notifyClientOfNewDiet(1)).toMatchObject({ ok: false, sent: 0, failed: 1 });
    expect(mocks.db.diet.update).not.toHaveBeenCalled();
  });
  it("keeps failed cron sends eligible for the next run", async () => {
    mocks.send.mockRejectedValue(new Error("Service unavailable"));
    await sendNewDietNotifications();
    expect(mocks.db.diet.update).not.toHaveBeenCalled();
  });
  it("marks a successful immediate send to avoid the cron duplicate", async () => {
    mocks.send.mockResolvedValue({ statusCode: 201 });
    expect(await notifyClientOfNewDiet(1)).toMatchObject({ ok: true, sent: 1 });
    expect(mocks.db.diet.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { notifiedAt: expect.any(Date) } });
  });
});
