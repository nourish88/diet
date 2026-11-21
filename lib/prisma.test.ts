import { describe, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({ hook: undefined as any, after: vi.fn(), createMany: vi.fn().mockResolvedValue({ count: 1 }) }));
vi.mock("next/server", () => ({ after: mocks.after }));
vi.mock("@prisma/client", () => ({ PrismaClient: class {
  applicationError = { createMany: mocks.createMany };
  $on() {}
  $extends(config: any) { mocks.hook = config.query.$allModels.$allOperations; return this; }
} }));
import "./prisma";
describe("database operation recovery", () => {
  it("retries a closed-connection read once while retaining the original diagnostic", async () => {
    const query = vi.fn().mockRejectedValueOnce({ code: "P1017" }).mockResolvedValueOnce({ id: 7 });
    expect(await mocks.hook({ model: "User", operation: "findUnique", args: {}, query })).toEqual({ id: 7 });
    expect(query).toHaveBeenCalledTimes(2); expect(mocks.after).toHaveBeenCalled();
  });
  it("does not replay a write that may already have reached PostgreSQL", async () => {
    const query = vi.fn().mockRejectedValue({ code: "P1017" });
    await expect(mocks.hook({ model: "Diet", operation: "create", args: {}, query })).rejects.toMatchObject({ code: "P1017" });
    expect(query).toHaveBeenCalledOnce();
  });
});
