"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Users, ClipboardList, Home, Calendar } from "lucide-react";
import Image from "next/image";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (!pathname) return false;
    if (path === "/" && pathname === "/") return true;
    if (path !== "/" && pathname.startsWith(path)) return true;
    return false;
  };

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  const navItems = [
    { href: "/", label: "Ana Sayfa", icon: Home },
    { href: "/clients", label: "Danışanlar", icon: Users },
    { href: "/diets", label: "Beslenme Programları", icon: ClipboardList },
    { href: "/important-dates", label: "Önemli Tarihler", icon: Calendar },
  ];

  return (
    <nav className="bg-white shadow-md fixed w-full z-20 top-0 left-0 border-b border-gray-200">
      <div className="container flex flex-wrap justify-between items-center mx-auto p-4">
        <Link href="/" className="flex items-center space-x-3">
          <div className="relative">
            <Image
              src="/ezgi_evgin.png"
              alt="Diyet Danışmanlık Logo"
              width={120}
              height={120}
              priority
            />
          </div>
          <div>
            <span className="self-center text-xl font-semibold whitespace-nowrap bg-gradient-to-r from-indigo-600 to-purple-700 text-transparent bg-clip-text">
              Diyet Danışmanlık Hizmetleri
            </span>
          </div>
        </Link>

        <div className="flex md:hidden">
          <button
            type="button"
            className="inline-flex items-center p-2 ml-3 text-gray-700 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200"
            onClick={toggleMenu}
            aria-controls="navbar-menu"
            aria-expanded={isOpen}
          >
            <span className="sr-only">Open main menu</span>
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        <div
          className={`${isOpen ? "block" : "hidden"} w-full md:block md:w-auto`}
          id="navbar-menu"
        >
          <ul className="flex flex-col mt-4 p-4 md:p-0 font-medium md:flex-row md:space-x-8 md:mt-0 md:border-0 bg-white md:bg-transparent border-gray-200 rounded-lg border md:border-none">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center py-2 px-3 rounded-lg ${
                      isActive(item.href)
                        ? "text-white bg-indigo-600 md:text-indigo-600 md:bg-transparent"
                        : "text-gray-700 hover:bg-gray-100 md:hover:bg-transparent md:hover:text-indigo-600"
                    }`}
                    onClick={closeMenu}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
