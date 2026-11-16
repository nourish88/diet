import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("service worker readiness", () => {
  it("waits for activation after registration", async () => {
    vi.resetModules();
    let activate: (worker: unknown) => void = () => {};
    const ready = new Promise((resolve) => { activate = resolve; });
    const register = vi.fn().mockResolvedValue({ active: null });
    vi.stubGlobal("navigator", { serviceWorker: { register, ready } });
    const { getActiveServiceWorker } = await import("./service-worker");
    const pending = getActiveServiceWorker();
    const active = { active: { state: "activated" } };
    activate(active);
    expect(await pending).toBe(active);
  });

  it("bounds a never-activating registration instead of hanging the UI", async () => {
    vi.useFakeTimers();
    vi.resetModules();
    vi.stubGlobal("navigator", { serviceWorker: { register: vi.fn().mockResolvedValue({}), ready: new Promise(() => {}) } });
    const { getActiveServiceWorker } = await import("./service-worker");
    const check = expect(getActiveServiceWorker()).rejects.toThrow("timed out");
    await vi.advanceTimersByTimeAsync(15000);
    await check;
  });

  it("retries a failed registration", async () => {
    vi.resetModules();
    const register = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({ active: true });
    vi.stubGlobal("navigator", { serviceWorker: { register } });
    const { registerAppServiceWorker } = await import("./service-worker");
    await expect(registerAppServiceWorker()).rejects.toThrow("offline");
    await expect(registerAppServiceWorker()).resolves.toEqual({ active: true });
    expect(register).toHaveBeenCalledTimes(2);
  });
});
