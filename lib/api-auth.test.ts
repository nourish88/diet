import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ findUser: vi.fn(), verify: vi.fn(), apiKey: vi.fn() }));
vi.mock("./prisma", () => ({ default: { user: { findUnique: mocks.findUser } } }));
vi.mock("jsonwebtoken", () => ({ verify: mocks.verify }));
vi.mock("./api-key-auth", () => ({ authenticateApiKey: mocks.apiKey }));
import { authenticateRequest } from "./api-auth";
// JWT verification uses CommonJS in the existing authentication module.
const jwt = require("jsonwebtoken");
let verifySpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  vi.stubEnv("SUPABASE_JWT_SECRET", "test-secret");
  verifySpy = vi.spyOn(jwt, "verify").mockReturnValue({ sub: "user-1", email: "test@example.com" });
  vi.spyOn(console, "error").mockImplementation(() => {}); vi.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });
describe("authentication during a database outage", () => {
  it("propagates database failures instead of presenting an authenticated session as unauthorized", async () => {
    const error = Object.assign(new Error("Server has closed the connection"), { code: "P1017" });
    mocks.findUser.mockRejectedValue(error);
    const request = new NextRequest("https://diet.test/api/client/consent/kvkk", { headers: { Authorization: "Bearer token" } });
    await expect(authenticateRequest(request)).rejects.toBe(error);
  });
  it("still returns unauthorized for an invalid token", async () => {
    verifySpy.mockImplementation(() => { throw new Error("invalid signature"); }); mocks.apiKey.mockResolvedValue(null);
    expect((await authenticateRequest(new NextRequest("https://diet.test/api/test", { headers: { Authorization: "Bearer invalid" } }))).user).toBe(null);
  });
});
