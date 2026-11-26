import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { beforeEach, describe, expect, it, vi } from "vitest";

let handlers: Record<string, (event: any) => void>;
let worker: any;
let fetchMock: ReturnType<typeof vi.fn>;
let entries: Map<string, Response>;
let cache: { match: ReturnType<typeof vi.fn>; put: ReturnType<typeof vi.fn>; keys: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> };
function dispatch<T = void>(type: string, data: Record<string, unknown> = {}) {
  let pending: Promise<T> = Promise.resolve(undefined as T);
  const respondWith = vi.fn((response) => { pending = Promise.resolve(response); });
  handlers[type]({ ...data, respondWith, waitUntil: (promise) => { pending = promise; } });
  return { pending, respondWith };
}
beforeEach(() => {
  handlers = {};
  entries = new Map();
  const keyUrl = (key: Request | string) => typeof key === "string" ? key : key.url;
  cache = {
    match: vi.fn(async (key) => entries.get(keyUrl(key))?.clone()),
    put: vi.fn(async (key, response) => { entries.set(keyUrl(key), response); }),
    keys: vi.fn(async () => Array.from(entries.keys(), (url) => new Request(url))),
    delete: vi.fn(async (key) => entries.delete(keyUrl(key))),
  };
  fetchMock = vi.fn().mockResolvedValue(new Response("online"));
  worker = {
    addEventListener: (type: string, handler: any) => { handlers[type] = handler; },
    navigator: { onLine: true },
    location: { origin: "https://diet.test" },
    registration: { showNotification: vi.fn().mockResolvedValue(undefined) },
    clients: { matchAll: vi.fn().mockResolvedValue([]), openWindow: vi.fn().mockResolvedValue({}) },
  };
  runInNewContext(readFileSync(new URL("../public/sw.js", import.meta.url), "utf8"), {
    self: worker, URL, Request, Response, console, AbortController, setTimeout, clearTimeout,
    fetch: fetchMock,
    caches: { open: vi.fn().mockResolvedValue(cache) },
  });
});

