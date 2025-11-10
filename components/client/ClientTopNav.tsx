"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Home, Settings } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";

export default function ClientTopNav() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const supabase = createClient();

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await supabase.auth.signOut();
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-gray-200">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/client" className="flex items-center space-x-3">
            <img
              src="/ezgi_evgin-removebg-preview.png"
              alt="Logo"
              className="h-10 w-auto object-contain"
            />
            {/* Hide title text on mobile/PWA (screens smaller than md) */}
            <div className="hidden md:block">
              <p className="text-sm font-semibold text-gray-800">
                Ezgi Evgin Beslenme
              </p>
              <p className="text-xs text-gray-500">
                Online Danışan Portalı
              </p>
            </div>
          </Link>

          <nav className="flex items-center space-x-1 md:space-x-2">
            <Link
              href="/client"
              className="inline-flex items-center px-2 md:px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition"
              title="Anasayfa"
            >
              <Home className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Anasayfa</span>
            </Link>
            <Link
              href="/client/settings"
              className="inline-flex items-center px-2 md:px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition"
              title="Ayarlar"
            >
              <Settings className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Ayarlar</span>
            </Link>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="inline-flex items-center px-2 md:px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50"
              title={isLoggingOut ? "Çıkış yapılıyor..." : "Çıkış Yap"}
            >
              <LogOut className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">
                {isLoggingOut ? "Çıkış yapılıyor..." : "Çıkış Yap"}
              </span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}



