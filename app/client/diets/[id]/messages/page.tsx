"use client";
import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  Send,
  ArrowLeft,
  Camera,
  X,
  Clock,
  ChevronDown,
  Image as ImageIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import ImageModal from "@/components/ImageModal";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface Message {
  id: number;
  content: string;
  createdAt: string;
  isRead: boolean;
  readAt: string | null;
  user: {
    id: number;
    email: string;
    role: string;
  };
  ogun: {
    id: number;
    name: string;
  } | null;
  photos: Array<{
    id: number;
    imageData: string;
    uploadedAt: string;
    expiresAt: string;
  }>;
}

interface Ogun {
  id: number;
  name: string;
}

export default function ClientMessagesPage() {
  const router = useRouter();
  const params = useParams();
  const dietId = (params?.id as string) || "";

  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();

  const [messages, setMessages] = useState<Message[]>([]);
  const [oguns, setOguns] = useState<Ogun[]>([]);
  const [messageText, setMessageText] = useState("");
  const [selectedOgun, setSelectedOgun] = useState<Ogun | null>(null);
  const [showOgunPicker, setShowOgunPicker] = useState(false);
  const [sending, setSending] = useState(false);
  const [clientId, setClientId] = useState<number | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    data,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["client-diet-messages", dietId],
    enabled: Boolean(dietId),
    queryFn: async () => {
      if (!dietId) throw new Error("Diet ID missing");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        throw new Error("Session not found");
      }

      const response = await fetch(
        `/api/client/portal/diets/${dietId}/messages`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          router.push("/client/diets");
        }
        throw new Error("Failed to load messages");
      }

      return response.json() as Promise<{
        success: boolean;
        clientId: number;
        userId: number;
        messages: Message[];
        oguns: Ogun[];
      }>;
    },
  });

  useEffect(() => {
    if (data) {
      setMessages(data.messages || []);
      setOguns(data.oguns || []);
      setClientId(data.clientId);
      setUserId(data.userId);
    }
  }, [data]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-mark messages as read
  useEffect(() => {
    if (messages.length === 0 || !userId) return;

    const unreadMessageIds = messages
      .filter((msg) => !msg.isRead && msg.user.id !== userId)
      .map((msg) => msg.id);

    if (unreadMessageIds.length > 0) {
      const timer = setTimeout(() => {
        markMessagesAsRead(unreadMessageIds);
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [messages, userId]);

  const markMessagesAsRead = async (messageIds: number[]) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session || !clientId) return;

      await fetch(`/api/clients/${clientId}/diets/${dietId}/messages`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ messageIds }),
      });

      // Update local state
      setMessages((prev) =>
        prev.map((msg) =>
          messageIds.includes(msg.id)
            ? { ...msg, isRead: true, readAt: new Date().toISOString() }
            : msg
        )
      );
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  };

  const sendMessage = async () => {
    if (!messageText.trim()) return;

    try {
      setSending(true);
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session || !clientId) return;

      const response = await fetch(
        `/api/clients/${clientId}/diets/${dietId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            content: messageText.trim(),
            ogunId: selectedOgun?.id || null,
            photos: [],
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setMessages([...messages, data.message]);
        setMessageText("");
        setSelectedOgun(null);
        queryClient.invalidateQueries({
          queryKey: ["client-portal-overview"],
        });
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Mesajlar yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <ImageModal
        isOpen={selectedImage !== null}
        imageUrl={selectedImage || ""}
        onClose={() => setSelectedImage(null)}
      />
      
      <div className="space-y-6">
        {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <Link
          href={`/client/diets/${dietId}`}
          className="flex items-center text-blue-600 hover:text-blue-700 mb-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Diyete Dön
        </Link>
        <h1 className="text-xl font-semibold text-gray-900">
          Diyetisyenimle İletişim
        </h1>
        <p className="text-sm text-gray-600">Diyet #{dietId}</p>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="mt-3 inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isFetching ? "Yenileniyor..." : "Konuşmayı Yenile"}
        </button>
      </div>

      {/* Messages */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="h-[500px] overflow-y-auto p-6">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Henüz mesaj yok</p>
              <p className="text-sm text-gray-400 mt-2">
                Diyetisyeninize ilk mesajı gönderin
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => {
                const isMe = message.user.id === userId;
                const showDate =
                  index === 0 ||
                  formatDate(messages[index - 1].createdAt) !==
                    formatDate(message.createdAt);

                return (
                  <div key={message.id}>
                    {showDate && (
                      <div className="text-center my-4">
                        <span className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">
                          {formatDate(message.createdAt)}
                        </span>
                      </div>
                    )}

                    <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[70%] ${
                          isMe
                            ? "bg-blue-600 text-white rounded-lg rounded-br-none"
                            : "bg-gray-100 text-gray-900 rounded-lg rounded-bl-none"
                        } p-4`}
                      >
                        {!isMe && (
                          <p className="text-xs text-gray-600 mb-1">
                            Diyetisyen
                          </p>
                        )}

                        {message.ogun && (
                          <div className="mb-2 inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                            📍 {message.ogun.name}
                          </div>
                        )}

                        <p className="text-sm">{message.content}</p>

                        {message.photos && message.photos.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {message.photos.map((photo) => (
                              <div
                                key={photo.id}
                                className="relative rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => setSelectedImage(photo.imageData)}
                              >
                                <img
                                  src={photo.imageData}
                                  alt="Message photo"
                                  className="h-32 w-32 object-cover rounded-lg"
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 hover:bg-opacity-20 transition-all">
                                  <ImageIcon className="h-6 w-6 text-white opacity-0 hover:opacity-100 transition-opacity" />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <p
                          className={`text-xs mt-2 ${
                            isMe ? "text-blue-100" : "text-gray-500"
                          }`}
                        >
                          {formatTime(message.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 p-4">
          {selectedOgun && (
            <div className="flex items-center justify-between bg-yellow-50 text-yellow-800 px-3 py-2 rounded-lg mb-2">
              <span className="text-sm">📍 {selectedOgun.name}</span>
              <button
                onClick={() => setSelectedOgun(null)}
                className="text-yellow-600 hover:text-yellow-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex items-end space-x-2">
            <div className="relative">
              <button
                onClick={() => setShowOgunPicker(!showOgunPicker)}
                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                title="Öğün seç"
              >
                <ChevronDown className="w-5 h-5" />
              </button>

              {showOgunPicker && oguns.length > 0 && (
                <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-[200px]">
                  <button
                    onClick={() => {
                      setSelectedOgun(null);
                      setShowOgunPicker(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                  >
                    ❌ Öğün seçme
                  </button>
                  {oguns.map((ogun) => (
                    <button
                      key={ogun.id}
                      onClick={() => {
                        setSelectedOgun(ogun);
                        setShowOgunPicker(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                    >
                      📍 {ogun.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <input
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Mesajınızı yazın..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              maxLength={500}
            />

            <button
              onClick={sendMessage}
              disabled={sending || !messageText.trim()}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {sending ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}

