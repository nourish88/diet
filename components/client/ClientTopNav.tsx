"use client";

import Link from "next/link";
import { LogOut, Home, Settings, TrendingUp, Activity } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { usePathname } from "next/navigation";

export default function ClientTopNav() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { signOut } = useAuth();
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await signOut();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const navLink = (href: string, icon: React.ReactNode, label: string) => {
    const isActive = pathname === href || (pathname?.startsWith(href + "/") ?? false);
    return (
      <Link
        href={href}
        title={label}
        className={`inline-flex items-center px-2 md:px-3 py-2 text-sm font-medium rounded-lg transition ${
          isActive
            ? "text-blue-700 bg-blue-50"
            : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
        }`}
      >
        {icon}
        <span className="hidden md:inline ml-1.5">{label}</span>
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-gray-200">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <Link href="/client" className="flex items-center space-x-2.5">
            <img
              src="/ezgi_evgin-removebg-preview.png"
              alt="Logo"
              className="h-9 w-auto object-contain"
            />
            <div className="hidden md:block">
              <p className="text-sm font-semibold text-gray-800 leading-tight">
                Ezgi Evgin Beslenme
              </p>
              <p className="text-xs text-gray-400 leading-tight">
                Online Danışan Portalı
              </p>
            </div>
          </Link>

          <nav className="flex items-center gap-0.5 md:gap-1">
            {navLink("/client", <Home className="w-4 h-4" />, "Anasayfa")}
            {navLink(
              "/client/progress",
              <TrendingUp className="w-4 h-4" />,
              "Gelişim"
            )}
            {navLink(
              "/client/exercises",
              <Activity className="w-4 h-4" />,
              "Antrenman"
            )}
            {navLink(
              "/client/settings",
              <Settings className="w-4 h-4" />,
              "Ayarlar"
            )}
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              title={isLoggingOut ? "Çıkış yapılıyor..." : "Çıkış Yap"}
              className="inline-flex items-center px-2 md:px-3 py-2 text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline ml-1.5">
                {isLoggingOut ? "Çıkılıyor..." : "Çıkış"}
              </span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}
