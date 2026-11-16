import { observePWAInstallation } from "./pwa";

export interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let prompt: InstallPrompt | null = null;
let installationConfirmed = false;
let helpDismissed: boolean | undefined;
const HELP_DISMISSED_KEY = "diet-install-help-dismissed";
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function getInstallPrompt() { return prompt; }
export function subscribeInstallPrompt(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function clearInstallPrompt() {
  prompt = null;
  notify();
}

export function getInstallationConfirmed() { return installationConfirmed; }

export function getInstallHelpDismissed(): boolean {
  if (typeof window === "undefined") return false;
  if (helpDismissed === undefined) {
    try {
      helpDismissed = window.sessionStorage.getItem(HELP_DISMISSED_KEY) === "true";
    } catch {
      helpDismissed = false;
    }
  }
  return helpDismissed;
}

export function setInstallHelpDismissed(dismissed: boolean) {
  helpDismissed = dismissed;
  try {
    if (dismissed) window.sessionStorage.setItem(HELP_DISMISSED_KEY, "true");
    else window.sessionStorage.removeItem(HELP_DISMISSED_KEY);
  } catch {
    // Storage can be blocked. Keep the preference in memory for this page.
  }
  notify();
}

export type InstallRequestResult = "accepted" | "dismissed" | "unavailable" | "failed";

export async function requestAppInstallation(): Promise<InstallRequestResult> {
  const currentPrompt = prompt;
  if (!currentPrompt) return "unavailable";
  // Events are single-use. Consume before awaiting; never clear a newer event.
  clearInstallPrompt();
  try {
    await currentPrompt.prompt();
    const choice = await currentPrompt.userChoice;
    return choice.outcome;
  } catch {
    return "failed";
  }
}

/** Capture early: auth loading can delay mounting the client install card. */
export function observeInstallPrompt() {
  if (typeof window === "undefined") return () => {};
  const capture = (event: Event) => {
    if (typeof (event as InstallPrompt).prompt !== "function") return;
    event.preventDefault();
    prompt = event as InstallPrompt;
    notify();
  };
  const stopObservingInstallation = observePWAInstallation((installed) => {
    installationConfirmed = installationConfirmed || installed;
    if (installationConfirmed) prompt = null;
    notify();
  });
  window.addEventListener("beforeinstallprompt", capture);
  return () => {
    window.removeEventListener("beforeinstallprompt", capture);
    stopObservingInstallation();
  };
}
