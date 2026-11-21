import { afterEach, describe, expect, it, vi } from "vitest";
import { collectPushDeviceReport } from "./push-device-client";

function browser(getHighEntropyValues?: ReturnType<typeof vi.fn>) {
  vi.stubGlobal("window", { matchMedia: () => ({ matches: true }) });
  vi.stubGlobal("navigator", {
    userAgent: "Android", platform: "Linux", maxTouchPoints: 1,
    userAgentData: getHighEntropyValues ? { platform: "Android", getHighEntropyValues } : undefined,
  });
  vi.stubGlobal("Notification", { permission: "granted" });
}
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("client device collection", () => {
  it("collects available Android model and version", async () => {
    browser(vi.fn().mockResolvedValue({ model: "Pixel 9", platformVersion: "15" }));
    expect(await collectPushDeviceReport()).toMatchObject({ model: "Pixel 9", platformVersion: "15", standalone: true });
  });
  it("supports browsers without client hints", async () => {
    browser();
    expect(await collectPushDeviceReport()).toEqual({ standalone: true, ios: false, permission: "granted" });
  });
  it("does not fail push setup when metadata access is rejected", async () => {
    browser(vi.fn().mockRejectedValue(new Error("denied")));
    expect(await collectPushDeviceReport()).not.toHaveProperty("model");
  });
  it("does not wait indefinitely for model information", async () => {
    vi.useFakeTimers();
    browser(vi.fn(() => new Promise(() => {})));
    const result = collectPushDeviceReport();
    await vi.advanceTimersByTimeAsync(800);
    expect(await result).not.toHaveProperty("model");
    expect(vi.getTimerCount()).toBe(0);
  });
});
