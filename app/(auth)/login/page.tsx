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
import { Loader2, User, UserPlus, Stethoscope } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loginType, setLoginType] = useState<"dietitian" | "client">(
    "dietitian"
  );
  const { signIn, user, databaseUser, loading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  // Redirect when user is authenticated - based on role
  useEffect(() => {
    if (!loading && user && databaseUser) {
      console.log("🔄 Redirecting authenticated user");
      console.log("🔄 User:", user?.email, "Role:", databaseUser?.role);

      // Redirect based on role
      if (databaseUser.role === "client") {
        // Check if client is approved
        if (!databaseUser.isApproved) {
          console.log(
            "👤 Client not approved, redirecting to pending-approval"
          );
          window.location.href = "/pending-approval";
        } else {
          console.log("👤 Client approved, redirecting to /client");
          window.location.href = "/client";
        }
      } else if (databaseUser.role === "dietitian") {
        console.log("👨‍⚕️ Dietitian, redirecting to /");
        window.location.href = "/";
      } else {
        // Unknown role, redirect to home
        window.location.href = "/";
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-3xl font-bold text-center bg-gradient-to-r from-blue-600 to-indigo-600 text-transparent bg-clip-text">
            Hoş Geldiniz
          </CardTitle>
          <CardDescription className="text-center text-gray-600">
            Giriş yapmak için bilgilerinizi girin
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Login Type Selector */}
          <div className="grid grid-cols-2 gap-3 w-full">
            <button
              type="button"
              onClick={() => setLoginType("dietitian")}
              className={`flex flex-row items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 transition-all w-full ${
                loginType === "dietitian"
                  ? "bg-indigo-50 border-indigo-600 text-indigo-700"
                  : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              <Stethoscope className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium whitespace-nowrap">Diyetisyen</span>
            </button>
            <button
              type="button"
              onClick={() => setLoginType("client")}
              className={`flex flex-row items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 transition-all w-full ${
                loginType === "client"
                  ? "bg-blue-50 border-blue-600 text-blue-700"
                  : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              <User className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium whitespace-nowrap">Danışan</span>
            </button>
          </div>

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
              className={`w-full ${
                loginType === "dietitian"
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                  : "bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
              }`}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Giriş yapılıyor...
                </>
              ) : (
                <>
                  {loginType === "dietitian" ? (
                    <>
                      <Stethoscope className="mr-2 h-4 w-4" />
                      Diyetisyen Girişi
                    </>
                  ) : (
                    <>
                      <User className="mr-2 h-4 w-4" />
                      Danışan Girişi
                    </>
                  )}
                </>
              )}
            </Button>
          </form>

          {/* Client Registration Link */}
          {loginType === "client" && (
            <div className="mt-6 w-full">
              <div className="relative mb-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">veya</span>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log("🔗 Button clicked - loginType:", loginType);
                  console.log("🔗 Navigating to /register-client");
                  
                  // Use window.location for immediate navigation
                  window.location.href = "/register-client";
                }}
                className="mt-4 w-full flex items-center justify-center gap-2 py-3 px-4 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 active:bg-blue-100 transition-all font-medium"
              >
                <UserPlus className="w-5 h-5" />
                <span>Danışan Kaydı Oluştur</span>
              </Button>
              <p className="mt-3 text-xs text-gray-500 text-center">
                Hesabınız yok mu? Kayıt olun ve diyetisyeninizle eşleşin
              </p>
            </div>
          )}

          {/* Dietitian Info */}
          {loginType === "dietitian" && (
            <div className="mt-4 text-center text-sm text-gray-600">
              Diyetisyen hesabı oluşturmak için sistem yöneticisi ile iletişime
              geçin.
            </div>
          )}

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
