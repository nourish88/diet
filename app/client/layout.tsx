"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api-client";
import { describeRequestError } from "@/lib/http-request";
import InstallAppCard from "@/components/client/InstallAppCard";
import ClientTopNav from "@/components/client/ClientTopNav";
import { AuthSyncNotice } from "@/components/AuthSyncNotice";
import type { PrivacyStatus } from "@/lib/kvkk-consent-config";

const KVKK_PATH = "/client/kvkk-onay";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, databaseUser, loading: authLoading, syncError } = useAuth();
  const [privacy, setPrivacy] = useState<PrivacyStatus | null>(null);
  const [privacyError, setPrivacyError] = useState<string | null>(null);
  const [checkedPath, setCheckedPath] = useState<string | null>(null);
  const [retryVersion, setRetryVersion] = useState(0);
  const userId = databaseUser?.id;
  const role = databaseUser?.role;
  const approved = databaseUser?.isApproved;

  useEffect(() => {
    setCheckedPath(null);
    setPrivacyError(null);
    if (authLoading || syncError) return;
    if (!user) { router.replace("/login"); return; }
    if (!userId) return;
    if (role !== "client") { router.replace("/"); return; }
    if (!approved) { router.replace("/pending-approval"); return; }
    const controller = new AbortController();
    apiClient.get<PrivacyStatus>("/client/consent/kvkk", { signal: controller.signal }).then((result) => {
      if (controller.signal.aborted) return;
      setPrivacy(result);
      if (!result.noticeAcknowledged && pathname !== KVKK_PATH && pathname !== "/client/settings") {
        router.replace(KVKK_PATH);
        return;
      }
      setCheckedPath(pathname);
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setPrivacyError(describeRequestError(error));
    });
    return () => controller.abort();
  }, [pathname, user, userId, role, approved, authLoading, syncError, retryVersion, router]);

  if (syncError) return <div className="max-w-lg mx-auto p-6"><AuthSyncNotice /></div>;
  if (privacyError) return <div role="alert" className="max-w-lg mx-auto p-6 space-y-3">
    <p>Hesap erişimi şu anda doğrulanamadı. Oturumunuz kapatılmadı.</p>
    <p className="text-sm text-muted-foreground">{privacyError}</p>
    <button className="text-brand underline" onClick={() => setRetryVersion((value) => value + 1)}>Yeniden dene</button>
  </div>;
  if (authLoading || checkedPath !== pathname || !privacy || !userId || !approved || role !== "client") {
    return <div className="flex items-center justify-center min-h-screen"><p>Hesap bilgileri yükleniyor…</p></div>;
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-soft/40 via-background to-background dark:from-brand-soft/20">
      <ClientTopNav />
      {!privacy.canProcessHealth && pathname !== KVKK_PATH && (
        <p className="max-w-5xl mx-auto px-4 pt-4 text-sm text-muted-foreground">
          Yeni sağlık verisi paylaşımı kapalı. <a className="text-brand underline" href={KVKK_PATH}>KVKK ve haklarım</a> ekranından tercihlerinizi yönetebilirsiniz.
        </p>
      )}
      <main className="max-w-5xl mx-auto px-4 pt-6 pb-24 md:py-8"><InstallAppCard />{children}</main>
    </div>
  );
}
