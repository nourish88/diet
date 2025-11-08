"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error captured:", error);
  }, [error]);

  return (
    <html lang="tr">
      <body className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="w-full max-w-lg rounded-2xl bg-white shadow-lg border border-gray-100 p-8 text-center space-y-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Bir sorunla karşılaştık
            </h1>
            <p className="mt-2 text-sm text-gray-600 leading-relaxed">
              Beklenmedik bir hata oluştu. Lütfen sayfayı yenilemeyi deneyin ya
              da ana sayfaya geri dönerek işleminizi tekrar başlatın.
            </p>
            {error.digest && (
              <p className="mt-2 text-xs text-gray-400">
                Hata kodu: {error.digest}
              </p>
            )}
          </div>
          <div className="flex items-center justify-center gap-3">
            <Button onClick={() => reset()} variant="default">
              Yeniden dene
            </Button>
            <Button asChild variant="outline">
              <Link href="/">Ana sayfaya dön</Link>
            </Button>
          </div>
        </div>
      </body>
    </html>
  );
}

