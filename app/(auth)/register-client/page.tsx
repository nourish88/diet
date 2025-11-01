"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
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
import { Loader2, UserPlus, ArrowLeft, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function RegisterClientPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [referenceCode, setReferenceCode] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();
  const supabase = createClient();

  // Check if already logged in
  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        router.push("/");
      }
    };
    checkAuth();
  }, [router, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (password !== confirmPassword) {
      toast({
        title: "Hata",
        description: "Şifreler eşleşmiyor",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Hata",
        description: "Şifre en az 6 karakter olmalıdır",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // 1. Sign up with Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: "client",
          },
        },
      });

      if (authError) {
        throw authError;
      }

      if (!authData.user) {
        throw new Error("Kayıt başarısız oldu");
      }

      console.log("✅ Supabase signup successful:", authData.user.id);

      // 2. Sync with our database and get reference code
      const syncResponse = await fetch("/api/auth/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          supabaseId: authData.user.id,
          email: authData.user.email,
          role: "client",
        }),
      });

      if (!syncResponse.ok) {
        const errorData = await syncResponse.json();
        throw new Error(errorData.error || "Veritabanı senkronizasyonu başarısız");
      }

      const syncData = await syncResponse.json();
      console.log("✅ Database sync successful:", syncData);

      // 3. Get the reference code
      if (syncData.user?.referenceCode) {
        setReferenceCode(syncData.user.referenceCode);
      }

      toast({
        title: "Kayıt Başarılı! 🎉",
        description: "Referans kodunuz oluşturuldu. Lütfen diyetisyeninizle paylaşın.",
      });

      // Wait a bit to show the reference code
      setTimeout(() => {
        router.push("/pending-approval");
      }, 3000);
    } catch (error: any) {
      console.error("❌ Registration error:", error);
      toast({
        title: "Kayıt Hatası",
        description: error.message || "Kayıt sırasında bir hata oluştu",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (referenceCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="space-y-1 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-green-600">
              Kayıt Başarılı!
            </CardTitle>
            <CardDescription>
              Referans kodunuz oluşturuldu
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-blue-50 border-2 border-blue-600 rounded-lg p-6 text-center mb-6">
              <p className="text-sm text-blue-900 font-medium mb-3">
                Referans Kodunuz:
              </p>
              <div className="bg-white rounded-lg p-4 mb-3">
                <p className="text-3xl font-bold text-blue-600 tracking-wider">
                  {referenceCode}
                </p>
              </div>
              <p className="text-xs text-blue-700">
                Bu kodu diyetisyeninize verin
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-yellow-900">
                <strong>📝 Önemli:</strong> Diyetisyeniniz bu kodu kullanarak
                sizi mevcut danışan kaydınızla eşleştirecektir. Onaylandıktan
                sonra beslenme programlarınıza erişebileceksiniz.
              </p>
            </div>

            <p className="text-center text-sm text-gray-600">
              Yönlendiriliyorsunuz...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-between mb-2">
            <Link
              href="/login"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <UserPlus className="w-6 h-6 text-blue-600" />
            </div>
            <div className="w-5"></div>
          </div>
          <CardTitle className="text-3xl font-bold text-center bg-gradient-to-r from-blue-600 to-cyan-600 text-transparent bg-clip-text">
            Danışan Kaydı
          </CardTitle>
          <CardDescription className="text-center text-gray-600">
            Hesap oluşturun ve diyetisyeninizle eşleşin
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-posta</Label>
              <Input
                id="email"
                type="email"
                placeholder="ornek@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Şifre</Label>
              <Input
                id="password"
                type="password"
                placeholder="En az 6 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Şifre Tekrar</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Şifrenizi tekrar girin"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
                minLength={6}
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>📝 Kayıt sonrası:</strong>
              </p>
              <ol className="list-decimal list-inside text-xs text-blue-800 mt-2 space-y-1">
                <li>Size özel bir referans kodu verilecek</li>
                <li>Bu kodu diyetisyeninize verin</li>
                <li>Diyetisyen sizi onaylayacak</li>
                <li>Beslenme programlarınıza erişebileceksiniz</li>
              </ol>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Kayıt oluşturuluyor...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Kayıt Ol
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Zaten hesabınız var mı?{" "}
              <Link
                href="/login"
                className="font-medium text-blue-600 hover:text-blue-700"
              >
                Giriş Yapın
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

