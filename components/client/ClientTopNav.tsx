"use client";

import Link from "next/link";
import { LogOut, Home, Settings, TrendingUp, Activity } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { usePathname } from "next/navigation";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";

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
        className={`inline-flex items-center px-2 md:px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
          isActive
            ? "text-brand bg-brand-soft"
            : "text-muted-foreground hover:text-foreground hover:bg-accent"
        }`}
      >
        {icon}
        <span className="hidden md:inline ml-1.5">{label}</span>
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-30 bg-card/90 backdrop-blur border-b border-border">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <Logo size="sm" href="/client" showText />

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
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              title={isLoggingOut ? "Çıkış yapılıyor..." : "Çıkış Yap"}
              className="inline-flex items-center px-2 md:px-3 py-2 text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-50"
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
