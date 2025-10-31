"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { CheckCircle, XCircle, Clock, Mail, Calendar } from "lucide-react";

interface PendingUser {
  id: number;
  supabaseId: string;
  email: string;
  referenceCode: string | null;
  createdAt: string;
}

export default function PendingClientsPage() {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Fetch pending users
  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const fetchPendingUsers = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<PendingUser[]>("/pending-clients");
      setPendingUsers(data);
    } catch (error) {
      console.error("Error fetching pending users:", error);
      showMessage("error", "Bekleyen kayıtlar yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId: number) => {
    if (processingId) return; // Prevent multiple clicks

    setProcessingId(userId);
    setMessage(null);

    try {
      const result = await apiClient.post(
        `/pending-clients/${userId}/approve`,
        {}
      );
      showMessage(
        "success",
        `✅ ${result.client.name} başarıyla onaylandı ve danışan listesine eklendi!`
      );
      // Remove from list
      setPendingUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (error: any) {
      console.error("Error approving client:", error);
      showMessage(
        "error",
        error.message || "Client onaylanırken bir hata oluştu"
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (userId: number) => {
    if (processingId) return; // Prevent multiple clicks

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
      await apiClient.delete(`/pending-clients/${userId}/reject`);
      showMessage("success", "✅ Kayıt başarıyla reddedildi");
      // Remove from list
      setPendingUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (error: any) {
      console.error("Error rejecting client:", error);
      showMessage("error", "Kayıt reddedilirken bir hata oluştu");
    } finally {
      setProcessingId(null);
    }
  };

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          <Clock className="w-8 h-8 text-blue-600" />
          Mobil App Onay Bekleyen Kayıtlar
        </h1>
        <p className="text-gray-600">
          Mobile uygulamadan kayıt olan danışanları onaylayarak kendi danışan
          listenize ekleyin. İlk onaylayan diyetisyen ile eşleşme yapılır.
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

      {/* Pending users list */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            Bekleyen Kayıtlar
            <span className="ml-2 px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              {pendingUsers.length}
            </span>
          </h2>
        </div>

        {loading ? (
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
          <div className="divide-y divide-gray-200">
            {pendingUsers.map((user) => (
              <div
                key={user.id}
                className="p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Mail className="w-5 h-5 text-gray-400" />
                      <span className="font-medium text-gray-900">
                        {user.email}
                      </span>
                    </div>

                    {user.referenceCode && (
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm text-gray-500">
                          Referans Kodu:
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {user.referenceCode}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar className="w-4 h-4" />
                      <span>
                        Kayıt: {new Date(user.createdAt).toLocaleString("tr-TR")}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-3 ml-6">
                    <button
                      onClick={() => handleApprove(user.id)}
                      disabled={processingId === user.id}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <CheckCircle className="w-4 h-4" />
                      {processingId === user.id ? "İşleniyor..." : "Onayla"}
                    </button>

                    <button
                      onClick={() => handleReject(user.id)}
                      disabled={processingId === user.id}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <XCircle className="w-4 h-4" />
                      Reddet
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info box */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">ℹ️ Nasıl Çalışır?</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>
            • Mobile uygulamadan kayıt olan danışanlar burada görünür
          </li>
          <li>• İlk onaylayan diyetisyen ile danışan eşleşir</li>
          <li>
            • Onaylandıktan sonra danışan listenizdeki diğer danışanlar gibi
            yönetebilirsiniz
          </li>
          <li>• Reddedilen kayıtlar kalıcı olarak silinir</li>
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

