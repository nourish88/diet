"use client";
import { useState, memo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  Users,
  ClipboardList,
  Home,
  BarChart3,
  LogOut,
  User,
  ChevronDown,
  LayoutGrid,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import GlobalSearch from "@/components/GlobalSearch";
import { dietitianNavigation } from "@/lib/dietitian-navigation";

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
    pathname?.startsWith("/login") ||
    pathname?.startsWith("/account") ||
    pathname?.startsWith("/register");
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

  // Main navigation items (always visible for dietitians)
  const getMainNavItems = () => {
    const mainItems = [
      { href: "/", label: "Ana Sayfa", icon: Home },
      { href: "/clients", label: "Danışanlar", icon: Users },
      { href: "/diets", label: "Beslenme Programları", icon: ClipboardList },
      { href: "/istatistikler", label: "İstatistikler", icon: BarChart3 },
    ];

    // If user is not authenticated, show no items
    if (!user || !databaseUser) {
      return [];
    }

    // If user is not a dietitian (or assistant of one), show limited items
    if (
      databaseUser.role !== "dietitian" &&
      databaseUser.role !== "assistant"
    ) {
      return mainItems.filter((item) => ["/", "/diets"].includes(item.href));
    }

    return databaseUser.role === "dietitian" ? mainItems.slice(0, 1) : mainItems;
  };

  const navItems = getMainNavItems();
  const isMenuActive = dietitianNavigation.some((group) =>
    group.items.some((item) => pathname?.startsWith(item.href)),
  );

  // Don't render navigation items while loading
  if (loading) {
    return (
      <nav className="bg-card/95 backdrop-blur shadow-sm fixed w-full z-20 top-0 left-0 border-b border-border">
        <div className="container flex flex-wrap justify-between items-center mx-auto px-4 py-3">
          <Logo size="md" />
        </div>
      </nav>
    );
  }

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 lg:hidden z-10"
          onClick={closeMenu}
        />
      )}
      <nav className="bg-card/95 backdrop-blur shadow-sm fixed w-full z-20 top-0 left-0 border-b border-border">
        <div className="container flex flex-wrap justify-between items-center mx-auto px-4 py-3">
          <Logo size="md" />

          <div className="flex items-center space-x-2">
            {databaseUser?.role === "dietitian" && <GlobalSearch />}
            {/* Theme toggle */}
            <ThemeToggle />

            {/* User info and logout */}
            {!loading && databaseUser && (
              <div className="hidden lg:flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">
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
                className="inline-flex items-center p-2 text-foreground rounded-lg hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
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
          <ul className="flex flex-col mt-4 p-4 md:p-0 font-medium lg:flex-row lg:space-x-4 xl:space-x-8 lg:mt-0 lg:border-0 bg-card lg:bg-transparent border-border rounded-lg border lg:border-none">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center py-2 px-3 rounded-lg transition-colors ${
                      isActive(item.href)
                        ? "text-brand-foreground bg-brand lg:text-brand lg:bg-transparent"
                        : "text-foreground hover:bg-accent lg:hover:bg-transparent lg:hover:text-brand"
                    }`}
                    onClick={() => {
                      closeMenu();
                    }}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {item.label}
                  </Link>
                </li>
              );
            })}

            {/* Grouped application menu - Only for dietitians */}
            {databaseUser?.role === "dietitian" && (
              <li className="relative">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={`flex items-center py-2 px-3 rounded-lg transition-colors w-full lg:w-auto ${
                        isMenuActive
                          ? "text-brand-foreground bg-brand lg:text-brand lg:bg-transparent"
                          : "text-foreground hover:bg-accent lg:hover:bg-transparent lg:hover:text-brand"
                      }`}
                    >
                      <LayoutGrid className="w-4 h-4 mr-2" />
                      <span>Menü</span>
                      <ChevronDown className="w-4 h-4 ml-2 hidden lg:block" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    className="mt-2 w-[calc(100vw-2rem)] max-h-[70vh] overflow-y-auto p-3 lg:w-[720px]"
                  >
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {dietitianNavigation.map((group) => {
                        const GroupIcon = group.icon;
                        return (
                          <section key={group.label} aria-labelledby={`menu-${group.label}`}>
                            <div
                              id={`menu-${group.label}`}
                              className="flex items-center gap-2 px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                            >
                              <GroupIcon className="h-4 w-4" />
                              {group.label}
                            </div>
                            {group.items.map((item) => {
                              const Icon = item.icon;
                              const isItemActive = pathname?.startsWith(item.href);
                              return (
                                <DropdownMenuItem key={item.href} asChild>
                                  <Link
                                    href={item.href}
                                    className={`flex items-center rounded-md px-2 py-2 transition-colors ${
                                      isItemActive
                                        ? "bg-brand-soft font-medium text-brand"
                                        : "text-foreground"
                                    }`}
                                    onClick={closeMenu}
                                  >
                                    <Icon className="mr-2 h-4 w-4" />
                                    {item.label}
                                  </Link>
                                </DropdownMenuItem>
                              );
                            })}
                          </section>
                        );
                      })}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            )}

            {/* Mobile logout */}
            {!loading && databaseUser && (
              <li className="lg:hidden">
                <button
                  onClick={handleSignOut}
                  className="flex items-center py-2 px-3 rounded-lg text-foreground hover:bg-accent w-full text-left transition-colors"
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
    </>
  );
};

export default memo(Navbar);
