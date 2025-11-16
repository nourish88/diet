"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  Calendar,
  Search,
  Link as LinkIcon,
} from "lucide-react";

interface PendingUser {
  id: number;
  supabaseId: string;
  email: string;
  referenceCode: string | null;
  createdAt: string;
}

interface Client {
  id: number;
  name: string;
  surname: string;
  phoneNumber: string | null;
  birthdate: string | null;
  createdAt: string;
}

export default function PendingClientsPage() {
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Mapping state
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [referenceCodeInput, setReferenceCodeInput] = useState("");
  const [clientSearchQuery, setClientSearchQuery] = useState("");

  const queryClient = useQueryClient();

  // Use React Query for pending users
  const {
    data: pendingUsers = [],
    isLoading: isLoadingPending,
    isError: isErrorPending,
    refetch: refetchPending,
  } = useQuery<PendingUser[]>({
    queryKey: ["pending-clients"],
    queryFn: async () => {
      return apiClient.get<PendingUser[]>("/pending-clients");
    },
    staleTime: 30 * 1000, // 30 seconds
  });

  // Use React Query for clients
  const {
    data: clientsData,
    isLoading: isLoadingClients,
    isError: isErrorClients,
  } = useQuery<{ clients: Client[] }>({
    queryKey: ["clients", "all"],
    queryFn: async () => {
      return apiClient.get<{ clients: Client[] }>("/clients?take=1000");
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const clients = clientsData?.clients ?? [];
  const loading = isLoadingPending || isLoadingClients;

  // Handle errors with useEffect
  useEffect(() => {
    if (isErrorPending) {
      console.error("Error fetching pending users");
    }
  }, [isErrorPending]);

  useEffect(() => {
    if (isErrorClients) {
      console.error("Error fetching clients");
    }
  }, [isErrorClients]);

  // Filter clients based on search query using useMemo
  const filteredClients = useMemo(() => {
    if (clientSearchQuery.trim() === "") {
      return clients;
    }
    const query = clientSearchQuery.toLowerCase();
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.surname.toLowerCase().includes(query) ||
        c.phoneNumber?.toLowerCase().includes(query)
    );
  }, [clientSearchQuery, clients]);

  // Use mutation for match operation
  const matchMutation = useMutation({
    mutationFn: async ({
      referenceCode,
      clientId,
    }: {
      referenceCode: string;
      clientId: number;
    }) => {
      return apiClient.post("/pending-clients/match", {
        referenceCode,
        clientId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-clients"] });
      showMessage(
        "success",
        `✅ ${selectedClient?.name} ${selectedClient?.surname} başarıyla eşleştirildi!`
      );
      setSelectedClient(null);
      setReferenceCodeInput("");
    },
    onError: (error: any) => {
      console.error("Error matching client:", error);
      showMessage(
        "error",
        error.message || "Eşleştirme sırasında bir hata oluştu"
      );
    },
  });

  // Use mutation for reject operation
  const rejectMutation = useMutation({
    mutationFn: async (userId: number) => {
      return apiClient.delete(`/pending-clients/${userId}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-clients"] });
      showMessage("success", "✅ Kayıt başarıyla reddedildi");
    },
    onError: (error: any) => {
      console.error("Error rejecting client:", error);
      showMessage("error", "Kayıt reddedilirken bir hata oluştu");
    },
  });

  const handleMatchClient = async () => {
    if (!selectedClient || !referenceCodeInput.trim()) {
      showMessage("error", "Lütfen danışan ve referans kodu seçin");
      return;
    }

    if (processingId) return;

    setProcessingId(selectedClient.id);
    setMessage(null);

    try {
      await matchMutation.mutateAsync({
        referenceCode: referenceCodeInput.trim(),
        clientId: selectedClient.id,
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (userId: number) => {
    if (processingId) return;

    if (
      !confirm(
        "Bu kaydı reddetmek istediğinize emin misiniz? Bu işlem geri alınamaz."
      )
    ) {
      return;
    }

    setProcessingId(userId);
    setMessage(null);

    try {
      await rejectMutation.mutateAsync(userId);
    } finally {
      setProcessingId(null);
    }
  };

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          <Clock className="w-8 h-8 text-blue-600" />
          Mobil Kullanıcı Eşleştirme
        </h1>
        <p className="text-gray-600">
          Mobile uygulamadan kayıt olan kullanıcıları mevcut danışanlarınızla
          eşleştirin
        </p>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
            message.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <XCircle className="w-5 h-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Split Layout: Pending Users (Left) | Mapping Interface (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: Bekleyen Kayıtlar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Bekleyen Kayıtlar
              <span className="ml-2 px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                {pendingUsers.length}
              </span>
            </h2>
          </div>

          {isErrorPending ? (
            <div className="p-12 text-center">
              <p className="text-red-600 mb-4">
                Bekleyen kayıtlar yüklenirken bir hata oluştu.
              </p>
              <button
                onClick={() => refetchPending()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Tekrar Dene
              </button>
            </div>
          ) : loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Yükleniyor...</p>
            </div>
          ) : pendingUsers.length === 0 ? (
            <div className="p-12 text-center">
              <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">
                Onay bekleyen kayıt bulunmuyor
              </p>
              <p className="text-gray-400 text-sm mt-2">
                Yeni kayıtlar burada görünecektir
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
              {pendingUsers.map((user) => (
                <div
                  key={user.id}
                  className="p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start gap-3 mb-2">
                    <Mail className="w-5 h-5 text-gray-400 mt-1" />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 break-all">
                        {user.email}
                      </p>
                      {user.referenceCode && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-sm text-gray-500">Ref:</span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-mono font-medium bg-blue-100 text-blue-800">
                            {user.referenceCode}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {new Date(user.createdAt).toLocaleDateString("tr-TR")}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <button
                      onClick={() => handleReject(user.id)}
                      disabled={processingId === user.id}
                      className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <XCircle className="w-4 h-4" />
                      Reddet
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Mapping Interface */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <LinkIcon className="w-5 h-5" />
              Danışan Eşleştirme
            </h2>
          </div>

          <div className="p-6">
            {/* Reference Code Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Referans Kodu
              </label>
              <input
                type="text"
                value={referenceCodeInput}
                onChange={(e) =>
                  setReferenceCodeInput(e.target.value.toUpperCase())
                }
                placeholder="Örn: REF-A1B2C3"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">
                Soldan referans kodunu kopyalayın
              </p>
            </div>

            {/* Client Search */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Danışan Ara
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={clientSearchQuery}
                  onChange={(e) => setClientSearchQuery(e.target.value)}
                  placeholder="İsim, soyisim veya telefon..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* Client List */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Danışan Seçin
              </label>
              <div className="border border-gray-300 rounded-lg max-h-[300px] overflow-y-auto">
                {filteredClients.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    Danışan bulunamadı
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {filteredClients.map((client) => (
                      <button
                        key={client.id}
                        onClick={() => setSelectedClient(client)}
                        className={`w-full text-left p-3 hover:bg-gray-50 transition-colors ${
                          selectedClient?.id === client.id
                            ? "bg-blue-50 border-l-4 border-blue-500"
                            : ""
                        }`}
                      >
                        <p className="font-medium text-gray-900">
                          {client.name} {client.surname}
                        </p>
                        {client.phoneNumber && (
                          <p className="text-sm text-gray-500 mt-1">
                            {client.phoneNumber}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Selected Client Display */}
            {selectedClient && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800 font-medium">
                  Seçili Danışan:
                </p>
                <p className="text-lg font-semibold text-blue-900 mt-1">
                  {selectedClient.name} {selectedClient.surname}
                </p>
              </div>
            )}

            {/* Match Button */}
            <button
              onClick={handleMatchClient}
              disabled={
                !selectedClient || !referenceCodeInput.trim() || !!processingId
              }
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-green-600"
            >
              <CheckCircle className="w-5 h-5" />
              {processingId ? "Eşleştiriliyor..." : "Danışanı Eşleştir"}
            </button>
          </div>
        </div>
      </div>

      {/* Info box */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">ℹ️ Nasıl Çalışır?</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>
            1. Danışan mobile uygulamadan kayıt olur ve referans kodu alır
          </li>
          <li>2. Danışan size referans kodunu paylaşır</li>
          <li>3. Sisteminizde zaten tanımlı olan danışanı seçin</li>
          <li>4. Referans kodunu girin ve eşleştirme yapın</li>
          <li>
            5. Artık mobile'dan giriş yapan kullanıcı o danışan olarak sisteme
            erişecek
          </li>
        </ul>
      </div>

      {/* Navigation */}
      <div className="mt-8 text-center">
        <Link
          href="/clients"
          className="text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-2"
        >
          ← Danışan Listesine Dön
        </Link>
      </div>
    </div>
  );
}




