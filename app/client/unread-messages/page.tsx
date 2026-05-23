"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MessageCircle, Calendar, Clock, ChevronRight, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import { apiClient } from "@/lib/api-client";

interface UnreadConversation {
  clientId: number;
  clientName: string;
  dietId: number;
  dietDate: string | null;
  unreadCount: number;
  messages: Array<{
    id: number;
    content: string;
    createdAt: string;
    ogun: {
      id: number;
      name: string;
    } | null;
  }>;
}

export default function ClientUnreadMessagesPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<UnreadConversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUnreadMessages();

    // Refresh every 30 seconds
    const interval = setInterval(loadUnreadMessages, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadUnreadMessages = async () => {
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return;

      const data = await apiClient.get<{ conversations: any[] }>("/unread-messages/list");
      setConversations(data.conversations || []);
    } catch (error) {
      console.error("Error loading unread messages:", error);
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
      return `${diffInMinutes} dakika önce`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} saat önce`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} gün önce`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Mesajlar yükleniyor...</p>
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
              Sohbetler
            </h1>
            <p className="text-muted-foreground">
              {conversations.length > 0
                ? `${conversations.length} konuşmada okunmamış mesaj var`
                : "Tüm mesajlarınızı okudunuz"}
            </p>
          </div>
        </div>

        {/* Conversations */}
        {conversations.length === 0 ? (
          <div className="bg-card rounded-2xl shadow-lg border border-border p-12 text-center">
            <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Okunmamış mesajınız yok
            </h3>
            <p className="text-muted-foreground">
              Tüm mesajlarınızı okudunuz. Harika! 🎉
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {conversations.map((conversation) => {
              const latestMessage = conversation.messages[0];

              return (
                <Link
                  key={`${conversation.dietId}`}
                  href={`/client/diets/${conversation.dietId}/messages`}
                  className="block bg-card rounded-2xl shadow-lg border-2 border-border hover:border-purple-400 hover:shadow-xl p-6 transition-all group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Header */}
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
                          <MessageCircle className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-foreground">
                            Diyet #{conversation.dietId}
                          </h3>
                          {conversation.dietDate && (
                            <div className="flex items-center text-xs text-muted-foreground">
                              <Calendar className="w-3 h-3 mr-1" />
                              {formatDate(conversation.dietDate)}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Latest Message */}
                      {latestMessage && (
                        <div className="ml-15">
                          <p className="text-sm text-muted-foreground font-medium mb-1">
                            Diyetisyen:
                          </p>
                          {latestMessage.ogun && (
                            <span className="inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full mb-2">
                              📍 {latestMessage.ogun.name}
                            </span>
                          )}
                          <p className="text-sm text-foreground line-clamp-2 font-medium">
                            {latestMessage.content}
                          </p>
                          <div className="flex items-center text-xs text-muted-foreground mt-2">
                            <Clock className="w-3 h-3 mr-1" />
                            {formatTime(latestMessage.createdAt)}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Badge & Arrow */}
                    <div className="flex items-center space-x-3 ml-4">
                      <div className="bg-red-500 text-white text-sm font-bold rounded-full w-10 h-10 flex items-center justify-center shadow-lg">
                        {conversation.unreadCount}
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground/70 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
