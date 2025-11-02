"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  Users,
  ClipboardList,
  Home,
  Calendar,
  Settings,
  FileText,
  BarChart3,
  LogOut,
  User,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { user, databaseUser, signOut, loading } = useAuth();

  const isActive = (path: string) => {
    if (!pathname) return false;
    if (path === "/" && pathname === "/") return true;
    if (path !== "/" && pathname.startsWith(path)) return true;
    return false;
  };

  // Don't show navbar on auth pages (login, register)
  const isAuthPage =
    pathname?.startsWith("/login") || pathname?.startsWith("/register");
  if (isAuthPage) {
    return null;
  }

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    closeMenu();
  };

  // Filter nav items based on user role
  const getNavItems = () => {
    const allItems = [
      { href: "/", label: "Ana Sayfa", icon: Home },
      { href: "/clients", label: "Danışanlar", icon: Users },
      { href: "/diets", label: "Beslenme Programları", icon: ClipboardList },
      { href: "/sablonlar", label: "Şablonlar", icon: FileText },
      { href: "/istatistikler", label: "İstatistikler", icon: BarChart3 },
      { href: "/important-dates", label: "Önemli Tarihler", icon: Calendar },
      { href: "/tanimlamalar", label: "Tanımlamalar", icon: Settings },
      {
        href: "/pending-clients",
        label: "Onay Bekleyenler",
        icon: Users,
      },
    ];

    // If user is not authenticated, show no items (middleware will redirect to login)
    if (!user || !databaseUser) {
      return [];
    }

    // If user is not a dietitian, show limited items
    if (databaseUser.role !== "dietitian") {
      return allItems.filter((item) => ["/", "/diets"].includes(item.href));
    }

    return allItems;
  };

  const navItems = getNavItems();

  // Don't render navigation items while loading
  if (loading) {
    return (
      <nav className="bg-white shadow-md fixed w-full z-20 top-0 left-0 border-b border-gray-200">
        <div className="container flex flex-wrap justify-between items-center mx-auto p-4">
          <Link href="/" className="flex items-center space-x-3">
            <div className="relative">
              <img
                src="/ezgi_evgin.png"
                alt="Diyet Danışmanlık Logo"
                className="w-[120px] h-auto"
                style={{ width: "120px", height: "auto" }}
              />
            </div>
            <div>
              <span className="self-center text-xl font-semibold whitespace-nowrap bg-gradient-to-r from-indigo-600 to-purple-700 text-transparent bg-clip-text">
                Diyet Danışmanlık Hizmetleri
              </span>
            </div>
          </Link>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-white shadow-md fixed w-full z-20 top-0 left-0 border-b border-gray-200">
      <div className="container flex flex-wrap justify-between items-center mx-auto p-4">
        <Link href="/" className="flex items-center space-x-3">
          <div className="relative">
            <img
              src={
                databaseUser?.role === "client"
                  ? "/ezgi_evgin-removebg-preview.png"
                  : "/ezgi_evgin.png"
              }
              alt="Diyet Danışmanlık Logo"
              className="w-[120px] h-auto"
              style={{ width: "120px", height: "auto" }}
            />
          </div>
          <div>
            <span className="self-center text-xl font-semibold whitespace-nowrap bg-gradient-to-r from-indigo-600 to-purple-700 text-transparent bg-clip-text">
              Diyet Danışmanlık Hizmetleri
            </span>
          </div>
        </Link>

        <div className="flex items-center space-x-4">
          {/* User info and logout */}
          {!loading && databaseUser && (
            <div className="hidden lg:flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                {databaseUser.email}
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <User className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Çıkış Yap
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* Mobile menu button */}
          <div className="flex lg:hidden">
            <button
              type="button"
              className="inline-flex items-center p-2 ml-3 text-gray-700 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200"
              onClick={toggleMenu}
              aria-controls="navbar-menu"
              aria-expanded={isOpen}
            >
              <span className="sr-only">Open main menu</span>
              {isOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        <div
          className={`${isOpen ? "block" : "hidden"} w-full lg:block lg:w-auto`}
          id="navbar-menu"
        >
          <ul className="flex flex-col mt-4 p-4 md:p-0 font-medium lg:flex-row lg:space-x-4 xl:space-x-8 lg:mt-0 lg:border-0 bg-white lg:bg-transparent border-gray-200 rounded-lg border lg:border-none">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center py-2 px-3 rounded-lg ${
                      isActive(item.href)
                        ? "text-white bg-indigo-600 lg:text-indigo-600 lg:bg-transparent"
                        : "text-gray-700 hover:bg-gray-100 lg:hover:bg-transparent lg:hover:text-indigo-600"
                    }`}
                    onClick={(e) => {
                      console.log("🔗 Navbar link clicked:", item.href);
                      closeMenu();
                    }}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {item.label}
                  </Link>
                </li>
              );
            })}

            {/* Mobile logout */}
            {!loading && databaseUser && (
              <li className="lg:hidden">
                <button
                  onClick={handleSignOut}
                  className="flex items-center py-2 px-3 rounded-lg text-gray-700 hover:bg-gray-100 w-full text-left"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Çıkış Yap
                </button>
              </li>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
