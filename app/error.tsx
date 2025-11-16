"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("Error boundary caught:", error);
    }
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center bg-white rounded-2xl shadow-lg p-8 max-w-md mx-4">
        <div className="flex justify-center mb-4">
          <div className="rounded-full bg-red-100 p-3">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Bir Hata Oluştu
        </h1>
        <p className="text-gray-600 mb-6">
          Üzgünüz, beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.
        </p>
        {process.env.NODE_ENV === "development" && error.message && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs font-mono text-gray-700 break-all">
              {error.message}
            </p>
            {error.digest && (
              <p className="text-xs text-gray-500 mt-2">Digest: {error.digest}</p>
            )}
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={reset}
            className="bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Tekrar Dene
          </Button>
          <Button
            asChild
            variant="outline"
            className="border-indigo-600 text-indigo-600 hover:bg-indigo-50"
          >
            <Link href="/">
              <Home className="h-4 w-4 mr-2" />
              Ana Sayfaya Dön
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

