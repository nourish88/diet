"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Calendar, Gift, MessageCircle, Phone } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { tr } from "date-fns/locale/tr";
import { createClient } from "@/lib/supabase-browser";

interface BirthdayClient {
  id: number;
  name: string;
  surname: string;
  phoneNumber: string | null;
  birthdate: string | null;
}

export default function BirthdaysPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [clients, setClients] = useState<BirthdayClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<number | null>(null);

  useEffect(() => {
    loadBirthdayClients();
  }, []);

  const loadBirthdayClients = async () => {
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      const response = await fetch("/api/birthdays/today", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load birthday clients");
      }

      const data = await response.json();
      setClients(data.clients || []);
    } catch (error) {
      console.error("Error loading birthday clients:", error);
      toast({
        title: "Hata",
        description: "Doğum günü olan danışanlar yüklenirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsAppClick = async (client: BirthdayClient) => {
    if (!client.phoneNumber) {
      toast({
        title: "Hata",
        description: "Danışanın telefon numarası kayıtlı değil.",
        variant: "destructive",
      });
      return;
    }

    setSending(client.id);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      const response = await fetch("/api/birthdays/whatsapp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          clientId: client.id,
          phoneNumber: client.phoneNumber,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate WhatsApp URL");
      }

      const data = await response.json();

      // Open WhatsApp - use multiple methods for PWA compatibility
      // Method 1: Create a temporary anchor element and click it (most reliable for PWA)
      const link = document.createElement("a");
      link.href = data.whatsappUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.style.display = "none";
      document.body.appendChild(link);
      
      // Trigger click immediately
      link.click();
      
      // Clean up after a short delay
      setTimeout(() => {
        document.body.removeChild(link);
      }, 100);

      // Show toast
      toast({
        title: "Başarılı",
        description: "WhatsApp açılıyor...",
        variant: "default",
      });
    } catch (error) {
      console.error("Error opening WhatsApp:", error);
      toast({
        title: "Hata",
        description: "WhatsApp açılırken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setSending(null);
    }
  };

  const formatBirthdate = (birthdate: string | null) => {
    if (!birthdate) return "Tarih yok";
    return format(new Date(birthdate), "d MMMM yyyy", { locale: tr });
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 text-purple-600 animate-spin" />
          <span className="ml-2 text-gray-600">
            Doğum günü olan danışanlar yükleniyor...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
            <Gift className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Doğum Günleri
            </h1>
            <p className="text-gray-600 mt-1">
              Bugün doğum günü olan danışanlarınız
            </p>
          </div>
        </div>
      </div>

      {/* Birthday Clients List */}
      {clients.length === 0 ? (
        <Card className="p-12 text-center">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Bugün doğum günü olan danışan bulunmuyor
          </h3>
          <p className="text-gray-600">
            Bugün doğum günü olan danışanınız yok. Doğum günü olan danışanlar
            burada görünecek.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((client) => (
            <Card
              key={client.id}
              className="hover:shadow-lg transition-all border-2 border-pink-200 hover:border-pink-400"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <Gift className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">
                          {client.name} {client.surname}
                        </h3>
                        {client.birthdate && (
                          <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                            <Calendar className="w-3 h-3" />
                            {formatBirthdate(client.birthdate)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Phone Number */}
                {client.phoneNumber && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      {client.phoneNumber}
                    </p>
                  </div>
                )}

                {/* WhatsApp Button */}
                {client.phoneNumber ? (
                  <Button
                    onClick={() => handleWhatsAppClick(client)}
                    disabled={sending === client.id}
                    className="w-full bg-green-500 hover:bg-green-600 text-white"
                  >
                    {sending === client.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Açılıyor...
                      </>
                    ) : (
                      <>
                        <MessageCircle className="w-4 h-4 mr-2" />
                        WhatsApp ile Kutla
                      </>
                    )}
                  </Button>
                ) : (
                  <div className="text-center py-2 px-4 bg-gray-100 rounded-md">
                    <p className="text-sm text-gray-500">
                      Telefon numarası kayıtlı değil
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary */}
      {clients.length > 0 && (
        <div className="mt-6 p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg border border-pink-200">
          <p className="text-sm text-gray-700 text-center">
            <span className="font-bold text-pink-600">{clients.length}</span>{" "}
            danışanınızın bugün doğum günü! 🎂🎉
          </p>
        </div>
      )}
    </div>
  );
}

