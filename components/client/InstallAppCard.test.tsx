// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let React: typeof import("react");
let ui: typeof import("@testing-library/react/pure");
let Card: typeof import("./InstallAppCard").default;
let HelpButton: typeof import("./InstallAppCard").InstallAppHelpButton;
let store: typeof import("@/lib/pwa-install");
let stop: () => void;

beforeEach(async () => {
  vi.resetModules();
  window.sessionStorage.clear();
  vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue("Android Chrome");
  vi.stubGlobal("matchMedia", undefined);
  React = await import("react");
  ui = await import("@testing-library/react/pure");
  store = await import("@/lib/pwa-install");
  ({ default: Card, InstallAppHelpButton: HelpButton } = await import("./InstallAppCard"));
  stop = store.observeInstallPrompt();
});
afterEach(() => {
  ui.cleanup();
  stop();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function renderHelp() {
  return ui.render(React.createElement("div", null,
    React.createElement(Card),
    React.createElement(HelpButton),
    React.createElement("button", { type: "button" }, "Diyetimi görüntüle"),
  ));
}

async function capturePrompt(outcome: "accepted" | "dismissed", fails = false) {
  const event = Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
    prompt: fails ? vi.fn().mockRejectedValue(new Error("failed")) : vi.fn().mockResolvedValue(undefined),
    userChoice: Promise.resolve({ outcome }),
  });
  await ui.act(async () => { window.dispatchEvent(event); });
  return event;
}

