import { afterEach, expect, it, vi } from "vitest";
import { clearInstallPrompt, getInstallPrompt, observeInstallPrompt, subscribeInstallPrompt } from "./pwa-install";

afterEach(() => { clearInstallPrompt(); vi.unstubAllGlobals(); });
it("retains an install event captured before the client card mounts", () => {
  const target = new EventTarget();
  vi.stubGlobal("window", target);
  const stop = observeInstallPrompt();
  const event = new Event("beforeinstallprompt", { cancelable: true });
  target.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true);
  expect(getInstallPrompt()).toBe(event);
  const changed = vi.fn();
  const unsubscribe = subscribeInstallPrompt(changed);
  target.dispatchEvent(new Event("appinstalled"));
  expect(getInstallPrompt()).toBeNull();
  expect(changed).toHaveBeenCalledOnce();
  unsubscribe();
  stop();
});
