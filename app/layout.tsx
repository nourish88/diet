import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import QueryProvider from "@/components/providers/QueryProvider";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/lib/auth-context";
import ConditionalLayout from "@/components/ConditionalLayout";

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
        <AuthProvider>
          <QueryProvider>
            <ConditionalLayout>{children}</ConditionalLayout>
          </QueryProvider>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
