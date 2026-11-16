"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isIOSDevice, isStandalonePWA } from "@/lib/pwa";
import { clearInstallPrompt, getInstallPrompt, subscribeInstallPrompt } from "@/lib/pwa-install";

export default function InstallAppCard() {
  const [platform, setPlatform] = useState<"ios" | "other" | null>(null);
  const [installed, setInstalled] = useState(false);
  const [inAppBrowser, setInAppBrowser] = useState(false);
  const prompt = useSyncExternalStore(subscribeInstallPrompt, getInstallPrompt, () => null);
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setPlatform(isIOSDevice() ? "ios" : "other");
    setInAppBrowser(/Instagram|FBAN|FBAV|Line\/|wv\)/i.test(navigator.userAgent));
    const display = window.matchMedia("(display-mode: standalone)");
    const update = () => setInstalled(isStandalonePWA());
    const installed = () => setInstalled(true);
    update();
    window.addEventListener("appinstalled", installed);
    display.addEventListener("change", update);
    return () => {
      window.removeEventListener("appinstalled", installed);
      display.removeEventListener("change", update);
    };
  }, []);

  const install = async () => {
    if (!prompt || installing) return;
    setInstalling(true);
    setError("");
    try {
      await prompt.prompt();
      await prompt.userChoice;
    } catch {
      setError("Yükleme penceresi açılamadı. Tarayıcı menüsünden ana ekrana ekleyebilirsiniz.");
    } finally {
      clearInstallPrompt();
      setInstalling(false);
    }
  };

  if (!platform || installed) return null;
  return (
    <section aria-label="Uygulama kurulumu" className="rounded-xl border bg-card p-4 space-y-3 mb-6">
      <h2 className="font-semibold flex items-center gap-2"><Download className="h-5 w-5" /> Uygulamayı yükleyin</h2>
      {inAppBrowser ? (
        <p className="text-sm text-muted-foreground">Bu bağlantıyı uygulama içi tarayıcıda açtınız. Menüden {platform === "ios" ? "Safari’de Aç" : "Chrome’da Aç / Tarayıcıda Aç"} seçeneğini kullanın, ardından ana ekrana ekleyin.</p>
      ) : platform === "ios" ? (
        <p className="text-sm text-muted-foreground">Safari’de Paylaş menüsünü açın → Ana Ekrana Ekle → Ekle. Ardından ana ekranınızdaki Diyetisyen Ezgi simgesinden açın. Bildirimler için iOS/iPadOS 16.4 veya üzeri gerekir.</p>
      ) : (
        <p className="text-sm text-muted-foreground">Tarayıcı menüsünden Uygulamayı yükle veya Ana ekrana ekle seçeneğini kullanın. Yükleme seçeneği görünmüyorsa bağlantıyı güncel Chrome veya Edge’de açın.</p>
      )}
      {prompt && !inAppBrowser && <Button onClick={install} disabled={installing}>{installing ? "Yükleniyor…" : "Uygulamayı Yükle"}</Button>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </section>
  );
}
