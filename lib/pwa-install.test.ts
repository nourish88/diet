import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { InstallPrompt } from "./pwa-install";

let store: typeof import("./pwa-install");
let target: EventTarget;
let storage: Map<string, string>;
let stop: () => void;
function installEvent(outcome: "accepted" | "dismissed" = "accepted") {
  return Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
    prompt: vi.fn().mockResolvedValue(undefined),
    userChoice: Promise.resolve({ outcome }),
  }) as InstallPrompt & { prompt: ReturnType<typeof vi.fn> };
}

beforeEach(async () => {
  vi.resetModules();
  storage = new Map([["unrelated-session", "keep"]]);
  target = Object.assign(new EventTarget(), {
    sessionStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    },
  });
  vi.stubGlobal("window", target);
  vi.stubGlobal("navigator", {});
  store = await import("./pwa-install");
  stop = store.observeInstallPrompt();
});
afterEach(() => { stop(); vi.unstubAllGlobals(); });

describe("installation lifecycle", () => {
  it("retains an event captured before the client card mounts and clears it on completion", () => {
    const event = installEvent();
    target.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(store.getInstallPrompt()).toBe(event);
    const changed = vi.fn();
    const unsubscribe = store.subscribeInstallPrompt(changed);
    target.dispatchEvent(new Event("appinstalled"));
    expect(store.getInstallPrompt()).toBeNull();
    expect(store.getInstallationConfirmed()).toBe(true);
    expect(changed).toHaveBeenCalledOnce();
    unsubscribe();
  });

  it("keeps installation unavailable until a callable browser event arrives", async () => {
    target.dispatchEvent(new Event("beforeinstallprompt"));
    expect(store.getInstallPrompt()).toBeNull();
    expect(await store.requestAppInstallation()).toBe("unavailable");
    expect(store.getInstallationConfirmed()).toBe(false);
  });

  it.each(["accepted", "dismissed"] as const)("does not equate %s with completed installation", async (outcome) => {
    const event = installEvent(outcome);
    target.dispatchEvent(event);
    expect(await store.requestAppInstallation()).toBe(outcome);
    expect(store.getInstallationConfirmed()).toBe(false);
    expect(store.getInstallPrompt()).toBeNull();
    expect(await store.requestAppInstallation()).toBe("unavailable");
    expect(event.prompt).toHaveBeenCalledOnce();
  });

  it("recovers from prompt failure when the browser provides another event", async () => {
    const event = installEvent();
    event.prompt.mockRejectedValueOnce(new Error("cannot install"));
    target.dispatchEvent(event);
    expect(await store.requestAppInstallation()).toBe("failed");
    expect(store.getInstallationConfirmed()).toBe(false);
    target.dispatchEvent(installEvent());
    expect(await store.requestAppInstallation()).toBe("accepted");
  });

  it("consumes the event once and preserves a new event arriving while the old choice is pending", async () => {
    let finish!: (choice: { outcome: "dismissed" }) => void;
    const event = installEvent();
    event.userChoice = new Promise((resolve) => { finish = resolve; });
    target.dispatchEvent(event);
    const pending = store.requestAppInstallation();
    expect(await store.requestAppInstallation()).toBe("unavailable");
    const next = installEvent();
    target.dispatchEvent(next);
    finish({ outcome: "dismissed" });
    await pending;
    expect(store.getInstallPrompt()).toBe(next);
    expect(event.prompt).toHaveBeenCalledOnce();
  });

  it("recognizes an already standalone app before the card mounts", () => {
    stop();
    Object.assign(target, { matchMedia: () => ({ matches: true }) });
    stop = store.observeInstallPrompt();
    expect(store.getInstallationConfirmed()).toBe(true);
  });

  it("removes listeners on cleanup", () => {
    stop();
    target.dispatchEvent(installEvent());
    target.dispatchEvent(new Event("appinstalled"));
    expect(store.getInstallPrompt()).toBeNull();
    expect(store.getInstallationConfirmed()).toBe(false);
  });
});

describe("per-tab installation help", () => {
  it("persists dismissal across page loads and can reopen without clearing other storage", async () => {
    expect(store.getInstallHelpDismissed()).toBe(false);
    store.setInstallHelpDismissed(true);
    expect(store.getInstallHelpDismissed()).toBe(true);
    vi.resetModules();
    const reloaded = await import("./pwa-install");
    expect(reloaded.getInstallHelpDismissed()).toBe(true);
    reloaded.setInstallHelpDismissed(false);
    expect(reloaded.getInstallHelpDismissed()).toBe(false);
    expect(storage.size).toBe(1);
    expect(storage.get("unrelated-session")).toBe("keep");
  });

  it("does not share dismissal with a fresh tab session", async () => {
    store.setInstallHelpDismissed(true);
    storage.clear(); // Simulate a fresh tab's separate sessionStorage.
    vi.resetModules();
    const freshTab = await import("./pwa-install");
    expect(freshTab.getInstallHelpDismissed()).toBe(false);
  });

  it("keeps help usable if sessionStorage is blocked", () => {
    Object.defineProperty(target, "sessionStorage", { get() { throw new Error("blocked"); } });
    expect(store.getInstallHelpDismissed()).toBe(false);
    store.setInstallHelpDismissed(true);
    expect(store.getInstallHelpDismissed()).toBe(true);
    store.setInstallHelpDismissed(false);
    expect(store.getInstallHelpDismissed()).toBe(false);
  });
});
