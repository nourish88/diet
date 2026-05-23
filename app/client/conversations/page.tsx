"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  MessageCircle,
  Calendar,
  Clock,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { apiClient } from "@/lib/api-client";

interface Conversation {
  dietId: number;
  dietDate: string | null;
  totalMessages: number;
  unreadCount: number;
  lastMessage: {
    id: number;
    content: string;
    createdAt: string;
    userId: number;
    userRole: string;
    ogun: {
      id: number;
      name: string;
    } | null;
  } | null;
}

export default function ClientConversationsPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConversations();

    // Refresh every 30 seconds
    const interval = setInterval(loadConversations, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadConversations = async () => {
    try {
      const data = await apiClient.get<{ conversations: Conversation[] }>("/client/portal/conversations");
      setConversations(data.conversations || []);
    } catch (error) {
      console.error("Error loading conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Tarih yok";
    return new Date(dateString).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return diffInMinutes <= 0 ? "Az önce" : `${diffInMinutes} dakika önce`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} saat önce`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7) {
        return `${diffInDays} gün önce`;
      } else {
        return new Date(dateString).toLocaleDateString("tr-TR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Sohbetler yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header with Back Button */}
        <div className="mb-6">
          <Link
            href="/client"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4 font-medium"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Anasayfaya Dön
          </Link>
          <div className="bg-card rounded-2xl shadow-lg border border-border p-6">
            <div className="flex justify-center mb-4">
              <img
                src="/ezgi_evgin.png"
                alt="Ezgi Evgin Beslenme ve Diyet Danışmanlığı"
                className="max-w-[150px] h-auto"
                style={{ width: "150px", height: "auto" }}
              />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center justify-center">
              <MessageCircle className="w-7 h-7 mr-3 text-purple-600" />
              Sohbetlerim
            </h1>
            <p className="text-muted-foreground text-center">
              Tüm diyet sohbetlerinizi görüntüleyin
            </p>
          </div>
        </div>

        {/* Conversations */}
        {conversations.length === 0 ? (
          <Card className="p-12 text-center">
            <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Henüz sohbet yok
            </h3>
            <p className="text-muted-foreground">
              Diyetlerinizle ilgili sohbetler burada görünecek
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {conversations.map((conversation) => {
              const dietDateFormatted = formatDate(conversation.dietDate);
              const dietDay = conversation.dietDate
                ? new Date(conversation.dietDate).getDate()
                : null;
              const dietMonth = conversation.dietDate
                ? new Date(conversation.dietDate).toLocaleDateString("tr-TR", {
                    month: "long",
                  })
                : null;

              return (
                <Link
                  key={conversation.dietId}
                  href={`/client/diets/${conversation.dietId}/messages`}
                  className="block"
                >
                  <Card className="hover:shadow-xl transition-all border-2 border-border hover:border-purple-400 cursor-pointer group">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          {/* Header */}
                          <div className="flex items-center space-x-3 mb-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                              <MessageCircle className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-lg font-bold text-foreground">
                                {dietDay && dietMonth
                                  ? `${dietDay} ${dietMonth} tarihli ${conversation.dietId} numaralı diyete ilişkin sohbetler`
                                  : `${conversation.dietId} numaralı diyete ilişkin sohbetler`}
                              </h3>
                              {conversation.dietDate && (
                                <div className="flex items-center text-xs text-muted-foreground mt-1">
                                  <Calendar className="w-3 h-3 mr-1" />
                                  {dietDateFormatted}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Message Info */}
                          {conversation.lastMessage ? (
                            <div className="ml-[60px] mt-3">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs text-muted-foreground font-medium">
                                  {conversation.lastMessage.userRole ===
                                  "dietitian"
                                    ? "Diyetisyen"
                                    : "Siz"}
                                  :
                                </p>
                                <div className="flex items-center text-xs text-muted-foreground">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {formatTime(conversation.lastMessage.createdAt)}
                                </div>
                              </div>
                              {conversation.lastMessage.ogun && (
                                <span className="inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full mb-2">
                                  📍 {conversation.lastMessage.ogun.name}
                                </span>
                              )}
                              <p className="text-sm text-foreground line-clamp-2">
                                {conversation.lastMessage.content}
                              </p>
                            </div>
                          ) : (
                            <div className="ml-[60px] mt-3">
                              <p className="text-sm text-muted-foreground italic">
                                Henüz mesaj yok
                              </p>
                            </div>
                          )}

                          {/* Message Count */}
                          {conversation.totalMessages > 0 && (
                            <div className="ml-[60px] mt-3">
                              <p className="text-xs text-muted-foreground">
                                Toplam {conversation.totalMessages} mesaj
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Badge & Arrow */}
                        <div className="flex items-center space-x-3 ml-4 flex-shrink-0">
                          {conversation.unreadCount > 0 && (
                            <div className="bg-red-500 text-white text-sm font-bold rounded-full w-10 h-10 flex items-center justify-center shadow-lg">
                              {conversation.unreadCount}
                            </div>
                          )}
                          <ChevronRight className="w-5 h-5 text-muted-foreground/70 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

