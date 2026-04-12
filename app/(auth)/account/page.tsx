"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Stethoscope, User } from "lucide-react";
import Link from "next/link";

export default function AccountPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { signIn, user, databaseUser, loading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && user && databaseUser) {
      if (databaseUser.role === "dietitian") {
        window.location.href = "/";
      } else if (databaseUser.role === "client") {
        window.location.href = "/client";
      }
    }
  }, [user, databaseUser, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await signIn(email, password);

      if (error) {
        toast({
          title: "Giriş Hatası",
          description: error.message || "Giriş yapılırken bir hata oluştu.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Başarılı",
          description: "Giriş yapıldı! Yönlendiriliyorsunuz...",
        });
      }
    } catch {
      toast({
        title: "Hata",
        description: "Beklenmeyen bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-100 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1 pb-4">
          <div className="flex justify-center mb-4">
            <img
              src="/ezgi_evgin-removebg-preview.png"
              alt="Ezgi Evgin Beslenme ve Diyet Danışmanlığı"
              className="max-w-[200px] h-auto"
              style={{ width: "200px", height: "auto" }}
            />
          </div>
          <CardTitle className="text-3xl font-bold text-center bg-gradient-to-r from-indigo-600 to-purple-600 text-transparent bg-clip-text">
            Diyetisyen Girişi
          </CardTitle>
          <CardDescription className="text-center text-gray-600">
            Hesabınıza erişmek için bilgilerinizi girin
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4 w-full">
            <div className="space-y-2 w-full">
              <Label htmlFor="email" className="block">
                E-posta
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="ornek@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full"
              />
            </div>

            <div className="space-y-2 w-full">
              <Label htmlFor="password" className="block">
                Şifre
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Şifrenizi girin"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Giriş yapılıyor...
                </>
              ) : (
                <>
                  <Stethoscope className="mr-2 h-4 w-4" />
                  Diyetisyen Girişi
                </>
              )}
            </Button>

            <div className="mt-4 text-center text-sm text-gray-600">
              Diyetisyen hesabı oluşturmak için sistem yöneticisi ile iletişime
              geçin.
            </div>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-400">veya</span>
            </div>
          </div>

          <Link
            href="/login"
            className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-lg border-2 border-blue-200 text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-all text-sm font-medium"
          >
            <User className="w-4 h-4" />
            Danışan mısınız? Danışan girişi için tıklayın
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
