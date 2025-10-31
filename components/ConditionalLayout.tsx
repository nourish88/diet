"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";

interface ConditionalLayoutProps {
  children: React.ReactNode;
}

export default function ConditionalLayout({
  children,
}: ConditionalLayoutProps) {
  const pathname = usePathname();

  // Don't show navbar and padding on auth pages
  const isAuthPage =
    pathname?.startsWith("/login") || pathname?.startsWith("/register");

  if (isAuthPage) {
    return <main>{children}</main>;
  }

  return (
    <>
      <Navbar />
      <main className="pt-32 lg:pt-24">{children}</main>
    </>
  );
}
