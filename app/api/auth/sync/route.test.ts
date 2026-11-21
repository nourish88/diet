import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ token: vi.fn(), verify: vi.fn(), find: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ default: { user: { findUnique: mocks.find } } }));
vi.mock("@/lib/api-auth", () => ({ getSupabaseTokenFromRequest: mocks.token, verifySupabaseAccessToken: mocks.verify }));
import { GET } from "./route";
beforeEach(() => vi.resetAllMocks());
describe("profile sync authentication", () => {
  it("does not accept a user id query parameter as proof of identity", async () => {
    expect((await GET(new NextRequest("https://diet.test/api/auth/sync?supabaseId=user-1"))).status).toBe(401);
    expect(mocks.find).not.toHaveBeenCalled();
  });
  it("uses the verified session and selects only login fields", async () => {
    mocks.token.mockReturnValue("test-token");
    mocks.verify.mockReturnValue({ id: "user-1" });
    mocks.find.mockResolvedValue({ id: 7, supabaseId: "user-1", role: "client", isApproved: true });
    const response = await GET(new NextRequest("https://diet.test/api/auth/sync"));
    expect(response.status).toBe(200);
    expect(mocks.find.mock.calls[0][0]).toMatchObject({ where: { supabaseId: "user-1" }, select: { id: true, role: true } });
    expect(mocks.find.mock.calls[0][0]).not.toHaveProperty("include");
  });
  it("rejects a requested identity that disagrees with the session", async () => {
    mocks.token.mockReturnValue("test-token");
    mocks.verify.mockReturnValue({ id: "user-1" });
    expect((await GET(new NextRequest("https://diet.test/api/auth/sync?supabaseId=user-2"))).status).toBe(403);
    expect(mocks.find).not.toHaveBeenCalled();
  });
});
