// Limit post-login and post-consent navigation to the client portal.
export function clientReturnPath(candidate: string | null): string {
  if (candidate?.startsWith("/") && !candidate.startsWith("//") && !candidate.includes("\\") && !/[\u0000-\u001f]/.test(candidate)) {
    const base = "https://portal.invalid";
    const url = new URL(candidate, base);
    if (url.origin === base && (url.pathname === "/client" || url.pathname.startsWith("/client/"))) {
      return url.pathname + url.search + url.hash;
    }
  }
  return "/client";
}

export function clientGateUrl(gate: "/login" | "/client/kvkk-onay", current: Location): string {
  const path = clientReturnPath(current.pathname + current.search + current.hash);
  return path === "/client" ? gate : `${gate}?next=${encodeURIComponent(path)}`;
}

export function clientDestination(): string {
  if (typeof window === "undefined") return "/client";
  return clientReturnPath(new URLSearchParams(window.location.search).get("next"));
}
