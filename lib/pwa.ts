export function isStandalonePWA(): boolean {
  return typeof window !== "undefined" && (
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches
  );
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
