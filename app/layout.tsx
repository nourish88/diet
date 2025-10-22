import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import QueryProvider from "@/components/providers/QueryProvider";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Diyet Danışmanlık Hizmetleri",
  description: "Profesyonel diyet ve beslenme danışmanlığı hizmetleri",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className={`${inter.className} bg-gray-50 min-h-screen`}>
        <QueryProvider>
          <Navbar />
          <main className="pt-24">{children}</main>
        </QueryProvider>
        <Toaster />
      </body>
    </html>
  );
}
