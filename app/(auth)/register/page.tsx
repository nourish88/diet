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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Shield } from "lucide-react";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"dietitian" | "client">("client");
  const [isLoading, setIsLoading] = useState(false);
  const { signUp, user, databaseUser, loading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  // Admin kontrolü - sadece dietitian'lar erişebilir
  useEffect(() => {
    if (
      !loading &&
      (!user || !databaseUser || databaseUser.role !== "dietitian")
    ) {
      toast({
        title: "Erişim Reddedildi",
        description: "Bu sayfaya sadece diyetisyenler erişebilir.",
        variant: "destructive",
      });
      router.push("/login");
    }
  }, [user, databaseUser, loading, router, toast]);

  // Loading durumunda göster
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Admin değilse erişim reddedildi sayfası
  if (!user || !databaseUser || databaseUser.role !== "dietitian") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 mx-auto text-red-500 mb-4" />
            <CardTitle className="text-2xl text-red-600">
              Erişim Reddedildi
            </CardTitle>
            <CardDescription>
              Bu sayfaya sadece diyetisyenler erişebilir.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => router.push("/login")} className="w-full">
              Giriş Sayfasına Dön
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: "Hata",
        description: "Şifreler eşleşmiyor.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Hata",
        description: "Şifre en az 6 karakter olmalıdır.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await signUp(email, password, role);

      if (error) {
        toast({
          title: "Kayıt Hatası",
          description: error.message || "Kayıt olurken bir hata oluştu.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Başarılı",
          description: "Kayıt başarılı! E-posta adresinizi kontrol edin.",
        });
        router.push("/login");
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
            Kayıt Ol
          </CardTitle>
          <CardDescription className="text-center">
            Yeni hesap oluşturun
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
              <Label htmlFor="role">Rol</Label>
              <Select
                value={role}
                onValueChange={(value: "dietitian" | "client") =>
                  setRole(value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Rol seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">Danışan</SelectItem>
                  <SelectItem value="dietitian">Diyetisyen</SelectItem>
                </SelectContent>
              </Select>
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
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Kayıt olunuyor...
                </>
              ) : (
                "Kayıt Ol"
              )}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            <span className="text-gray-600">Zaten hesabınız var mı? </span>
            <Button
              variant="link"
              className="p-0 h-auto"
              onClick={() => router.push("/login")}
            >
              Giriş yapın
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
