"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { apiClient } from "@/lib/api-client";
import ClientTopNav from "@/components/client/ClientTopNav";
import { consentRequired } from "@/lib/kvkk-consent-config";

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

  useEffect(() => {
    checkAuth();
  }, [pathname]);

  const checkAuth = async () => {
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

      const c = data.user.client;
      const needsKvkk = consentRequired(
        c?.kvkkPortalConsentAt ?? null,
        c?.kvkkPortalConsentVersion ?? null
      );

      if (needsKvkk && pathname !== KVKK_PATH) {
        router.replace(KVKK_PATH);
        return;
      }

      if (!needsKvkk && pathname === KVKK_PATH) {
        router.replace("/client");
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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  const hideNav = pathname === KVKK_PATH;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {!hideNav && <ClientTopNav />}
      <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
