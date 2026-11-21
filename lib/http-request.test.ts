import { afterEach, describe, expect, it, vi } from "vitest";
import { describeRequestError, requestJson } from "./http-request";
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("resilient requests", () => {
  it("recovers a transient Safari Load failed on reads", async () => {
    const fetch = vi.fn().mockRejectedValueOnce(new TypeError("Load failed")).mockResolvedValueOnce(Response.json({ ok: true }));
    vi.stubGlobal("fetch", fetch);
    expect(await requestJson("/api/test")).toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("recovers a read-only login lookup after a temporary gateway error", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response(null, { status: 503 })).mockResolvedValueOnce(Response.json({ clients: [] }));
    vi.stubGlobal("fetch", fetch);
    const options = { method: "POST", readOnlyPost: true, body: "{}" };
    expect(await requestJson("/api/client-auth/lookup", options)).toEqual({ clients: [] });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("never repeats a write after a network failure", async () => {
    const fetch = vi.fn().mockRejectedValue(new TypeError("Load failed"));
    vi.stubGlobal("fetch", fetch);
    await expect(requestJson("/api/diets", { method: "POST", retries: 5 })).rejects.toMatchObject({ code: "network_error" });
    expect(fetch).toHaveBeenCalledOnce();
  });
  it("waits past three seconds but bounds requests that never complete", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn((_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    })));
    const pending = expect(requestJson("/api/auth/sync", { retries: 0 })).rejects.toMatchObject({ code: "timeout" });
    await vi.advanceTimersByTimeAsync(3000);
    expect(vi.getTimerCount()).toBe(1);
    await vi.advanceTimersByTimeAsync(17000);
    await pending;
    expect(vi.getTimerCount()).toBe(0);
  });
  it("does not retry canceled reads or permission failures", async () => {
    const controller = new AbortController();
    const fetch = vi.fn((_url, { signal }) => new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")))));
    vi.stubGlobal("fetch", fetch);
    const pending = expect(requestJson("/api/test", { signal: controller.signal })).rejects.toMatchObject({ name: "AbortError" });
    controller.abort();
    await pending;
    expect(fetch).toHaveBeenCalledOnce();
    fetch.mockResolvedValue(Response.json({ error: "Forbidden" }, { status: 403 }) as never);
    await expect(requestJson("/api/test")).rejects.toMatchObject({ status: 403 });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("parses both legacy and enveloped responses and rejects an HTML success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(Response.json({ data: { id: 7 }, error: null, meta: { ts: "now" } })).mockResolvedValueOnce(new Response("<html>offline</html>")));
    expect(await requestJson("/api/test")).toEqual({ id: 7 });
    await expect(requestJson("/api/test")).rejects.toMatchObject({ code: "invalid_response" });
    expect(describeRequestError(new TypeError("Load failed"))).toContain("hizmet erişim");
  });
});
