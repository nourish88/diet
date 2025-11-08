import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import QueryProvider from "@/components/providers/QueryProvider";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/lib/auth-context";
import ConditionalLayout from "@/components/ConditionalLayout";
import PushNotificationProvider from "@/components/providers/PushNotificationProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Diyet Danışmanlık Hizmetleri",
  description: "Profesyonel diyet ve beslenme danışmanlığı hizmetleri",
  icons: {
    icon: [
      { url: "/image.png", sizes: "512x512", type: "image/png" },
      { url: "/image.png", sizes: "192x192", type: "image/png" },
      { url: "/image.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/image.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Diyet",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#3b82f6",
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
            <PushNotificationProvider />
            <ConditionalLayout>{children}</ConditionalLayout>
          </QueryProvider>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
