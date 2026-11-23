// @vitest-environment jsdom
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";

beforeEach(() => { vi.resetModules(); localStorage.clear(); vi.stubGlobal("fetch", vi.fn()); Object.defineProperty(navigator, "onLine", { configurable: true, value: true }); });
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
describe("persistent browser error outbox", () => {
  it("links a later successful operation on this browser to the original signed-in account and event", async () => {
    const owner = "22222222-2222-4222-8222-222222222222";
    const path = "/api/push/subscribe";
    const reporter = await import("./application-error-client");
    reporter.setErrorReporterSession(owner, "token");
    reporter.reportClientError(null, { code: "timeout", path, method: "POST" });
    vi.mocked(fetch).mockImplementation(async () => Response.json({ ok: true }));
    await reporter.flushClientErrors();
    vi.resetModules();
    const next = await import("./application-error-client");
    next.setErrorReporterSession("33333333-3333-4333-8333-333333333333", "other");
    next.observeRequestSuccess(path, "POST", Date.now());
    next.setErrorReporterSession(owner, "token");
    next.observeRequestSuccess(path, "DELETE", Date.now());
    await next.flushClientErrors();
    expect(fetch).toHaveBeenCalledTimes(1);
    next.observeRequestSuccess(path, "POST", Date.now());
    await next.flushClientErrors();
    const events = vi.mocked(fetch).mock.calls.map(([, opts]) => JSON.parse(opts!.body as string).events[0]);
    expect(events[1]).toEqual({ ...events[0], recoveredAt: expect.any(String) });
  });
  it("keeps an offline failure across reloads and retries after a database outage without leaking secrets", async () => {
    let reporter = await import("./application-error-client");
    reporter.reportClientError(new Error("password=private token=secret"), { path: "/api/clients/123?token=secret", code: "network_error" });
    const saved = localStorage.getItem("application-error-outbox-v1")!;
    expect(saved).not.toContain("secret"); expect(saved).not.toContain("private"); expect(saved).not.toContain("123");
    expect(JSON.parse(saved)).toHaveLength(1);
    vi.resetModules(); reporter = await import("./application-error-client");
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError("Load failed")).mockResolvedValueOnce(Response.json({ ok: false }, { status: 503 })).mockResolvedValueOnce(Response.json({ ok: true }));
    await reporter.flushClientErrors(); expect(JSON.parse(localStorage.getItem("application-error-outbox-v1")!)).toHaveLength(1);
    await reporter.flushClientErrors(); expect(JSON.parse(localStorage.getItem("application-error-outbox-v1")!)).toHaveLength(1);
    await reporter.flushClientErrors(); expect(JSON.parse(localStorage.getItem("application-error-outbox-v1")!)).toHaveLength(0);
    const bodies = vi.mocked(fetch).mock.calls.map(([, args]) => JSON.parse(args!.body as string));
    expect(bodies[0].events[0].eventId).toBe(bodies[2].events[0].eventId);
  });
  it("records only a same-origin build hash and position for otherwise anonymous JavaScript errors", async () => {
    const { reportClientError } = await import("./application-error-client");
    const error = new Error("private");
    error.stack = `render@https://other.test/_next/static/chunks/1-0000000000000000.js:1:3\nrender@${location.origin}/_next/static/chunks/app/client/page-1234567890abcdef.js:1:420`;
    reportClientError(error, { code: "javascript_error", path: "/client" });
    const stored = localStorage.getItem("application-error-outbox-v1")!;
    expect(JSON.parse(stored)[0].bundlePosition).toBe("1234567890abcdef:1:420");
    expect(stored).not.toMatch(/private|other.test|chunks|render/);
  });
  it("bounds repeated errors and never logs intentional cancellation or its own requests", async () => {
    const { reportClientError } = await import("./application-error-client");
    reportClientError(null, { code: "network_error", path: "/api/test" });
    reportClientError(null, { code: "network_error", path: "/api/test" });
    reportClientError(null, { path: "/api/application-errors" });
    expect(JSON.parse(localStorage.getItem("application-error-outbox-v1")!)).toHaveLength(1);
  });
  it("uses memory when storage reads work but writes exceed quota", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("Quota exceeded", "QuotaExceededError"); });
    const { reportClientError, flushClientErrors } = await import("./application-error-client");
    reportClientError(null, { code: "network_error", path: "/api/test" });
    vi.mocked(fetch).mockResolvedValue(Response.json({ ok: true }));
    await flushClientErrors();
    expect(JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string).events).toHaveLength(1);
  });
});
