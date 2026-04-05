"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, CheckCircle, LogOut, Smartphone } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import { apiClient } from "@/lib/api-client";

export default function PendingApprovalPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      const data = await apiClient.get<{
        user: { isApproved: boolean; role: string };
      }>("/auth/sync");

      if (data.user.isApproved) {
        if (data.user.role === "client") {
          router.push("/client");
        } else {
          router.push("/");
        }
      }
    } catch (error) {
      console.error("Error checking status:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-10 h-10 text-yellow-600" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 text-center mb-4">
            Profil Eşleşmesi Bekleniyor
          </h1>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Smartphone className="w-4 h-4 text-blue-700" />
              <p className="text-sm text-blue-900 font-medium">
                Telefon ile giriş adımlarını tamamlayın
              </p>
            </div>
            <p className="text-xs text-blue-800">
              Giriş ekranında telefon numaranızı girip profilinizi seçin ve onaylayın.
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => router.push("/login")}
              className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <CheckCircle className="w-5 h-5" />
              <span>Giriş Ekranına Git</span>
            </button>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center space-x-2 bg-white border-2 border-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              <LogOut className="w-5 h-5" />
              <span>Çıkış Yap</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
