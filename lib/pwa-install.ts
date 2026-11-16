export interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let prompt: InstallPrompt | null = null;
const listeners = new Set<() => void>();

export function getInstallPrompt() { return prompt; }
export function subscribeInstallPrompt(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function clearInstallPrompt() {
  prompt = null;
  listeners.forEach((listener) => listener());
}

/** Capture early: auth loading can delay mounting the client install card. */
export function observeInstallPrompt() {
  const capture = (event: Event) => {
    event.preventDefault();
    prompt = event as InstallPrompt;
    listeners.forEach((listener) => listener());
  };
  window.addEventListener("beforeinstallprompt", capture);
  window.addEventListener("appinstalled", clearInstallPrompt);
  return () => {
    window.removeEventListener("beforeinstallprompt", capture);
    window.removeEventListener("appinstalled", clearInstallPrompt);
  };
}
