"use client";

import Link from "next/link";
import {
  Activity,
  Bell,
  CircleUserRound,
  Home,
  LogOut,
  MessageCircle,
  MoreHorizontal,
  Settings,
  Star,
  TrendingUp,
  UtensilsCrossed,
} from "lucide-react";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api-client";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const moreRoutes = ["/client/exercises", "/client/review", "/client/settings"];

export default function ClientTopNav() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { signOut } = useAuth();
  const pathname = usePathname();
  const { data: notificationData } = useQuery({
    queryKey: ["client-notifications"],
    queryFn: () =>
      apiClient.get<{ notifications: unknown[]; unreadCount: number }>(
        "/client/portal/notifications",
      ),
    refetchInterval: 30_000,
  });

  const isActive = (href: string) =>
    href === "/client"
      ? pathname === href
      : pathname === href || pathname?.startsWith(`${href}/`);
  const isMoreActive = moreRoutes.some((href) => isActive(href));

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

  const desktopLink = (href: string, icon: React.ReactNode, label: string) => (
    <Link
      href={href}
      title={label}
      className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
        isActive(href)
          ? "text-brand bg-brand-soft"
          : "text-muted-foreground hover:text-foreground hover:bg-accent"
      }`}
    >
      {icon}
      <span className="ml-1.5">{label}</span>
    </Link>
  );

  const notificationIcon = (size = "h-5 w-5") => (
    <span className="relative inline-flex">
      <Bell className={size} />
      {!!notificationData?.unreadCount && (
        <span className="absolute -right-2.5 -top-2.5 min-w-4 h-4 px-1 rounded-full bg-destructive text-[10px] leading-4 text-white text-center font-bold ring-2 ring-card">
          {notificationData.unreadCount > 9 ? "9+" : notificationData.unreadCount}
        </span>
      )}
    </span>
  );

  const moreMenu = (trigger: React.ReactNode, side: "top" | "bottom" = "bottom") => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" side={side} className="w-56 p-2">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Daha Fazla</DropdownMenuLabel>
        <DropdownMenuItem asChild><Link href="/client/exercises" className="py-2.5"><Activity className="h-4 w-4 mr-2" />Antrenman</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link href="/client/review" className="py-2.5"><Star className="h-4 w-4 mr-2" />Yorum &amp; Paylaş</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link href="/client/settings" className="py-2.5"><Settings className="h-4 w-4 mr-2" />Ayarlar</Link></DropdownMenuItem>
        <div className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm">
          <span>Tema</span><ThemeToggle />
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} disabled={isLoggingOut} className="py-2.5 text-destructive focus:text-destructive">
          <LogOut className="h-4 w-4 mr-2" />{isLoggingOut ? "Çıkılıyor..." : "Çıkış Yap"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const bottomLink = (href: string, icon: React.ReactNode, label: string) => (
    <Link
      href={href}
      aria-current={isActive(href) ? "page" : undefined}
      className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium transition-colors ${
        isActive(href) ? "text-brand" : "text-muted-foreground"
      }`}
    >
      <span className={`rounded-xl px-4 py-1 transition-colors ${isActive(href) ? "bg-brand-soft" : ""}`}>{icon}</span>
      <span>{label}</span>
    </Link>
  );

  return (
    <>
      <header className="sticky top-0 z-30 bg-card/90 backdrop-blur border-b border-border">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <Logo size="sm" href="/client" showText />

            <nav className="hidden md:flex items-center gap-1" aria-label="Danışan ana menüsü">
              {desktopLink("/client", <Home className="w-4 h-4" />, "Anasayfa")}
              {desktopLink("/client/diets", <UtensilsCrossed className="w-4 h-4" />, "Diyetler")}
              {desktopLink("/client/conversations", <MessageCircle className="w-4 h-4" />, "Sohbetler")}
              {desktopLink("/client/progress", <TrendingUp className="w-4 h-4" />, "Gelişim")}
              {desktopLink("/client/notifications", notificationIcon("h-4 w-4"), "Bildirimler")}
              {moreMenu(
                <button type="button" className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${isMoreActive ? "text-brand bg-brand-soft" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}>
                  <MoreHorizontal className="h-4 w-4 mr-1.5" />Daha Fazla
                </button>,
              )}
            </nav>

            <nav className="flex md:hidden items-center gap-1" aria-label="Hızlı işlemler">
              <Link href="/client/notifications" aria-label="Bildirimler" className={`h-10 w-10 rounded-xl flex items-center justify-center ${isActive("/client/notifications") ? "text-brand bg-brand-soft" : "text-muted-foreground"}`}>
                {notificationIcon()}
              </Link>
              {moreMenu(
                <button type="button" aria-label="Profil ve daha fazla seçenek" className={`h-10 w-10 rounded-xl flex items-center justify-center ${isMoreActive ? "text-brand bg-brand-soft" : "text-muted-foreground"}`}>
                  <CircleUserRound className="h-5 w-5" />
                </button>,
              )}
            </nav>
          </div>
        </div>
      </header>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 md:hidden border-t border-border bg-card/95 backdrop-blur shadow-[0_-8px_24px_rgba(0,0,0,0.06)]"
        aria-label="Mobil alt menü"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto flex max-w-lg h-16 px-1">
          {bottomLink("/client", <Home className="h-5 w-5" />, "Ana Sayfa")}
          {bottomLink("/client/diets", <UtensilsCrossed className="h-5 w-5" />, "Diyetler")}
          {bottomLink("/client/conversations", <MessageCircle className="h-5 w-5" />, "Sohbetler")}
          {bottomLink("/client/progress", <TrendingUp className="h-5 w-5" />, "Gelişim")}
          {moreMenu(
            <button type="button" aria-label="Daha fazla seçenek" className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium ${isMoreActive ? "text-brand" : "text-muted-foreground"}`}>
              <span className={`rounded-xl px-4 py-1 ${isMoreActive ? "bg-brand-soft" : ""}`}><MoreHorizontal className="h-5 w-5" /></span>
              <span>Daha Fazla</span>
            </button>,
            "top",
          )}
        </div>
      </nav>
    </>
  );
}
