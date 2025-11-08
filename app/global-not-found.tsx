import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function GlobalNotFound() {
  return (
    <html lang="tr">
      <body className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="w-full max-w-lg rounded-2xl bg-white shadow-lg border border-gray-100 p-8 text-center space-y-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Sayfa bulunamadı
            </h1>
            <p className="mt-2 text-sm text-gray-600 leading-relaxed">
              Ulaştığınız sayfa taşınmış veya artık mevcut olmayabilir. Menüden
              başka bir sayfa seçebilir ya da ana sayfaya dönebilirsiniz.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <Link href="/" className={cn(buttonVariants({ variant: "default" }))}>
              Ana sayfaya dön
            </Link>
            <Link
              href="/diets"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Diyet listesine git
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}

