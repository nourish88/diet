import { describe, expect, it, vi } from "vitest";
import { ensureClientSession } from "./client-session";

describe("client phone session", () => {
  it("never tries registration when sign-in fails due to connectivity", async () => {
    const auth = { signInWithPassword: vi.fn().mockResolvedValue({ data: {}, error: Object.assign(new Error("Load failed"), { status: 0 }) }), signUp: vi.fn() };
    await expect(ensureClientSession(auth as never, "test@example.com", "test-password")).rejects.toThrow("Sunucuya bağlantı");
    expect(auth.signUp).not.toHaveBeenCalled();
  });
  it("retains first-time registration for invalid credentials only", async () => {
    const data = { session: { access_token: "test" }, user: { id: "user-1" } };
    const auth = { signInWithPassword: vi.fn().mockResolvedValueOnce({ data: {}, error: { code: "invalid_credentials" } }).mockResolvedValueOnce({ data, error: null }), signUp: vi.fn().mockResolvedValue({ error: null }) };
    expect(await ensureClientSession(auth as never, "test@example.com", "test-password")).toEqual(data);
    expect(auth.signUp).toHaveBeenCalledOnce();
  });
});
