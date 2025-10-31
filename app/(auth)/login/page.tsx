"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, user, databaseUser, loading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  // Redirect when user is authenticated
  useEffect(() => {
    if (!loading && user && databaseUser) {
      console.log("🔄 Redirecting authenticated user to home");
      console.log("🔄 User:", user?.email);
      console.log("🔄 Database user:", databaseUser?.email);

      // Use window.location for more reliable redirect
      console.log("🔄 Using window.location.href for redirect");
      window.location.href = "/";
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
        // Don't redirect here - let useEffect handle it when auth state updates
      }
    } catch (error) {
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Giriş Yap
          </CardTitle>
          <CardDescription className="text-center">
            Hesabınıza giriş yapın
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
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Şifre</Label>
              <Input
                id="password"
                type="password"
                placeholder="Şifrenizi girin"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Giriş yapılıyor...
                </>
              ) : (
                "Giriş Yap"
              )}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            <span className="text-gray-600">
              Hesap oluşturmak için sistem yöneticisi ile iletişime geçin.
            </span>
          </div>

          {/* Debug: Manual redirect button */}
          {user && databaseUser && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800 mb-2">
                ✅ Giriş başarılı! Manuel yönlendirme için:
              </p>
              <Button
                onClick={() => (window.location.href = "/")}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                Ana Sayfaya Git
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
