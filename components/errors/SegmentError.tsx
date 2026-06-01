"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
  scope: string;
  homeHref?: string;
}

export function SegmentError({ error, reset, scope, homeHref = "/" }: Props) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error(`[${scope}] error boundary:`, error);
    }
  }, [error, scope]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <div className="text-center bg-card rounded-2xl shadow-md p-8 max-w-md w-full border border-border">
        <div className="flex justify-center mb-4">
          <div className="rounded-full bg-red-100 p-3">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
        </div>
        <h1 className="text-xl font-semibold text-foreground mb-2">
          Bu bölümde bir hata oluştu
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          Sayfa yüklenirken beklenmeyen bir sorun yaşandı. Tekrar deneyebilir
          veya ana sayfaya dönebilirsiniz.
        </p>
        {process.env.NODE_ENV !== "production" && error.message && (
          <div className="mb-6 p-3 bg-muted/30 rounded-lg border border-border">
            <p className="text-xs font-mono text-foreground break-all">
              {error.message}
            </p>
            {error.digest && (
              <p className="text-xs text-muted-foreground mt-1">
                Digest: {error.digest}
              </p>
            )}
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={reset} className="bg-brand-gradient text-white">
            <RefreshCw className="h-4 w-4 mr-2" /> Tekrar Dene
          </Button>
          <Button asChild variant="outline">
            <Link href={homeHref}>
              <Home className="h-4 w-4 mr-2" /> Ana Sayfa
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
