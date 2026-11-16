import { createECDH } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const sender = vi.hoisted(() => ({ setVapidDetails: vi.fn(), sendNotification: vi.fn().mockResolvedValue({ statusCode: 201 }) }));
vi.mock("web-push", () => ({ default: sender }));
const pair = createECDH("prime256v1");
pair.generateKeys();
beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubEnv("WEB_PUSH_PUBLIC_KEY", pair.getPublicKey().toString("base64url"));
  vi.stubEnv("WEB_PUSH_PRIVATE_KEY", pair.getPrivateKey().toString("base64url"));
  vi.stubEnv("WEB_PUSH_CONTACT_EMAIL", "mailto:admin@diet.test");
});
afterEach(() => vi.unstubAllEnvs());
describe("web push sender configuration", () => {
  it("never reports a send as successful when credentials are missing", async () => {
    vi.stubEnv("WEB_PUSH_PRIVATE_KEY", "");
    const push = await import("./web-push");
    expect(push.isWebPushConfigured()).toBe(false);
    await expect(push.sendWebPushNotification({ endpoint: "https://push.test", keys: { auth: "x", p256dh: "y" } }, {})).rejects.toThrow("configuration");
    expect(sender.sendNotification).not.toHaveBeenCalled();
  });
  it("rejects mismatched key pairs without crashing route imports", async () => {
    const other = createECDH("prime256v1"); other.generateKeys();
    vi.stubEnv("WEB_PUSH_PUBLIC_KEY", other.getPublicKey().toString("base64url"));
    const push = await import("./web-push");
    expect(push.isWebPushConfigured()).toBe(false);
    expect(sender.setVapidDetails).not.toHaveBeenCalled();
  });
  it("accepts matching keys and bounds provider network requests", async () => {
    const push = await import("./web-push");
    expect(push.isWebPushConfigured()).toBe(true);
    await push.sendWebPushNotification({ endpoint: "https://push.test", keys: { auth: "x", p256dh: "y" } }, { title: "Merhaba" });
    expect(sender.sendNotification).toHaveBeenCalledWith(expect.any(Object), JSON.stringify({ title: "Merhaba" }), { timeout: 10000 });
  });
});
