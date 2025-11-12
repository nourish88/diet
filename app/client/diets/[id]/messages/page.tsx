"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  Send,
  ArrowLeft,
  Camera,
  X,
  ChevronDown,
  Image as ImageIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import ImageModal from "@/components/ImageModal";

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

type MessagesResponse = {
  success: boolean;
  clientId: number;
  userId: number;
  messages: Message[];
  oguns: Ogun[];
};

interface PendingPhoto {
  id: string;
  dataUrl: string;
  name?: string;
}

const generateId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

export default function ClientMessagesPage() {
  const router = useRouter();
  const params = useParams();
  const dietId = (params?.id as string) || "";

  const supabase = useMemo(() => createClient(), []);

  const [messages, setMessages] = useState<Message[]>([]);
  const messagesRef = useRef<Message[]>([]);
  const latestMessageIdRef = useRef<number | null>(null);

  const [oguns, setOguns] = useState<Ogun[]>([]);
  const [messageText, setMessageText] = useState("");
  const [selectedOgun, setSelectedOgun] = useState<Ogun | null>(null);
  const [showOgunPicker, setShowOgunPicker] = useState(false);
  const [sending, setSending] = useState(false);
  const [clientId, setClientId] = useState<number | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [realtimeError, setRealtimeError] = useState<string | null>(null);
  const pendingPhotosRef = useRef<PendingPhoto[]>([]);
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!dietId) return;

    let active = true;
    const loadInitial = async () => {
      try {
        setLoading(true);
        const payload = await fetchMessages();
        if (!active) return;
        handleMessagesResponse(payload, { replace: true });
      } catch (error) {
        console.error("Initial messages load failed:", error);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadInitial();

    return () => {
      active = false;
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [dietId]);

  useEffect(() => {
    scrollToBottom();
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (messages.length === 0 || !userId) return;

    const unread = messages
      .filter((msg) => !msg.isRead && msg.user.id !== userId)
      .map((msg) => msg.id);

    if (unread.length === 0) {
      return;
    }

    const timer = setTimeout(() => {
      markMessagesAsRead(unread);
    }, 1500);

    return () => clearTimeout(timer);
  }, [messages, userId]);

  useEffect(() => {
    if (!dietId) return;

    let isMounted = true;

    const channel = supabase
      .channel(`diet-comments-${dietId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "DietComment",
          filter: `dietId=eq.${dietId}`,
        },
        async (payload) => {
          const newMessageId = (payload.new as any)?.id as number | undefined;
          if (!newMessageId) return;
          if (messagesRef.current.some((msg) => msg.id === newMessageId)) {
            return;
          }
          const message = await fetchMessageById(newMessageId);
          if (message) {
            appendMessages([message]);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "DietComment",
          filter: `dietId=eq.${dietId}`,
        },
        (payload) => {
          const updated = payload.new as any;
          if (!updated?.id) return;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === updated.id
                ? {
                    ...msg,
                    isRead:
                      typeof updated.isRead === "boolean"
                        ? updated.isRead
                        : msg.isRead,
                    readAt: updated.readAt
                      ? new Date(updated.readAt).toISOString()
                      : msg.readAt,
                  }
                : msg
            )
          );
        }
      );

    const subscribeToChannel = async () => {
      try {
        await channel.subscribe();
        if (isMounted) {
          setRealtimeError(null);
        }
      } catch (err) {
        console.error("Client realtime subscription failed:", err);
        if (!isMounted) return;
        const message =
          err instanceof Error && /insecure/i.test(err.message)
            ? "Tarayıcınız gerçek zamanlı bağlantıyı engelledi. Mesajlar periyodik olarak yenilenecek."
            : "Gerçek zamanlı bağlantı kurulamadı. Mesajlar periyodik olarak yenilenecek.";
        setRealtimeError(message);
      }
    };

    subscribeToChannel();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [dietId, supabase]);

  useEffect(() => {
    if (!realtimeError) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    const poll = async () => {
      try {
        const payload = await fetchMessages(latestMessageIdRef.current);
        handleMessagesResponse(payload);
      } catch (error) {
        console.error("Polling messages failed:", error);
      }
    };

    poll();
    pollingIntervalRef.current = setInterval(poll, 15000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [realtimeError]);

  const fetchMessages = async (
    afterId?: number | null
  ): Promise<MessagesResponse> => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        throw new Error("Session not found");
      }

    const query = afterId ? `?afterId=${afterId}` : "";
      const response = await fetch(
      `/api/client/portal/diets/${dietId}/messages${query}`,
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

    return response.json();
  };

  const handleMessagesResponse = (
    payload: MessagesResponse,
    options: { replace?: boolean } = {}
  ) => {
    if (!payload?.success) {
      return;
    }

    setClientId(payload.clientId);
    setUserId(payload.userId);
    setOguns(payload.oguns || []);

    const incoming = payload.messages || [];

    if (options.replace || messagesRef.current.length === 0) {
      setMessages(incoming);
      messagesRef.current = incoming;
      updateLatestMessageId(incoming);
      return;
    }

    appendMessages(incoming);
  };

  const appendMessages = (incoming: Message[]) => {
    if (!Array.isArray(incoming) || incoming.length === 0) {
      return;
    }

    const existingIds = new Set(messagesRef.current.map((msg) => msg.id));
    const toAppend = incoming.filter((msg) => !existingIds.has(msg.id));

    if (toAppend.length === 0) {
      return;
    }

    const merged = [...messagesRef.current, ...toAppend];
    setMessages(merged);
    messagesRef.current = merged;
    updateLatestMessageId(toAppend);
  };

  const updateLatestMessageId = (candidates: Message[]) => {
    if (!Array.isArray(candidates) || candidates.length === 0) {
      return;
    }

    const newest = candidates[candidates.length - 1];
    if (!newest) return;

    if (
      latestMessageIdRef.current === null ||
      newest.id > latestMessageIdRef.current
    ) {
      latestMessageIdRef.current = newest.id;
    }
  };

  const markMessagesAsRead = async (messageIds: number[]) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session || !clientId) return;

      const response = await fetch(
        `/api/clients/${clientId}/diets/${dietId}/messages`,
        {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ messageIds }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to mark messages as read");
      }

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

  const refreshConversation = async () => {
    try {
      setIsRefreshing(true);
      const payload = await fetchMessages();
      handleMessagesResponse(payload, { replace: true });
    } catch (error) {
      console.error("Manual refresh failed:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const refreshIncrementalMessages = async () => {
    try {
      const payload = await fetchMessages(latestMessageIdRef.current);
      handleMessagesResponse(payload);
    } catch (error) {
      console.error("Manual incremental refresh failed:", error);
    }
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    try {
      const dataUrls = await Promise.all(
        Array.from(files).map(async (file) => {
          const dataUrl = await readFileAsDataUrl(file);
          return {
            id: generateId(),
            dataUrl,
            name: file.name,
          };
        })
      );

      pendingPhotosRef.current = [
        ...pendingPhotosRef.current,
        ...dataUrls,
      ];
      setPendingPhotos(pendingPhotosRef.current);
    } catch (error) {
      console.error("Image conversion failed:", error);
      alert("Görsel yüklenirken bir sorun oluştu.");
    } finally {
      event.target.value = "";
    }
  };

  const removePendingPhoto = (id: string) => {
    pendingPhotosRef.current = pendingPhotosRef.current.filter(
      (photo) => photo.id !== id
    );
    setPendingPhotos(pendingPhotosRef.current);
  };

  const sendMessage = async () => {
    const trimmed = messageText.trim();
    if (!trimmed && pendingPhotosRef.current.length === 0) {
      return;
    }

    try {
      setSending(true);
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
            content: trimmed,
            ogunId: selectedOgun?.id || null,
            photos: pendingPhotosRef.current.map((photo) => ({
              imageData: photo.dataUrl,
            })),
          }),
        }
      );

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        throw new Error(errorPayload?.error || "Mesaj gönderilemedi");
      }

      const payload = await response.json();
      if (payload?.success && payload.message) {
        appendMessages([payload.message]);
        setMessageText("");
        setSelectedOgun(null);
        pendingPhotosRef.current = [];
        setPendingPhotos([]);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Mesaj gönderilirken bir hata oluştu"
      );
    } finally {
      setSending(false);
    }
  };

  const fetchMessageById = async (
    messageId: number
  ): Promise<Message | null> => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session || !clientId) {
        return null;
      }

      const response = await fetch(
        `/api/clients/${clientId}/diets/${dietId}/messages?messageId=${messageId}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      if (data?.success && data.message) {
        return data.message as Message;
      }

      return null;
    } catch (error) {
      console.error("fetchMessageById failed:", error);
      return null;
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

  const showInitialLoader = loading && messagesRef.current.length === 0;

  if (showInitialLoader) {
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
            onClick={refreshConversation}
            disabled={isRefreshing}
          className="mt-3 inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {isRefreshing ? "Yenileniyor..." : "Konuşmayı Yenile"}
        </button>
      </div>

        {realtimeError && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-lg">
            <p>{realtimeError}</p>
            <button
              onClick={refreshIncrementalMessages}
              className="mt-2 underline text-amber-900"
            >
              Mesajları şimdi yenile
            </button>
          </div>
        )}

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

                      <div
                        className={`flex ${
                          isMe ? "justify-end" : "justify-start"
                        }`}
                      >
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

                          {message.content && (
                            <p className="text-sm whitespace-pre-line">
                              {message.content}
                            </p>
                          )}

                        {message.photos && message.photos.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {message.photos.map((photo) => (
                              <div
                                key={photo.id}
                                className="relative rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() =>
                                    setSelectedImage(photo.imageData)
                                  }
                              >
                                <img
                                  src={photo.imageData}
                                    alt="Mesaj görseli"
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

        <div className="border-t border-gray-200 p-4">
          {selectedOgun && (
              <div className="flex items-center justify-between bg-yellow-50 text-yellow-800 px-3 py-2 rounded-lg mb-3">
              <span className="text-sm">📍 {selectedOgun.name}</span>
              <button
                onClick={() => setSelectedOgun(null)}
                className="text-yellow-600 hover:text-yellow-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

            {pendingPhotos.length > 0 && (
              <div className="flex flex-wrap gap-3 mb-3">
                {pendingPhotos.map((photo) => (
                  <div key={photo.id} className="relative">
                    <img
                      src={photo.dataUrl}
                      alt={photo.name || "Seçili görsel"}
                      className="h-20 w-20 object-cover rounded-lg border border-gray-200"
                    />
                    <button
                      onClick={() => removePendingPhoto(photo.id)}
                      className="absolute -top-2 -right-2 bg-white border border-gray-300 rounded-full p-1 text-gray-600 hover:text-red-600 shadow-sm"
                      title="Görseli kaldır"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
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
                  <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-[200px] z-10">
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
                        {ogun.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                title="Görsel ekle"
              >
                <Camera className="w-5 h-5" />
              </button>

              <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Mesajınızı yazın..."
                className="flex-1 border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows={3}
            />

            <button
              onClick={sendMessage}
                disabled={sending}
                className="flex items-center justify-center bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? (
                  <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
    </>
  );
}

