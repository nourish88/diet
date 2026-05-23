import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import QueryProvider from "@/components/providers/QueryProvider";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/lib/auth-context";
import ConditionalLayout from "@/components/ConditionalLayout";
import PushNotificationProvider from "@/components/providers/PushNotificationProvider";
import { ThemeProvider } from "@/components/ThemeProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Diyetisyen Ezgi Evgin Aktaş",
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
    title: "Diyetisyen Ezgi Evgin Aktaş",
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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0e1f" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className={`${inter.className} bg-background text-foreground min-h-screen antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <QueryProvider>
              <PushNotificationProvider />
              <ConditionalLayout>{children}</ConditionalLayout>
            </QueryProvider>
          </AuthProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
