import { describe, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({ logs: vi.fn(), broadcasts: vi.fn(), createMany: vi.fn(), deleteMany: vi.fn(), recorded: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ default: {
  systemConfig: { findUnique: async () => null },
  notificationLog: { findMany: mocks.logs }, broadcastRecipient: { findMany: mocks.broadcasts },
  applicationError: { createMany: mocks.createMany, deleteMany: mocks.deleteMany, findMany: mocks.recorded },
} }));
import { collectNotificationErrors } from "./ApplicationErrorService";
describe("persistent notification incident collection", () => {
  it("keeps unconfirmed delivery distinct from provider failure and deduplicates cron repeats", async () => {
    mocks.recorded.mockResolvedValue([{ eventId: "notification:12:unconfirmed" }]);
    mocks.logs.mockResolvedValue([
      { id: 1, status: "success", sentAt: new Date(), pushStatusCode: 201, user: { supabaseId: "user-1" } },
      { id: 2, status: "failed", sentAt: new Date(), pushStatusCode: 410, user: { supabaseId: "user-2" } },
    ]); mocks.broadcasts.mockResolvedValue([]); mocks.createMany.mockResolvedValue({ count: 2 });
    await collectNotificationErrors();
    const data = mocks.createMany.mock.calls[0][0];
    expect(data.skipDuplicates).toBe(true);
    expect(data.data[0]).toMatchObject({ eventId: "notification:1:unconfirmed", code: "delivery_unconfirmed", status: undefined });
    expect(data.data[1]).toMatchObject({ code: "push_failed", status: 410 });
    const criteria = mocks.logs.mock.calls[0][0].where;
    expect(criteria.sentAt.lt.getTime()).toBeLessThan(Date.now() - 14 * 60000);
    expect(criteria.OR).toContainEqual(expect.objectContaining({ status: "success", id: { notIn: [12] } }));
  });
});
