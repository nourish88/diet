"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
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
import {
  Loader2,
  Search,
  CheckCircle,
  ArrowRight,
  Stethoscope,
} from "lucide-react";
import Link from "next/link";

interface PhoneLookupClient {
  id: number;
  name: string;
  surname: string;
  birthdate: string | null;
}

function formatBirthdate(value: string | null): string {
  if (!value) return "Doğum tarihi belirtilmemiş";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Doğum tarihi belirtilmemiş";
  }

  return date.toLocaleDateString("tr-TR");
}

export default function LoginPage() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [normalizedPhone, setNormalizedPhone] = useState<string | null>(null);
  const [lookupClients, setLookupClients] = useState<PhoneLookupClient[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [singleClientAutoLogin, setSingleClientAutoLogin] = useState(false);
  const [isSearchingClient, setIsSearchingClient] = useState(false);
  const [isConfirmingClient, setIsConfirmingClient] = useState(false);

  const { user, databaseUser, loading } = useAuth();
  const { toast } = useToast();
  const supabase = useMemo(() => createClient(), []);

  const selectedClient = useMemo(
    () => lookupClients.find((client) => client.id === selectedClientId) || null,
    [lookupClients, selectedClientId]
  );

  useEffect(() => {
    if (!loading && user && databaseUser) {
      if (databaseUser.role === "client") {
        if (databaseUser.isApproved) {
          window.location.href = "/client";
        }
      } else if (databaseUser.role === "dietitian") {
        window.location.href = "/";
      }
    }
  }, [user, databaseUser, loading]);

  const resetClientFlow = () => {
    setLookupClients([]);
    setSelectedClientId(null);
    setNormalizedPhone(null);
    setSingleClientAutoLogin(false);
  };

  const completeClientLogin = async ({
    selectedClientValue,
    normalizedPhoneValue,
    skipConfirmStep,
  }: {
    selectedClientValue: PhoneLookupClient;
    normalizedPhoneValue: string;
    skipConfirmStep: boolean;
  }) => {
    const sessionResponse = await fetch("/api/client-auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumber: normalizedPhoneValue }),
    });

    const sessionData = await sessionResponse.json();

    if (!sessionResponse.ok) {
      throw new Error(sessionData.error || "Danışan oturumu hazırlanamadı.");
    }

    const { session, user: authUser } = await ensureClientSession(
      sessionData.email,
      sessionData.password
    );

    const syncEmail = authUser.email || sessionData.email;
    if (!syncEmail) {
      throw new Error("Hesap e-posta bilgisi alınamadı.");
    }

    const syncResponse = await fetch("/api/auth/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supabaseId: authUser.id,
        email: syncEmail,
        role: "client",
      }),
    });

    if (!syncResponse.ok) {
      const syncError = await syncResponse.json();
      throw new Error(syncError.error || "Hesap senkronizasyonu başarısız.");
    }

    if (!skipConfirmStep) {
      const confirmResponse = await fetch("/api/client-auth/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          phoneNumber: normalizedPhoneValue,
          clientId: selectedClientValue.id,
        }),
      });

      const confirmData = await confirmResponse.json();

      if (!confirmResponse.ok) {
        throw new Error(
          confirmData.error || "Eşleştirme onaylanırken bir hata oluştu."
        );
      }
    }
  };

  const handleLookupClients = async () => {
    setIsSearchingClient(true);

    try {
      const response = await fetch("/api/client-auth/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Telefon numarası sorgulanırken bir hata oluştu."
        );
      }

      const clients: PhoneLookupClient[] = data.clients || [];
      const firstClient = clients[0] || null;
      const shouldAutoLogin =
        Boolean(data.singleClientAutoLogin) && clients.length === 1 && firstClient;

      setNormalizedPhone(data.normalizedPhone);
      setLookupClients(clients);
      setSelectedClientId(firstClient?.id || null);
      setSingleClientAutoLogin(Boolean(data.singleClientAutoLogin));

      if (shouldAutoLogin && firstClient) {
        setIsConfirmingClient(true);
        toast({
          title: "Otomatik Giriş",
          description: "Daha önce onaylı eşleşmeniz bulundu. Giriş yapılıyor...",
        });

        await completeClientLogin({
          selectedClientValue: firstClient,
          normalizedPhoneValue: data.normalizedPhone,
          skipConfirmStep: true,
        });

        toast({
          title: "Hoş Geldiniz",
          description: `${firstClient.name} ${firstClient.surname} profiliyle giriş yapıldı.`,
        });

        window.location.href = "/client";
        return;
      }

      toast({
        title: "Profil Bulundu",
        description:
          clients.length > 1
            ? "Telefon numaranızla birden fazla profil bulundu. Lütfen seçin."
            : "Profil bulundu. Onaylayarak devam edebilirsiniz.",
      });
    } catch (error: any) {
      resetClientFlow();
      toast({
        title: "Telefon Doğrulama",
        description:
          error.message ||
          "Telefon numarası doğrulanamadı. Lütfen diyetisyeninizle iletişime geçin.",
        variant: "destructive",
      });
    } finally {
      setIsSearchingClient(false);
      setIsConfirmingClient(false);
    }
  };

  const ensureClientSession = async (emailValue: string, passwordValue: string) => {
    const signedIn = await supabase.auth.signInWithPassword({
      email: emailValue,
      password: passwordValue,
    });

    if (!signedIn.error && signedIn.data.session && signedIn.data.user) {
      return { session: signedIn.data.session, user: signedIn.data.user };
    }

    const signUpResult = await supabase.auth.signUp({
      email: emailValue,
      password: passwordValue,
      options: { data: { role: "client" } },
    });

    if (signUpResult.error) {
      const isAlreadyRegistered =
        signUpResult.error.message?.toLowerCase().includes("already") ||
        signUpResult.error.message?.toLowerCase().includes("registered");

      if (!isAlreadyRegistered) {
        throw new Error(signUpResult.error.message || "Danışan girişi başarısız.");
      }
    }

    const retrySignIn = await supabase.auth.signInWithPassword({
      email: emailValue,
      password: passwordValue,
    });

    if (retrySignIn.error || !retrySignIn.data.session || !retrySignIn.data.user) {
      throw new Error(
        retrySignIn.error?.message ||
          "Danışan oturumu açılamadı. Lütfen tekrar deneyin."
      );
    }

    return { session: retrySignIn.data.session, user: retrySignIn.data.user };
  };

  const handleConfirmClient = async () => {
    if (!selectedClient || !normalizedPhone) {
      toast({
        title: "Profil Seçimi",
        description: "Devam etmek için profil seçiniz.",
        variant: "destructive",
      });
      return;
    }

    setIsConfirmingClient(true);

    try {
      await completeClientLogin({
        selectedClientValue: selectedClient,
        normalizedPhoneValue: normalizedPhone,
        skipConfirmStep: false,
      });

      toast({
        title: "Eşleştirme Tamamlandı",
        description: `${selectedClient.name} ${selectedClient.surname} profiline yönlendiriliyorsunuz.`,
      });

      window.location.href = "/client";
    } catch (error: any) {
      toast({
        title: "Danışan Girişi",
        description: error.message || "Danışan girişi başarısız.",
        variant: "destructive",
      });
    } finally {
      setIsConfirmingClient(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
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
          <CardTitle className="text-3xl font-bold text-center bg-gradient-to-r from-blue-600 to-indigo-600 text-transparent bg-clip-text">
            Danışan Girişi
          </CardTitle>
          <CardDescription className="text-center text-gray-600">
            Telefon numaranızla profilinize erişin
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="client-phone">Telefon Numarası</Label>
              <Input
                id="client-phone"
                type="tel"
                placeholder="05XXXXXXXXX"
                value={phoneNumber}
                onChange={(e) => {
                  setPhoneNumber(e.target.value);
                  resetClientFlow();
                }}
              />
              <p className="text-xs text-gray-500">
                Diyetisyeninizin sisteme kaydettiği telefon numarasını girin.
              </p>
            </div>

            <Button
              type="button"
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
              onClick={handleLookupClients}
              disabled={isSearchingClient || !phoneNumber.trim()}
            >
              {isSearchingClient ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Profil aranıyor...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Profili Bul
                </>
              )}
            </Button>

            {lookupClients.length > 0 && (
              <div className="space-y-3 border border-blue-100 rounded-lg p-3 bg-blue-50/40">
                <p className="text-sm text-gray-700 font-medium">
                  {lookupClients.length > 1
                    ? "Kim olduğunuzu seçin"
                    : "Profiliniz bulundu"}
                </p>

                <div className="space-y-2 max-h-56 overflow-auto pr-1">
                  {lookupClients.map((client) => {
                    const isSelected = selectedClientId === client.id;

                    return (
                      <button
                        key={client.id}
                        type="button"
                        onClick={() => setSelectedClientId(client.id)}
                        className={`w-full text-left rounded-lg border px-3 py-3 transition-colors ${
                          isSelected
                            ? "border-blue-500 bg-white"
                            : "border-gray-200 bg-white/80 hover:border-blue-300"
                        }`}
                      >
                        <p className="text-sm font-semibold text-gray-900">
                          {client.name} {client.surname}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatBirthdate(client.birthdate)}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {selectedClient && !singleClientAutoLogin && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3">
                    <p className="text-sm text-emerald-900 font-medium">
                      {selectedClient.name} {selectedClient.surname} profili ile
                      eşleştirileceksiniz. Onaylıyor musunuz?
                    </p>

                    <Button
                      type="button"
                      onClick={handleConfirmClient}
                      disabled={isConfirmingClient}
                      className="mt-3 w-full bg-emerald-600 hover:bg-emerald-700"
                    >
                      {isConfirmingClient ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Onaylanıyor...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Onaylıyorum, Devam Et
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-400">veya</span>
            </div>
          </div>

          <Link
            href="/account"
            className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-lg border-2 border-indigo-200 text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50 transition-all text-sm font-medium"
          >
            <Stethoscope className="w-4 h-4" />
            Diyetisyen girişi için tıklayın
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
