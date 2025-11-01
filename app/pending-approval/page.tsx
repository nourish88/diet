"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, CheckCircle, Mail, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";

export default function PendingApprovalPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
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

      const response = await fetch("/api/auth/sync", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        
        // If approved, redirect to appropriate page
        if (data.user.isApproved) {
          if (data.user.role === "client") {
            router.push("/client");
          } else {
            router.push("/");
          }
          return;
        }

        setUser(data.user);
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
          {/* Icon */}
          <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-10 h-10 text-yellow-600" />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-4">
            Hesabınız Onay Bekliyor
          </h1>

          {/* Reference Code */}
          {user?.referenceCode && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-900 font-medium mb-2">
                Referans Kodunuz:
              </p>
              <div className="bg-white border-2 border-blue-600 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-blue-600 tracking-wider">
                  {user.referenceCode}
                </p>
              </div>
              <p className="text-xs text-blue-700 mt-2">
                Bu kodu diyetisyeninize verin
              </p>
            </div>
          )}

          {/* Instructions */}
          <div className="space-y-4 mb-6">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-blue-600 font-bold text-sm">1</span>
              </div>
              <div>
                <p className="text-sm text-gray-700">
                  <strong>Referans kodunuzu</strong> diyetisyeninizle paylaşın
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-blue-600 font-bold text-sm">2</span>
              </div>
              <div>
                <p className="text-sm text-gray-700">
                  Diyetisyeniniz kodu kullanarak sizi <strong>mevcut danışan kaydınızla eşleştirecek</strong>
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-blue-600 font-bold text-sm">3</span>
              </div>
              <div>
                <p className="text-sm text-gray-700">
                  Onaylandıktan sonra <strong>beslenme programlarınıza erişebileceksiniz</strong>
                </p>
              </div>
            </div>
          </div>

          {/* User Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
              <Mail className="w-4 h-4" />
              <span>{user?.email}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={() => checkStatus()}
              className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <CheckCircle className="w-5 h-5" />
              <span>Durumu Kontrol Et</span>
            </button>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center space-x-2 bg-white border-2 border-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              <LogOut className="w-5 h-5" />
              <span>Çıkış Yap</span>
            </button>
          </div>

          {/* Help */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Sorun mu yaşıyorsunuz? Diyetisyeninizle iletişime geçin.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

