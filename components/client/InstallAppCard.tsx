"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isInAppBrowser, isIOSDevice } from "@/lib/pwa";
import {
  getInstallationConfirmed,
  getInstallHelpDismissed,
  getInstallPrompt,
  requestAppInstallation,
  setInstallHelpDismissed,
  subscribeInstallPrompt,
  type InstallRequestResult,
} from "@/lib/pwa-install";

const getServerFalse = () => false;
const getServerPrompt = () => null;
const HELP_ID = "app-install-help";
const installMessages: Record<InstallRequestResult, string> = {
  accepted: "Kurulum isteğiniz tarayıcıya iletildi. Tamamlandığında ana ekranınızdaki simgeden açabilirsiniz. Simge oluşmazsa tarayıcı menüsünden yeniden deneyebilir veya burada devam edebilirsiniz.",
  dismissed: "Kurulum penceresi kapatıldı. Tarayıcıdan kullanmaya devam edebilir veya tarayıcı menüsünden yeniden yüklemeyi deneyebilirsiniz.",
  unavailable: "Yükleme penceresi şu anda hazır değil. Tarayıcı menüsünden ana ekrana eklemeyi deneyebilir veya burada devam edebilirsiniz.",
  failed: "Yükleme penceresi açılamadı. Tarayıcı menüsünden ana ekrana eklemeyi deneyebilir veya burada devam edebilirsiniz.",
};

export function InstallAppHelpButton() {
  const installed = useSyncExternalStore(subscribeInstallPrompt, getInstallationConfirmed, getServerFalse);
  if (installed) return null;

  const reopen = () => {
    setInstallHelpDismissed(false);
    window.requestAnimationFrame(() => {
      const help = document.getElementById(HELP_ID);
      help?.focus();
      help?.scrollIntoView?.({ block: "start" });
    });
  };

  return <Button type="button" variant="outline" onClick={reopen}>Kurulum yardımını aç</Button>;
}

export default function InstallAppCard() {
  const [platform, setPlatform] = useState<"ios" | "other" | null>(null);
  const [inAppBrowser, setInAppBrowser] = useState(false);
  const [loginUrl, setLoginUrl] = useState("");
  const prompt = useSyncExternalStore(subscribeInstallPrompt, getInstallPrompt, getServerPrompt);
  const installed = useSyncExternalStore(subscribeInstallPrompt, getInstallationConfirmed, getServerFalse);
  const dismissed = useSyncExternalStore(subscribeInstallPrompt, getInstallHelpDismissed, getServerFalse);
  const [installing, setInstalling] = useState(false);
  const [result, setResult] = useState<InstallRequestResult | null>(null);
  const [copyStatus, setCopyStatus] = useState<"copied" | "manual" | null>(null);

  useEffect(() => {
    setPlatform(isIOSDevice() ? "ios" : "other");
    setInAppBrowser(isInAppBrowser());
    // Never copy private page paths, auth tokens, or query parameters.
    setLoginUrl(new URL("/login", window.location.origin).href);
  }, []);

  const install = async () => {
    if (installing) return;
    setInstalling(true);
    setResult(null);
    try {
      setResult(await requestAppInstallation());
    } finally {
      setInstalling(false);
    }
  };

  const copyLink = async () => {
    try {
      if (!navigator.clipboard?.writeText) {
        setCopyStatus("manual");
        return;
      }
      await navigator.clipboard.writeText(loginUrl);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("manual");
    }
  };

  if (!platform || installed || dismissed) return null;

  return (
    <section id={HELP_ID} tabIndex={-1} aria-label="Uygulama kurulumu" className="rounded-xl border bg-card p-4 space-y-3 mb-6 scroll-mt-24">
      <h2 className="font-semibold flex items-center gap-2"><Download className="h-5 w-5" /> Uygulamayı yükleyin</h2>
      <p className="text-sm text-muted-foreground">Kurulum isteğe bağlıdır. Diyetinize ve danışan işlemlerinize bu tarayıcıdan da ulaşabilirsiniz.</p>
      {inAppBrowser ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Bu bağlantı bir uygulamanın içinden açılmış görünüyor. Menüde varsa {platform === "ios" ? "Safari’de Aç" : "Tarayıcıda Aç"} seçeneğini kullanın. Seçenek yoksa bağlantıyı kopyalayıp {platform === "ios" ? "Safari’ye" : "Chrome veya Samsung Internet’e"} yapıştırın.</p>
          <Button type="button" variant="outline" onClick={copyLink}>Bağlantıyı kopyala</Button>
          {copyStatus === "copied" && <p role="status" className="text-sm">Giriş bağlantısı kopyalandı. Tarayıcınıza yapıştırabilirsiniz.</p>}
          {copyStatus === "manual" && (
            <label className="block space-y-2 text-sm">
              <span role="status">Otomatik kopyalanamadı. Giriş bağlantısını seçip kopyalayın:</span>
              <Input aria-label="Giriş bağlantısı" readOnly value={loginUrl} onFocus={(event) => event.currentTarget.select()} />
            </label>
          )}
        </div>
      ) : platform === "ios" ? (
        <p className="text-sm text-muted-foreground">Safari’de Paylaş → Ana Ekrana Ekle → Ekle adımlarını izleyin. Ardından ana ekranınızdaki Diyetisyen Ezgi simgesinden açın. Bildirimler için iOS/iPadOS 16.4 veya üzeri gerekir; bildirim iznini ayrıca açabilirsiniz.</p>
      ) : (
        <p className="text-sm text-muted-foreground">Chrome veya Samsung Internet menüsünde Uygulamayı yükle ya da Ana ekrana ekle seçeneğini arayın. Tarayıcınıza göre uygulama veya kısayol eklenebilir. Seçenek görünmüyorsa ya da kurulum tamamlanmıyorsa bu tarayıcıdan devam edebilirsiniz.</p>
      )}
      <div className="flex flex-wrap gap-2">
        {prompt && !inAppBrowser && <Button type="button" onClick={install} disabled={installing}>{installing ? "Kurulum penceresi açılıyor…" : "Uygulamayı Yükle"}</Button>}
        <Button type="button" variant="outline" onClick={() => setInstallHelpDismissed(true)}>Tarayıcıdan devam et</Button>
      </div>
      {result && <p role={result === "failed" ? "alert" : "status"} className="text-sm text-muted-foreground">{installMessages[result]}</p>}
      <p className="text-xs text-muted-foreground">Kurulum yardımını Ayarlar’dan yeniden açabilirsiniz.</p>
    </section>
  );
}
