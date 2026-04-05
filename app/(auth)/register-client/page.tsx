"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Smartphone } from "lucide-react";

export default function RegisterClientPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
            <Smartphone className="w-7 h-7 text-blue-700" />
          </div>
          <CardTitle className="text-2xl font-bold">Telefon ile Giriş</CardTitle>
          <CardDescription>
            Danışan kaydı artık telefon numarası üzerinden yapılmaktadır.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600 text-center">
            Diyetisyeninizin sisteme kaydettiği telefon numarası ile giriş ekranından devam edin.
          </p>

          <Link href="/login" className="block">
            <Button className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Giriş Ekranına Dön
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
