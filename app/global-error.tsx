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
          <div className="space-y-3">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Bir sorunla karşılaştık
              </h1>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                Beklenmedik bir hata oluştu. Lütfen sayfayı yenilemeyi deneyin ya
                da ana sayfaya geri dönerek işleminizi tekrar başlatın.
              </p>
            </div>
            <div className="rounded-md bg-gray-50 border border-gray-200 text-left p-4 text-xs text-gray-700 space-y-2">
              <div>
                <span className="font-semibold text-gray-900">Mesaj:</span>{" "}
                <span>{error.message || "Bilinmeyen hata"}</span>
              </div>
              {error.digest && (
                <div>
                  <span className="font-semibold text-gray-900">Hata kodu:</span>{" "}
                  <span>{error.digest}</span>
                </div>
              )}
              {error.stack && (
                <details>
                  <summary className="cursor-pointer text-gray-900">
                    Ayrıntıları göster
                  </summary>
                  <pre className="mt-2 whitespace-pre-wrap break-words">
                    {error.stack}
                  </pre>
                </details>
              )}
            </div>
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

