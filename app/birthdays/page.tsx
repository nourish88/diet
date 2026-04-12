"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Loader2, Calendar, Gift, MessageCircle, Phone, PhoneMissed, ExternalLink } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { tr } from "date-fns/locale/tr";
import { apiClient } from "@/lib/api-client";
import { openWhatsApp } from "@/utils/whatsapp";
import { formatBirthdayMessage } from "@/services/BirthdayService";

interface BirthdayClient {
  id: number;
  name: string;
  surname: string;
  phoneNumber: string | null;
  birthdate: string | null;
}

export default function BirthdaysPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [clients, setClients] = useState<BirthdayClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [celebrating, setCelebrating] = useState(false);

  // Modal state
  const [modalClient, setModalClient] = useState<BirthdayClient | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const loadBirthdayClients = useCallback(async () => {
    try {
      const data = await apiClient.get<{ clients: BirthdayClient[] }>("/birthdays/today");
      setClients(data.clients || []);
    } catch (error) {
      toast({
        title: "Hata",
        description: "Doğum günü olan danışanlar yüklenirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadBirthdayClients();
  }, [loadBirthdayClients]);

  // Auto-open modal when clientId query param is present (from push notification)
  useEffect(() => {
    const clientIdParam = searchParams?.get("clientId");
    if (clientIdParam && clients.length > 0) {
      const targetClient = clients.find((c) => c.id === Number(clientIdParam));
      if (targetClient) {
        setModalClient(targetClient);
        setModalOpen(true);
      }
    }
  }, [searchParams, clients]);

  const openCelebrationModal = (client: BirthdayClient) => {
    setModalClient(client);
    setModalOpen(true);
  };

  const handleCelebrate = async (client: BirthdayClient) => {
    if (!client.phoneNumber) return;

    setCelebrating(true);
    try {
      const message = formatBirthdayMessage(`${client.name} ${client.surname}`);
      openWhatsApp(client.phoneNumber, message);

      // Mark as congratulated
      await apiClient.post("/birthdays/congratulate", { clientId: client.id }).catch(() => {
        // Non-critical — don't block UX if this fails
      });

      setModalOpen(false);
      toast({
        title: "Harika!",
        description: `${client.name} ${client.surname} için WhatsApp açılıyor...`,
      });
    } catch {
      toast({
        title: "Hata",
        description: "WhatsApp açılırken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setCelebrating(false);
    }
  };

  const formatBirthdate = (birthdate: string | null) => {
    if (!birthdate) return "Tarih yok";
    return format(new Date(birthdate), "d MMMM yyyy", { locale: tr });
  };

  const otherClients = modalClient
    ? clients.filter((c) => c.id !== modalClient.id)
    : [];

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 text-purple-600 animate-spin" />
          <span className="ml-2 text-gray-600">Yükleniyor...</span>
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
            <h1 className="text-3xl font-bold text-gray-900">Doğum Günleri</h1>
            <p className="text-gray-600 mt-1">
              Bugün doğum günü olan danışanlarınız
            </p>
          </div>
        </div>
      </div>

      {/* Client Cards */}
      {clients.length === 0 ? (
        <Card className="p-12 text-center">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Bugün doğum günü olan danışan bulunmuyor
          </h3>
          <p className="text-gray-600">
            Doğum günü olan danışanlar burada görünecek.
          </p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clients.map((client) => (
              <Card
                key={client.id}
                className="hover:shadow-lg transition-all border-2 border-pink-200 hover:border-pink-400"
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-3 mb-4">
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

                  {client.phoneNumber ? (
                    <>
                      <p className="text-sm text-gray-600 flex items-center gap-2 mb-4">
                        <Phone className="w-4 h-4" />
                        {client.phoneNumber}
                      </p>
                      <Button
                        onClick={() => openCelebrationModal(client)}
                        className="w-full bg-green-500 hover:bg-green-600 text-white"
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        WhatsApp ile Kutla
                      </Button>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 py-2 px-3 bg-gray-100 rounded-md">
                        <PhoneMissed className="w-4 h-4 text-gray-400" />
                        <p className="text-sm text-gray-500">
                          Telefon numarası kayıtlı değil
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-blue-600 border-blue-200 hover:bg-blue-50"
                        onClick={() => router.push(`/clients/${client.id}`)}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Telefon Numarası Ekle
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-6 p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg border border-pink-200">
            <p className="text-sm text-gray-700 text-center">
              <span className="font-bold text-pink-600">{clients.length}</span>{" "}
              danışanınızın bugün doğum günü! 🎂🎉
            </p>
          </div>
        </>
      )}

      {/* Celebration Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-pink-500" />
              Doğum Günü Kutlaması
            </DialogTitle>
            <DialogDescription>
              {modalClient && (
                <>
                  <span className="font-semibold text-gray-900">
                    {modalClient.name} {modalClient.surname}
                  </span>
                  &apos;nın bugün doğum günü! WhatsApp ile kutlamak ister
                  misiniz?
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            {modalClient?.phoneNumber ? (
              <Button
                onClick={() => handleCelebrate(modalClient)}
                disabled={celebrating}
                className="w-full bg-green-500 hover:bg-green-600 text-white"
              >
                {celebrating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Açılıyor...
                  </>
                ) : (
                  <>
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Evet, WhatsApp Aç
                  </>
                )}
              </Button>
            ) : (
              <div className="space-y-2">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <p className="text-sm text-amber-700 flex items-center gap-2">
                    <PhoneMissed className="w-4 h-4" />
                    Telefon numarası kayıtlı değil.
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="w-full text-blue-600 border-blue-200"
                  onClick={() => {
                    setModalOpen(false);
                    router.push(`/clients/${modalClient?.id}`);
                  }}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Telefon Numarası Ekle
                </Button>
              </div>
            )}

            <Button
              variant="ghost"
              className="w-full text-gray-500"
              onClick={() => setModalOpen(false)}
            >
              Şimdi Değil
            </Button>

            {/* Other birthday clients */}
            {otherClients.length > 0 && (
              <div className="border-t pt-3">
                <p className="text-xs text-gray-500 mb-2 font-medium">
                  Bugün ayrıca doğum günü olanlar:
                </p>
                <div className="space-y-1">
                  {otherClients.map((other) => (
                    <button
                      key={other.id}
                      type="button"
                      onClick={() => {
                        setModalClient(other);
                      }}
                      className="w-full text-left px-3 py-2 rounded-md bg-pink-50 hover:bg-pink-100 border border-pink-200 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-800">
                          {other.name} {other.surname}
                        </span>
                        {other.phoneNumber ? (
                          <MessageCircle className="w-3.5 h-3.5 text-green-500" />
                        ) : (
                          <PhoneMissed className="w-3.5 h-3.5 text-gray-400" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
