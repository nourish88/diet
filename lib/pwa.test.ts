import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isInAppBrowser, isIOSDevice, isStandalonePWA, observePWAInstallation } from "./pwa";

let target: EventTarget;
beforeEach(() => {
  target = new EventTarget();
  vi.stubGlobal("window", target);
  vi.stubGlobal("navigator", { userAgent: "Chrome", platform: "Linux", maxTouchPoints: 0 });
});
afterEach(() => vi.unstubAllGlobals());

describe("PWA compatibility", () => {
  it("works without matchMedia or notification APIs", () => {
    const changed = vi.fn();
    const stop = observePWAInstallation(changed);
    expect(isStandalonePWA()).toBe(false);
    expect(changed).toHaveBeenLastCalledWith(false);
    target.dispatchEvent(new Event("appinstalled"));
    expect(changed).toHaveBeenLastCalledWith(true);
    stop();
    changed.mockClear();
    target.dispatchEvent(new Event("appinstalled"));
    expect(changed).not.toHaveBeenCalled();
  });

  it.each(["modern", "legacy", "none"])("observes display mode with %s listener support", (mode) => {
    const media = Object.assign(new EventTarget(), { matches: false });
    const add = vi.fn((...args: unknown[]) => media.addEventListener("change", args[args.length - 1] as EventListener));
    const remove = vi.fn((...args: unknown[]) => media.removeEventListener("change", args[args.length - 1] as EventListener));
    const query = { get matches() { return media.matches; } };
    if (mode === "modern") Object.assign(query, { addEventListener: add, removeEventListener: remove });
    if (mode === "legacy") Object.assign(query, { addListener: add, removeListener: remove });
    Object.assign(target, { matchMedia: () => query });
    const changed = vi.fn();
    const stop = observePWAInstallation(changed);
    expect(changed).toHaveBeenLastCalledWith(false);
    media.matches = true;
    if (mode === "none") target.dispatchEvent(new Event("pageshow"));
    else media.dispatchEvent(new Event("change"));
    expect(changed).toHaveBeenLastCalledWith(true);
    stop();
    changed.mockClear();
    media.dispatchEvent(new Event("change"));
    target.dispatchEvent(new Event("pageshow"));
    expect(changed).not.toHaveBeenCalled();
    if (mode !== "none") expect(remove).toHaveBeenCalledOnce();
  });

  it("recognizes iOS standalone mode without matchMedia", () => {
    vi.stubGlobal("navigator", { userAgent: "iPhone", standalone: true });
    expect(isIOSDevice()).toBe(true);
    expect(isStandalonePWA()).toBe(true);
  });

  it("recognizes iPad desktop user agents", () => {
    vi.stubGlobal("navigator", { userAgent: "Safari", platform: "MacIntel", maxTouchPoints: 5 });
    expect(isIOSDevice()).toBe(true);
  });

  it.each(["Instagram", "FBAN/FBIOS", "Android; wv) AppleWebKit", "GSA/1.0", "Line/1.0"])("recognizes embedded browser %s", (userAgent) => {
    vi.stubGlobal("navigator", { userAgent });
    expect(isInAppBrowser()).toBe(true);
  });

  it("does not mistake ordinary Chrome for an embedded browser", () => {
    expect(isInAppBrowser()).toBe(false);
  });

  it("is safe during server rendering", () => {
    vi.stubGlobal("window", undefined);
    vi.stubGlobal("navigator", undefined);
    expect(isStandalonePWA()).toBe(false);
    expect(isIOSDevice()).toBe(false);
    expect(isInAppBrowser()).toBe(false);
    expect(() => observePWAInstallation(vi.fn())()).not.toThrow();
  });
});
