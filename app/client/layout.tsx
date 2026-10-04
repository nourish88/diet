"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { apiClient } from "@/lib/api-client";
import ClientTopNav from "@/components/client/ClientTopNav";
import type { PrivacyStatus } from "@/lib/kvkk-consent-config";

interface SyncUser {
  role: string;
  isApproved: boolean;
  client?: {
    kvkkPortalConsentAt: string | null;
    kvkkPortalConsentVersion: string | null;
  } | null;
}

const KVKK_PATH = "/client/kvkk-onay";

interface ClientLayoutProps {
  children: React.ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [healthUnavailable, setHealthUnavailable] = useState(false);
  const [privacyError, setPrivacyError] = useState(false);

  useEffect(() => {
    checkAuth();
  }, [pathname]);

  const checkAuth = async () => {
    setPrivacyError(false);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      const data = await apiClient.get<{ success?: boolean; user: SyncUser }>(
        "/auth/sync"
      );

      if (data.user.role !== "client") {
        router.push("/");
        return;
      }

      if (!data.user.isApproved) {
        router.push("/pending-approval");
        return;
      }

      let privacy: PrivacyStatus;
      try {
        privacy = await apiClient.get<PrivacyStatus>("/client/consent/kvkk");
      } catch {
        setPrivacyError(true);
        return;
      }
      setHealthUnavailable(!privacy.canProcessHealth);
      if (!privacy.noticeAcknowledged && pathname !== KVKK_PATH && pathname !== "/client/settings") {
        router.replace(KVKK_PATH);
        return;
      }
    } catch (error) {
      console.error("Auth error:", error);
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-brand-soft/40 via-background to-background dark:from-brand-soft/20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-soft/40 via-background to-background dark:from-brand-soft/20">
      <ClientTopNav />
      {healthUnavailable && pathname !== KVKK_PATH && (
        <p className="max-w-5xl mx-auto px-4 pt-4 text-sm text-muted-foreground">
          Yeni sağlık verisi paylaşımı kapalı. <a className="text-brand underline" href={KVKK_PATH}>KVKK ve haklarım</a> ekranından tercihlerinizi yönetebilirsiniz.
        </p>
      )}
      <main className="max-w-5xl mx-auto px-4 pt-6 pb-24 md:py-8">{privacyError ? <div role="alert" className="space-y-3"><p>KVKK bilgileri şu anda doğrulanamadı. Lütfen yeniden deneyin.</p><button className="text-brand underline" onClick={checkAuth}>Yeniden dene</button></div> : children}</main>
    </div>
  );
}
