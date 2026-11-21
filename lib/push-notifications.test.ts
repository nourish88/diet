import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getSession: vi.fn(), activeWorker: vi.fn(), report: vi.fn() }));
vi.mock("@/lib/supabase-browser", () => ({ createClient: () => ({ auth: { getSession: mocks.getSession } }) }));
vi.mock("@/lib/application-error-client", () => ({ reportClientError: mocks.report }));
vi.mock("@/lib/service-worker", () => ({ getActiveServiceWorker: mocks.activeWorker }));
import { removePushNotificationsForCurrentBrowser, setupPushNotificationsForUser } from "./push-notifications";

const key = Buffer.from([1, 2, 3]).toString("base64url");
let permission: NotificationPermission;
let requestPermission: ReturnType<typeof vi.fn>;
let getSubscription: ReturnType<typeof vi.fn>;
let subscribe: ReturnType<typeof vi.fn>;
let subscription: { endpoint: string; options: { applicationServerKey: ArrayBuffer }; unsubscribe: ReturnType<typeof vi.fn> };
let fetchMock: ReturnType<typeof vi.fn>;
let browserNavigator: Record<string, unknown>;

beforeEach(() => {
  vi.resetAllMocks();
  permission = "granted";
  requestPermission = vi.fn(async () => { permission = "granted"; return permission; });
  subscription = { endpoint: "https://push.example/test", options: { applicationServerKey: Uint8Array.from([1, 2, 3]).buffer }, unsubscribe: vi.fn().mockResolvedValue(true) };
  getSubscription = vi.fn().mockResolvedValue(subscription);
  subscribe = vi.fn().mockResolvedValue(subscription);
  const worker = { pushManager: { getSubscription, subscribe } };
  browserNavigator = { userAgent: "Chrome", platform: "Linux", maxTouchPoints: 0, serviceWorker: { getRegistration: vi.fn().mockResolvedValue(worker) } };
  vi.stubGlobal("navigator", browserNavigator);
  vi.stubGlobal("window", { isSecureContext: true, Notification: {}, PushManager: {}, matchMedia: () => ({ matches: false }) });
  vi.stubGlobal("Notification", { get permission() { return permission; }, requestPermission });
  mocks.activeWorker.mockResolvedValue(worker);
  mocks.getSession.mockResolvedValue({ data: { session: { access_token: "test-token" } } });
  fetchMock = vi.fn(async (url: string) => url === "/api/push/config"
    ? Response.json({ configured: true, publicKey: key })
    : Response.json({ data: { success: true }, error: null, meta: { ts: "test" } }));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("push registration recovery", () => {
  it("never prompts from automatic setup", async () => {
    permission = "default";
    expect(await setupPushNotificationsForUser(7)).toEqual({ ok: false, reason: "dismissed" });
    expect(requestPermission).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("requests permission before network work and allows another explicit attempt after dismissal", async () => {
    permission = "default";
    requestPermission.mockResolvedValueOnce("default");
    expect(await setupPushNotificationsForUser(7, { requestPermissionIfDefault: true })).toMatchObject({ reason: "dismissed" });
    requestPermission.mockImplementationOnce(async () => {
      expect(fetchMock).not.toHaveBeenCalled();
      permission = "granted";
      return permission;
    });
    expect(await setupPushNotificationsForUser(7, { requestPermissionIfDefault: true })).toEqual({ ok: true });
    expect(requestPermission).toHaveBeenCalledTimes(2);
  });

  it("registers an existing subscription with the server even when permission was already granted", async () => {
    expect(await setupPushNotificationsForUser(7)).toEqual({ ok: true });
    expect(subscribe).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith("/api/push/subscribe", expect.objectContaining({ method: "POST", headers: expect.objectContaining({ Authorization: "Bearer test-token" }) }));
  });

  it("creates a subscription only after the worker is active", async () => {
    getSubscription.mockResolvedValue(null);
    subscribe.mockImplementation(async () => {
      expect(mocks.activeWorker).toHaveBeenCalled();
      return subscription;
    });
    expect(await setupPushNotificationsForUser(7)).toEqual({ ok: true });
    expect(subscribe).toHaveBeenCalledWith({ userVisibleOnly: true, applicationServerKey: Uint8Array.from([1, 2, 3]) });
  });

  it("renews the browser subscription on explicit repair even if the VAPID key is unchanged", async () => {
    expect(await setupPushNotificationsForUser(7, { renewSubscription: true })).toEqual({ ok: true });
    expect(subscription.unsubscribe).toHaveBeenCalledOnce();
    expect(subscribe).toHaveBeenCalledOnce();
    const methods = fetchMock.mock.calls.filter(([url]) => url === "/api/push/subscribe").map(([, init]) => init.method);
    expect(methods).toEqual(["POST"]);
    expect(JSON.parse(fetchMock.mock.calls.at(-1)![1].body).previousEndpoint).toBe(subscription.endpoint);
  });

  it("retires endpoints registered under a previous VAPID key", async () => {
    subscription.options.applicationServerKey = Uint8Array.from([9]).buffer;
    expect(await setupPushNotificationsForUser(7)).toEqual({ ok: true });
    const methods = fetchMock.mock.calls.filter(([url]) => url === "/api/push/subscribe").map(([, init]) => init.method);
    expect(methods).toEqual(["POST"]);
    expect(JSON.parse(fetchMock.mock.calls.at(-1)![1].body).previousEndpoint).toBe(subscription.endpoint);
    expect(subscription.unsubscribe).toHaveBeenCalledOnce();
    expect(subscribe).toHaveBeenCalledOnce();
  });

  it("keeps the server registration when browser renewal fails", async () => {
    subscription.unsubscribe.mockResolvedValue(false);
    expect(await setupPushNotificationsForUser(7, { renewSubscription: true })).toMatchObject({ reason: "missing-subscription" });
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(["/api/push/config"]);
  });

  it("reports a config network failure once at its actual endpoint and recovers on the next sync", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Load failed")).mockRejectedValueOnce(new TypeError("Load failed"));
    await expect(setupPushNotificationsForUser(7)).rejects.toMatchObject({ code: "network_error" });
    expect(mocks.report).toHaveBeenCalledTimes(1);
    expect(mocks.report).toHaveBeenCalledWith(expect.objectContaining({ code: "network_error" }), expect.objectContaining({ path: "/api/push/config" }));
    expect(await setupPushNotificationsForUser(7)).toEqual({ ok: true });
  });

  it("does not claim success when persistence fails and retries on the next attempt", async () => {
    fetchMock.mockImplementationOnce(async () => Response.json({ configured: true, publicKey: key }))
      .mockImplementationOnce(async () => new Response(null, { status: 503 }));
    await expect(setupPushNotificationsForUser(7)).rejects.toMatchObject({ status: 503 });
    expect(await setupPushNotificationsForUser(7)).toEqual({ ok: true });
  });

  it("deduplicates provider and settings setup", async () => {
    expect(await Promise.all([setupPushNotificationsForUser(7), setupPushNotificationsForUser(7)])).toEqual([{ ok: true }, { ok: true }]);
    expect(fetchMock.mock.calls.filter(([url]) => url === "/api/push/config")).toHaveLength(1);
  });

  it("reports missing sender configuration without creating a device subscription", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ configured: false, publicKey: null }));
    expect(await setupPushNotificationsForUser(7)).toMatchObject({ ok: false, reason: "missing-configuration" });
    expect(subscribe).not.toHaveBeenCalled();
  });

  it("directs iPads using desktop user agents to install before granting permission", async () => {
    browserNavigator.platform = "MacIntel";
    browserNavigator.maxTouchPoints = 5;
    expect(await setupPushNotificationsForUser(7, { requestPermissionIfDefault: true })).toMatchObject({ reason: "install-required" });
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it("does not reprompt a denied permission", async () => {
    permission = "denied";
    expect(await setupPushNotificationsForUser(7, { requestPermissionIfDefault: true })).toMatchObject({ reason: "denied" });
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it("allows logout when no service worker is registered", async () => {
    const worker = browserNavigator.serviceWorker as { getRegistration: ReturnType<typeof vi.fn> };
    worker.getRegistration.mockResolvedValue(undefined);
    await removePushNotificationsForCurrentBrowser();
    expect(mocks.activeWorker).not.toHaveBeenCalled();
  });

  it("unsubscribes locally even when endpoint deletion fails", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 500 }));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    await removePushNotificationsForCurrentBrowser();
    expect(subscription.unsubscribe).toHaveBeenCalledOnce();
    log.mockRestore();
  });
});
