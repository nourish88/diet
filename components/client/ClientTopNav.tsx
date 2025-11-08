"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Home } from "lucide-react";
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
            <div>
              <p className="text-sm font-semibold text-gray-800">
                Ezgi Evgin Beslenme
              </p>
              <p className="text-xs text-gray-500">
                Online Danışan Portalı
              </p>
            </div>
          </Link>

          <nav className="flex items-center space-x-2">
            <Link
              href="/client"
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition"
            >
              <Home className="w-4 h-4 mr-2" />
              Anasayfa
            </Link>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50"
            >
              <LogOut className="w-4 h-4 mr-2" />
              {isLoggingOut ? "Çıkış yapılıyor..." : "Çıkış Yap"}
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}

