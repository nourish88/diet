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

  // Don't show navbar on auth pages
  const isAuthPage =
    pathname?.startsWith("/login") || 
    pathname?.startsWith("/register") ||
    pathname?.startsWith("/pending-approval");

  // Don't show navbar on client pages (they have their own minimal layout)
  const isClientPage = pathname?.startsWith("/client");

  // Return without navbar for auth and client pages
  if (isAuthPage || isClientPage) {
    return <main>{children}</main>;
  }

  return (
    <>
      <Navbar />
      <main className="pt-32 lg:pt-24">{children}</main>
    </>
  );
}