describe("installation help UI", () => {
  it("keeps browser use available without matchMedia, SW, push or an install event", () => {
    renderHelp();
    expect(ui.screen.queryByRole("button", { name: "Uygulamayı Yükle" })).toBeNull();
    expect(ui.screen.getByText(/Chrome veya Samsung Internet menüsünde/)).toBeTruthy();
    ui.fireEvent.click(ui.screen.getByRole("button", { name: "Tarayıcıdan devam et" }));
    expect(ui.screen.queryByRole("region", { name: "Uygulama kurulumu" })).toBeNull();
    expect(ui.screen.getByRole("button", { name: "Diyetimi görüntüle" })).toBeTruthy();
  });

  it("keeps dismissal across remounts and reopens from settings", () => {
    const rendered = renderHelp();
    ui.fireEvent.click(ui.screen.getByRole("button", { name: "Tarayıcıdan devam et" }));
    rendered.unmount();
    renderHelp();
    expect(ui.screen.queryByRole("region", { name: "Uygulama kurulumu" })).toBeNull();
    ui.fireEvent.click(ui.screen.getByRole("button", { name: "Kurulum yardımını aç" }));
    expect(ui.screen.getByRole("region", { name: "Uygulama kurulumu" })).toBeTruthy();
  });

  it("allows continuing and reopening when session storage is blocked", () => {
    vi.spyOn(window, "sessionStorage", "get").mockImplementation(() => { throw new Error("blocked"); });
    renderHelp();
    ui.fireEvent.click(ui.screen.getByRole("button", { name: "Tarayıcıdan devam et" }));
    ui.fireEvent.click(ui.screen.getByRole("button", { name: "Kurulum yardımını aç" }));
    expect(ui.screen.getByRole("region", { name: "Uygulama kurulumu" })).toBeTruthy();
  });

  it.each(["accepted", "dismissed"] as const)("keeps the card after %s and only hides it on installation confirmation", async (outcome) => {
    renderHelp();
    const event = await capturePrompt(outcome);
    ui.fireEvent.click(ui.screen.getByRole("button", { name: "Uygulamayı Yükle" }));
    await ui.waitFor(() => expect(ui.screen.getByRole("status").textContent).toContain(outcome === "accepted" ? "isteğiniz tarayıcıya iletildi" : "penceresi kapatıldı"));
    expect(ui.screen.getByRole("region", { name: "Uygulama kurulumu" })).toBeTruthy();
    expect(ui.screen.queryByRole("button", { name: "Uygulamayı Yükle" })).toBeNull();
    expect(event.prompt).toHaveBeenCalledOnce();
    await ui.act(async () => { window.dispatchEvent(new Event("appinstalled")); });
    expect(ui.screen.queryByRole("region", { name: "Uygulama kurulumu" })).toBeNull();
    expect(ui.screen.queryByRole("button", { name: "Kurulum yardımını aç" })).toBeNull();
  });

  it("allows retry after failure when a new event arrives", async () => {
    renderHelp();
    await capturePrompt("accepted", true);
    ui.fireEvent.click(ui.screen.getByRole("button", { name: "Uygulamayı Yükle" }));
    await ui.waitFor(() => expect(ui.screen.getByRole("alert").textContent).toContain("açılamadı"));
    expect(ui.screen.getByRole("button", { name: "Tarayıcıdan devam et" })).toBeTruthy();
    await capturePrompt("accepted");
    const button = ui.screen.getByRole("button", { name: "Uygulamayı Yükle" }) as HTMLButtonElement;
    expect(button.disabled).toBe(false);
  });

  it("still allows browser use while a choice promise remains pending", async () => {
    renderHelp();
    await ui.act(async () => {
      window.dispatchEvent(Object.assign(new Event("beforeinstallprompt"), {
        prompt: vi.fn().mockResolvedValue(undefined), userChoice: new Promise(() => {}),
      }));
    });
    ui.fireEvent.click(ui.screen.getByRole("button", { name: "Uygulamayı Yükle" }));
    ui.fireEvent.click(ui.screen.getByRole("button", { name: "Tarayıcıdan devam et" }));
    expect(ui.screen.queryByRole("region", { name: "Uygulama kurulumu" })).toBeNull();
    expect(ui.screen.getByRole("button", { name: "Diyetimi görüntüle" })).toBeTruthy();
  });

  it("shows Safari home screen instructions on iPhone without requiring push support", () => {
    vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue("iPhone Safari");
    renderHelp();
    expect(ui.screen.getByText(/Safari’de Paylaş → Ana Ekrana Ekle/)).toBeTruthy();
    expect(ui.screen.getByRole("button", { name: "Tarayıcıdan devam et" })).toBeTruthy();
  });

  it("hides the card when already launched standalone", async () => {
    stop();
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    stop = store.observeInstallPrompt();
    renderHelp();
    expect(ui.screen.queryByRole("region", { name: "Uygulama kurulumu" })).toBeNull();
  });

  it.each(["missing", "rejected"])("provides a selectable link when clipboard access is %s", async (clipboardState) => {
    vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue("Android; wv) Instagram");
    Object.defineProperty(window.navigator, "clipboard", { configurable: true, value: clipboardState === "missing" ? undefined : { writeText: vi.fn().mockRejectedValue(new Error("denied")) } });
    renderHelp();
    await capturePrompt("accepted");
    expect(ui.screen.queryByRole("button", { name: "Uygulamayı Yükle" })).toBeNull();
    ui.fireEvent.click(ui.screen.getByRole("button", { name: "Bağlantıyı kopyala" }));
    const input = await ui.screen.findByRole("textbox", { name: "Giriş bağlantısı" }) as HTMLInputElement;
    expect(input.value).toBe(new URL("/login", window.location.origin).href);
    expect(input.readOnly).toBe(true);
  });

  it("copies only the public login URL, excluding private paths and query strings", async () => {
    window.history.replaceState(null, "", "/client/diets/123?token=private#secret");
    vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue("Instagram");
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, "clipboard", { configurable: true, value: { writeText } });
    renderHelp();
    ui.fireEvent.click(ui.screen.getByRole("button", { name: "Bağlantıyı kopyala" }));
    await ui.waitFor(() => expect(ui.screen.getByRole("status").textContent).toContain("kopyalandı"));
    expect(writeText).toHaveBeenCalledWith(new URL("/login", window.location.origin).href);
  });

  it("does not interrupt page rendering when service worker registration throws", async () => {
    const register = vi.fn(() => { throw new Error("blocked"); });
    Object.defineProperty(window.navigator, "serviceWorker", { configurable: true, value: { register } });
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const { default: Provider } = await import("@/components/providers/ServiceWorkerProvider");
    ui.render(React.createElement("div", null, React.createElement(Provider), React.createElement(Card), "Danışan işlemleri"));
    await ui.waitFor(() => expect(logged).toHaveBeenCalled());
    expect(ui.screen.getByText("Danışan işlemleri")).toBeTruthy();
    expect(ui.screen.getByRole("button", { name: "Tarayıcıdan devam et" })).toBeTruthy();
    delete (window.navigator as unknown as Record<string, unknown>).serviceWorker;
  });
});