describe("service worker runtime", () => {
  it("still shows a notification for malformed or empty push payloads", async () => {
    await dispatch("push", { data: { json: () => { throw new Error("invalid JSON"); }, text: () => "Yeni mesaj" } }).pending;
    await dispatch("push").pending;
    expect(worker.registration.showNotification).toHaveBeenCalledTimes(2);
  });

  it("acknowledges delivery only after displaying the notification", async () => {
    fetchMock.mockResolvedValue(Response.json({ ok: true }));
    let show: () => void = () => {};
    worker.registration.showNotification.mockImplementation(() => new Promise<void>((resolve) => { show = resolve; }));
    const { pending } = dispatch("push", { data: { json: () => ({ title: "Mesaj", data: { logId: 3 } }) } });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(cache.put).not.toHaveBeenCalled();
    show();
    await pending;
    expect(fetchMock).toHaveBeenCalledWith("/api/push/ack", expect.objectContaining({ method: "POST" }));
  });

  it("replays a stored receipt after network and server failures without redisplaying the notification", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("offline")).mockResolvedValueOnce(new Response(null, { status: 503 }));
    await dispatch("push", { data: { json: () => ({ title: "Private", data: { logId: 12, broadcastRecipientId: 8 } }) } }).pending;
    expect(entries.size).toBe(1);
    fetchMock.mockResolvedValueOnce(Response.json({ ok: true }));
    await dispatch("message", { data: { type: "RETRY_PUSH_ACKS" } }).pending;
    expect(entries.size).toBe(0);
    expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toEqual({ logId: 12, broadcastRecipientId: 8 });
    expect(worker.registration.showNotification).toHaveBeenCalledOnce();
  });

  it("does not acknowledge a notification that failed to display", async () => {
    worker.registration.showNotification.mockRejectedValue(new Error("permission revoked"));
    await expect(dispatch("push", { data: { json: () => ({ data: { logId: 12 } }) } }).pending).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(cache.put).not.toHaveBeenCalled();
  });

  it("leaves API and manifest freshness to the network", () => {
    for (const path of ["/api/push/config", "/api/client/today", "/manifest.json"]) {
      expect(dispatch("fetch", { request: { method: "GET", url: `https://diet.test${path}` } }).respondWith).not.toHaveBeenCalled();
    }
  });

  it("does not cache authenticated navigations", async () => {
    const { pending } = dispatch<Response>("fetch", { request: { method: "GET", mode: "navigate", url: "https://diet.test/client" } });
    expect(await (await pending).text()).toBe("online");
    expect(cache.put).not.toHaveBeenCalled();
  });

  it("shows a public offline screen instead of a stale authenticated shell", async () => {
    worker.navigator.onLine = false;
    fetchMock.mockRejectedValue(new Error("offline"));
    cache.match.mockResolvedValue(new Response("offline page"));
    const { pending } = dispatch<Response>("fetch", { request: { method: "GET", mode: "navigate", url: "https://diet.test/client" } });
    expect(await (await pending).text()).toBe("offline page");
    expect(cache.match).toHaveBeenCalledWith("/offline.html");
  });

  it.each(["/client/diets/42?ogunId=5", "/diets/new"])("recovers %s after a transient navigation failure", async (path) => {
    fetchMock.mockRejectedValueOnce(new TypeError("Load failed"));
    const { pending } = dispatch<Response>("fetch", { request: { method: "GET", mode: "navigate", url: worker.location.origin + path } });
    expect(await (await pending).text()).toBe("online");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(cache.match).not.toHaveBeenCalled();
  });

  it("serves online assets even when cache storage fails", async () => {
    cache.match.mockRejectedValueOnce(new Error("storage unavailable"));
    cache.put.mockRejectedValueOnce(new Error("quota exceeded"));
    const { pending } = dispatch<Response>("fetch", { request: { method: "GET", url: "https://diet.test/_next/static/app.js" } });
    expect(await (await pending).text()).toBe("online");
  });

  const destination = "https://diet.test/client/diets/42?ogunId=5";
  function click(url?: string) {
    return dispatch("notificationclick", { notification: { close: vi.fn(), data: { url } } }).pending;
  }

  it("focuses an exact match even with a more recently used dietitian tab", async () => {
    const tab = { url: "https://diet.test/diets/new", focus: vi.fn() };
    const target = { url: destination, focus: vi.fn(), postMessage: vi.fn() };
    worker.clients.matchAll.mockResolvedValue([tab, target]);
    await click(destination);
    expect(target.focus).toHaveBeenCalledOnce();
    expect(tab.focus).not.toHaveBeenCalled();
    expect(worker.clients.openWindow).not.toHaveBeenCalled();
  });

  it("opens the full deep link when an exact window cannot be focused", async () => {
    worker.clients.matchAll.mockResolvedValue([{ url: destination, focus: vi.fn().mockRejectedValue(new Error("suspended")) }]);
    await click(destination);
    expect(worker.clients.openWindow).toHaveBeenCalledWith(destination);
  });

  it("uses an existing portal window if the browser refuses to open another", async () => {
    const editor = { url: "https://diet.test/diets/new", navigate: vi.fn() };
    const portal = { url: "https://diet.test/client", focus: vi.fn(), navigate: vi.fn() };
    worker.clients.matchAll.mockResolvedValue([editor, portal]);
    worker.clients.openWindow.mockRejectedValue(new Error("window refused"));
    await click(destination);
    expect(portal.focus).toHaveBeenCalledOnce();
    expect(portal.navigate).toHaveBeenCalledWith(destination);
    expect(editor.navigate).not.toHaveBeenCalled();
  });

  it("keeps the worker alive until a cold launch with the meal query completes", async () => {
    let finish!: () => void;
    worker.clients.openWindow.mockImplementation(() => new Promise<void>(resolve => { finish = resolve; }));
    const done = vi.fn();
    const pending = click(destination).then(done);
    await vi.waitFor(() => expect(worker.clients.openWindow).toHaveBeenCalledWith(destination));
    expect(done).not.toHaveBeenCalled();
    finish();
    await pending;
  });

  it("opens the portal for older notifications without a destination", async () => {
    await click();
    expect(worker.clients.openWindow).toHaveBeenCalledWith("https://diet.test/client");
  });

  it("keeps notification destinations on the application origin", async () => {
    await dispatch("notificationclick", { notification: { close: vi.fn(), data: { url: "https://other.test/" } } }).pending;
    expect(worker.clients.openWindow).toHaveBeenCalledWith("https://diet.test/client");
  });
});
