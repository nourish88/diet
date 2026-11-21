import { beforeEach, describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), verify: vi.fn(), createMany: vi.fn(), count: vi.fn(), findMany: vi.fn(), users: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ default: { applicationError: { createMany: mocks.createMany, count: mocks.count, findMany: mocks.findMany }, user: { findMany: mocks.users } } }));
vi.mock("@/lib/api-auth", () => ({ authenticateRequest: mocks.auth, getSupabaseTokenFromRequest: () => "token", verifySupabaseAccessToken: mocks.verify }));
import { POST, GET } from "./route";
const subject = "22222222-2222-4222-8222-222222222222";
function post(event: object, origin = "https://diet.test") {
  return new NextRequest("https://diet.test/api/application-errors", { method: "POST", headers: { origin, "Content-Type": "application/json" }, body: JSON.stringify({ events: [event] }) });
}
const event = () => ({ eventId: "11111111-1111-4111-8111-111111111111", code: "network_error", path: "/api/auth/sync?token=private", occurredAt: new Date().toISOString(), subject });
beforeEach(() => {
  vi.resetAllMocks(); mocks.createMany.mockResolvedValue({ count: 1 }); mocks.count.mockResolvedValue(0);
  mocks.verify.mockReturnValue(null); mocks.auth.mockResolvedValue({ user: null });
});
describe("application errors API", () => {
  it("accepts pre-login failures but never trusts a supplied account identity or raw secrets", async () => {
    expect((await POST(post(event()))).status).toBe(200);
    const data = mocks.createMany.mock.calls[0][0].data[0];
    expect(data.subject).toBe(null); expect(data.path).toBe("/api/auth/sync"); expect(JSON.stringify(data)).not.toContain("private");
    expect((await POST(post({ ...event(), message: "password=private" }))).status).toBe(400);
    expect((await POST(post(event(), "https://other.test"))).status).toBe(403);
  });
  it("acknowledges only durable writes so the browser can safely replay failures", async () => {
    mocks.verify.mockReturnValue({ id: subject });
    mocks.createMany.mockRejectedValueOnce(new Error("connection closed"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try { expect((await POST(post(event()))).status).toBe(503); } finally { spy.mockRestore(); }
    expect((await POST(post(event()))).status).toBe(200);
    const data = mocks.createMany.mock.calls[1][0];
    expect(data.skipDuplicates).toBe(true); expect(data.data[0].subject).toBe(subject);
  });
  it("checks the public host behind the Next.js / Vercel proxy", async () => {
    const request = new NextRequest("http://localhost:3000/api/application-errors", { method: "POST", headers: {
      host: "diet.test", origin: "https://diet.test", "x-forwarded-proto": "https", "Content-Type": "application/json",
    }, body: JSON.stringify({ events: [] }) });
    expect((await POST(request)).status).toBe(400);
  });
  it("restricts reading to the dietitian and scopes identified accounts", async () => {
    const request = new NextRequest("https://diet.test/api/application-errors");
    expect((await GET(request)).status).toBe(401);
    mocks.auth.mockResolvedValue({ user: { role: "client", id: 7 } });
    expect((await GET(request)).status).toBe(403);
    mocks.auth.mockResolvedValue({ user: { role: "dietitian", id: 7 } });
    mocks.users.mockResolvedValue([{ supabaseId: subject }]); mocks.findMany.mockResolvedValue([]);
    expect((await GET(request)).status).toBe(200);
    expect(mocks.users.mock.calls[0][0].where.OR).toContainEqual({ client: { dietitianId: 7 } });
    expect(mocks.findMany.mock.calls[0][0].where.OR).toContainEqual({ subject: { in: [subject] } });
  });
});
