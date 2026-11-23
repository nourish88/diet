import { beforeEach, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const mock = vi.hoisted(() => ({
  source: vi.fn(), subscription: vi.fn(), create: vi.fn(), update: vi.fn(), send: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ default: {
  systemConfig: { findUnique: async () => null },
  notificationLog: { findFirst: mock.source, create: mock.create, update: mock.update },
  pushSubscription: { findFirst: mock.subscription },
} }));
vi.mock("@/lib/web-push", () => ({ isWebPushConfigured: () => true, sendWebPushNotification: mock.send }));
import { retryNotification } from "./NotificationRetryService";

const source = {
  receivedAt: null, subscriptionId: 14, replacementSubscriptionId: 26, clientId: 7, userId: 9,
  client: { isActive: true, userId: 9 }, user: { notificationPreference: null }, retries: [],
};
const pending = { id: 50, sentAt: new Date(), receivedAt: null, status: "pending" };

beforeEach(() => {
  vi.resetAllMocks();
  mock.source.mockResolvedValue(source);
  mock.subscription.mockResolvedValue({ id: 26, endpoint: "https://example.test/push", auth: "a", p256dh: "k" });
  mock.create.mockResolvedValue({ id: 50 });
  mock.update.mockResolvedValue({ ...pending, status: "success" });
});

it("sends a separate test to the renewed subscription and waits for its own receipt", async () => {
  expect((await retryNotification(31, 2, 0)).attempt).toMatchObject({ id: 50, receivedAt: null });
  expect(mock.source.mock.calls[0][0].where).toMatchObject({ id: 31, client: { dietitianId: 2 } });
  expect(mock.subscription).toHaveBeenCalledWith({ where: { id: 26, userId: 9 } });
  expect(mock.create.mock.calls[0][0].data).toMatchObject({ retryOfId: 31, retryAfterId: 0, subscriptionId: 26 });
  expect(mock.send.mock.calls[0][1].data).toEqual({ logId: 50 });
  expect(mock.update.mock.calls[0][0].data).toEqual({ status: "success" });
});

it("records a rejected send, without changing the original notification", async () => {
  mock.send.mockRejectedValue({ statusCode: 410 });
  await retryNotification(31, 2, 0);
  expect(mock.update.mock.calls[0][0]).toMatchObject({ where: { id: 50 }, data: { status: "failed", pushStatusCode: 410 } });
});

it("reuses an in-flight attempt after a lost response or concurrent click", async () => {
  const current = { ...source, retries: [pending] };
  mock.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError("duplicate", { code: "P2002", clientVersion: "test" }));
  mock.source.mockResolvedValueOnce(source).mockResolvedValue(current);
  expect((await retryNotification(31, 2, 0)).attempt).toEqual(pending);
  expect((await retryNotification(31, 2, 0)).attempt).toEqual(pending);
  expect(mock.send).not.toHaveBeenCalled();
  expect(mock.create).toHaveBeenCalledTimes(1);
});

it("skips acknowledged originals, unavailable devices and clients who disabled reminders", async () => {
  mock.source.mockResolvedValueOnce({ ...source, receivedAt: new Date() });
  expect((await retryNotification(31, 2, 0)).receivedAt).toBeInstanceOf(Date);
  mock.source.mockResolvedValueOnce(null);
  await expect(retryNotification(31, 3, 0)).rejects.toMatchObject({ code: "not_found" });
  mock.subscription.mockResolvedValue(null);
  await expect(retryNotification(31, 2, 0)).rejects.toMatchObject({ code: "conflict" });
  mock.source.mockResolvedValueOnce({ ...source, user: { notificationPreference: { mealReminders: false } } });
  await expect(retryNotification(31, 2, 0)).rejects.toMatchObject({ code: "conflict" });
  expect(mock.send).not.toHaveBeenCalled();
});
