import { NextRequest } from "next/server";
import { afterEach, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  notificationLog: { updateMany: vi.fn() },
  broadcastRecipient: { updateMany: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ default: db }));
import { POST } from "./route";

const post = (body: object) => POST(new NextRequest("https://diet.test/api/push/ack", {
  method: "POST", body: JSON.stringify(body),
}));
afterEach(() => vi.resetAllMocks());

it("preserves the first receipt when the device replays after a lost response", async () => {
  db.notificationLog.updateMany.mockResolvedValue({ count: 0 });
  db.broadcastRecipient.updateMany.mockResolvedValue({ count: 0 });
  expect((await post({ logId: 5, broadcastRecipientId: 7 })).status).toBe(200);
  expect(db.notificationLog.updateMany).toHaveBeenCalledWith({
    where: { id: 5, receivedAt: null }, data: { receivedAt: expect.any(Date) },
  });
  expect(db.broadcastRecipient.updateMany).toHaveBeenCalledWith({
    where: { id: 7, deliveredAt: null }, data: { deliveredAt: expect.any(Date), deliveryStatus: "delivered" },
  });
});

it("allows the device to retry a failed database write", async () => {
  db.notificationLog.updateMany.mockRejectedValueOnce(new Error("connection closed"));
  expect((await post({ logId: 5 })).status).toBe(500);
  db.notificationLog.updateMany.mockResolvedValueOnce({ count: 1 });
  expect(await (await post({ logId: 5 })).json()).toEqual({ ok: true });
});
