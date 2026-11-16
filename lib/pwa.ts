function getStandaloneMediaQuery(): MediaQueryList | null {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia("(display-mode: standalone)")
    : null;
}

export function isStandalonePWA(): boolean {
  return typeof window !== "undefined" && (
    (typeof navigator !== "undefined" &&
      (navigator as Navigator & { standalone?: boolean }).standalone === true) ||
    getStandaloneMediaQuery()?.matches === true
  );
}

/** Installation confirmation is independent of notification/SW support. */
export function observePWAInstallation(onChange: (installed: boolean) => void) {
  if (typeof window === "undefined") return () => {};

  const display = getStandaloneMediaQuery();
  let confirmed = false;
  const update = () => onChange(confirmed || isStandalonePWA());
  const installed = () => {
    confirmed = true;
    update();
  };
  update();
  window.addEventListener("appinstalled", installed);
  window.addEventListener("pageshow", update);

  // Older Safari and Android browsers expose only addListener/removeListener.
  const modern = typeof display?.addEventListener === "function";
  if (modern) display?.addEventListener("change", update);
  else display?.addListener?.(update);

  return () => {
    window.removeEventListener("appinstalled", installed);
    window.removeEventListener("pageshow", update);
    if (modern) display?.removeEventListener?.("change", update);
    else display?.removeListener?.(update);
  };
}

export function isInAppBrowser(): boolean {
  return typeof navigator !== "undefined" &&
    /Instagram|FBAN|FBAV|Line\/|; wv\b|\bGSA\//i.test(navigator.userAgent);
}

export function isIOSDevice(): boolean {
  return typeof navigator !== "undefined" && (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function isPushSupported(): boolean {
  return typeof window !== "undefined" && window.isSecureContext &&
    "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}
