"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  MessageCircle,
  Send,
  Clock,
  User,
  ArrowLeft,
  Image as ImageIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import ImageModal from "@/components/ImageModal";
import type { RealtimeChannel } from "@supabase/supabase-js";

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

export default function ClientMessagesPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const clientId = (params?.id as string) || "";
  const dietId = searchParams?.get("dietId") || "";

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [clientName, setClientName] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [realtimeError, setRealtimeError] = useState<string | null>(null);
  const supabaseClientRef = useRef(createClient());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const presenceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const messagesRef = useRef<Message[]>([]);
  const authHeadersRef = useRef<Record<string, string>>({});
  const latestMessageIdRef = useRef<number | null>(null);

  // Helper function to get auth headers
  const getAuthHeaders = async () => {
    const supabase = supabaseClientRef.current;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(session && { Authorization: `Bearer ${session.access_token}` }),
    };

    authHeadersRef.current = headers;
    return headers;
  };

  useEffect(() => {
    if (clientId && dietId) {
      loadMessages({ replace: true });
      loadClientInfo();
    }
  }, [clientId, dietId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!realtimeError || !clientId || !dietId) {
      return;
    }

    const interval = setInterval(() => {
      loadMessages({
        afterId: latestMessageIdRef.current,
      });
    }, 15000);

    return () => clearInterval(interval);
  }, [realtimeError, clientId, dietId]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Auto-mark messages as read when visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const unreadMessageIds: number[] = [];

        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const messageId = parseInt(entry.target.getAttribute("data-message-id") || "0");
            const isRead = entry.target.getAttribute("data-is-read") === "true";
            const isMyMessage = entry.target.getAttribute("data-is-my-message") === "true";

            // Only mark as read if: not already read, not my message, and visible for > 1 second
            if (!isRead && !isMyMessage && messageId) {
              unreadMessageIds.push(messageId);
            }
          }
        });

        if (unreadMessageIds.length > 0) {
          markMessagesAsRead(unreadMessageIds);
        }
      },
      {
        threshold: 0.8, // 80% of message must be visible
        rootMargin: "0px",
      }
    );

    // Observe all message elements
    const messageElements = document.querySelectorAll("[data-message-id]");
    messageElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [messages, clientId, dietId]);

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

  const loadMessages = async (
    options: { afterId?: number | null; replace?: boolean } = {}
  ) => {
    try {
      if (!clientId || !dietId) {
        console.error("❌ Client ID or Diet ID is missing");
        return;
      }

      const shouldShowLoader =
        options.replace || messagesRef.current.length === 0;
      if (shouldShowLoader) {
      setLoading(true);
      }

      const headers = await getAuthHeaders();
      const query = options.afterId ? `?afterId=${options.afterId}` : "";
      const response = await fetch(
        `/api/clients/${clientId}/diets/${dietId}/messages${query}`,
        { headers }
      );
      const data = await response.json();

      if (!data.success) {
        console.error("Failed to load messages:", data.error);
        return;
      }

      const incoming: Message[] = data.messages || [];

      if (options.replace || messagesRef.current.length === 0) {
        setMessages(incoming);
        messagesRef.current = incoming;
      } else if (incoming.length > 0) {
        const existingIds = new Set(messagesRef.current.map((msg) => msg.id));
        const toAppend = incoming.filter((msg) => !existingIds.has(msg.id));
        if (toAppend.length > 0) {
          const merged = [...messagesRef.current, ...toAppend];
          setMessages(merged);
          messagesRef.current = merged;
        }
      }

      updateLatestMessageId(
        options.replace || messagesRef.current.length === 0
          ? messagesRef.current
          : incoming
      );
    } catch (error) {
      console.error("Error loading messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadClientInfo = async () => {
    try {
      if (!clientId) {
        console.error("❌ Client ID is missing");
        return;
      }

      const headers = await getAuthHeaders();
      const response = await fetch(`/api/clients/${clientId}`, { headers });
      const data = await response.json();
      if (data.success) {
        setClientName(`${data.client.name} ${data.client.surname}`);
      }
    } catch (error) {
      console.error("Error loading client info:", error);
    }
  };

  const fetchMessageById = async (messageId: number): Promise<Message | null> => {
    try {
      const headers =
        Object.keys(authHeadersRef.current).length > 0
          ? authHeadersRef.current
          : await getAuthHeaders();
      const response = await fetch(
        `/api/clients/${clientId}/diets/${dietId}/messages?messageId=${messageId}`,
        { headers }
      );
      const data = await response.json();
      if (data.success && data.message) {
        return data.message as Message;
      }
    } catch (error) {
      console.error("Error fetching message by id:", error);
    }
    return null;
  };

  const updatePresence = async (
    isActive: boolean,
    options: { keepalive?: boolean } = {}
  ) => {
    if (!dietId) return;

    try {
      const headers =
        Object.keys(authHeadersRef.current).length > 0
          ? authHeadersRef.current
          : await getAuthHeaders();
      await fetch("/api/conversations/presence", {
        method: "POST",
        headers,
        body: JSON.stringify({
          dietId: Number(dietId),
          isActive,
          source: "web",
        }),
        keepalive: options.keepalive ?? false,
      });
    } catch (error) {
      console.error("❌ Presence update error:", error);
    }
  };

  useEffect(() => {
    if (!clientId || !dietId) return;

    updatePresence(true);

    const handleVisibility = () => {
      if (document.hidden) {
        updatePresence(false, { keepalive: true });
      } else {
        updatePresence(true);
      }
    };

    const handleBeforeUnload = () => {
      updatePresence(false, { keepalive: true });
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("beforeunload", handleBeforeUnload);

    presenceIntervalRef.current = setInterval(() => {
      updatePresence(true, { keepalive: true });
    }, 20000);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (presenceIntervalRef.current) {
        clearInterval(presenceIntervalRef.current);
        presenceIntervalRef.current = null;
      }
      updatePresence(false, { keepalive: true });
    };
  }, [clientId, dietId]);

  useEffect(() => {
    if (!clientId || !dietId) return;

    const supabase = supabaseClientRef.current;
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
            setMessages((prev) => [...prev, message]);
            messagesRef.current = [...messagesRef.current, message];
            updateLatestMessageId([message]);
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
        console.error("Realtime subscription failed:", err);
        if (!isMounted) {
          return;
        }
        const message =
          err instanceof Error && /insecure/i.test(err.message)
            ? "Tarayıcınız güvenli WebSocket bağlantısını engelledi. Mesajlar otomatik yenilenmeyecek."
            : "Gerçek zamanlı bağlantı kurulamadı. Mesajlar otomatik yenilenmeyecek.";
        setRealtimeError(message);
        // Fallback: zorunlu olarak bir defa daha mesajları çekelim
        loadMessages({
          afterId: latestMessageIdRef.current,
        });
        // Kanalı temizle
        supabase.removeChannel(channel);
      }
    };

    subscribeToChannel();
    channelRef.current = channel;

    return () => {
      isMounted = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [clientId, dietId]);

  const markMessagesAsRead = async (messageIds: number[]) => {
    try {
      if (!clientId || !dietId) {
        console.error("❌ Client ID or Diet ID is missing");
        return;
      }

      const headers = await getAuthHeaders();
      const response = await fetch(
        `/api/clients/${clientId}/diets/${dietId}/messages`,
        {
          method: "PATCH",
          headers,
          body: JSON.stringify({ messageIds }),
        }
      );

      const data = await response.json();

      if (data.success) {
        console.log(`✅ Marked ${data.markedCount} messages as read`);
        
        // Update local state to reflect read status
        setMessages((prev) =>
          prev.map((msg) =>
            messageIds.includes(msg.id)
              ? { ...msg, isRead: true, readAt: new Date().toISOString() }
              : msg
          )
        );
      } else {
        console.error("Failed to mark messages as read:", data.error);
      }
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  };

  const sendMessage = async () => {
    if (!messageText.trim()) return;

    if (!clientId || !dietId) {
      console.error("❌ Client ID or Diet ID is missing");
      return;
    }

    try {
      setSending(true);
      const headers = await getAuthHeaders();
      const response = await fetch(
        `/api/clients/${clientId}/diets/${dietId}/messages`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            content: messageText.trim(),
            ogunId: null,
            photos: [],
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        const newMessage: Message = data.message;
        setMessages((prev) => [...prev, newMessage]);
        messagesRef.current = [...messagesRef.current, newMessage];
        updateLatestMessageId([newMessage]);
        setMessageText("");
      } else {
        console.error("Failed to send message:", data.error);
        alert("Mesaj gönderilemedi: " + data.error);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Mesaj gönderilirken bir hata oluştu");
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const showInitialLoader = loading && messages.length === 0;

  if (showInitialLoader) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Mesajlar yükleniyor...</p>
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
      
      <div className="flex flex-col h-screen bg-gray-50">
        {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Geri
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">
              {clientName} ile İletişim
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Diyet #{dietId} • {messages.length} mesaj
            </p>
          </div>
        </div>
      </div>

      {realtimeError && (
        <div className="px-6 pt-3">
          <div className="rounded-md border border-amber-200 bg-amber-50 text-amber-800 text-sm px-4 py-3">
            <p>{realtimeError}</p>
            <button
              onClick={() =>
                loadMessages({
                  afterId: latestMessageIdRef.current,
                })
              }
              className="mt-2 text-amber-900 underline"
            >
              Mesaj listesini şimdi yenile
            </button>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <MessageCircle className="h-16 w-16 mb-4" />
            <p className="text-lg font-semibold">Henüz mesaj yok</p>
            <p className="text-sm">Danışanınızla iletişime geçin</p>
          </div>
        ) : (
          messages.map((message, index) => {
            const isMe = message.user.role === "dietitian";
            const showDate =
              index === 0 ||
              formatDate(messages[index - 1].createdAt) !==
                formatDate(message.createdAt);

            return (
              <div key={message.id}>
                {showDate && (
                  <div className="flex justify-center my-4">
                    <span className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">
                      {formatDate(message.createdAt)}
                    </span>
                  </div>
                )}

                <div
                  className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                >
                  <div
                    data-message-id={message.id}
                    data-is-read={message.isRead}
                    data-is-my-message={isMe}
                    className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                      isMe
                        ? "bg-blue-600 text-white"
                        : "bg-white text-gray-900 border border-gray-200"
                    }`}
                  >
                    {!isMe && (
                      <p className="text-xs font-semibold mb-1 text-gray-500">
                        {clientName}
                      </p>
                    )}

                    {message.ogun && (
                      <div
                        className={`text-xs px-2 py-1 rounded mb-2 inline-block ${
                          isMe
                            ? "bg-blue-500 text-white"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        📍 {message.ogun.name}
                      </div>
                    )}

                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {message.content}
                    </p>

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
                              alt="Meal photo"
                              className="h-32 w-32 object-cover rounded-lg"
                            />
                            <div className="absolute top-1 right-1 bg-black bg-opacity-50 text-white text-xs px-1.5 py-0.5 rounded">
                              <Clock className="inline h-2.5 w-2.5 mr-0.5" />
                              {formatTime(photo.uploadedAt)}
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 hover:bg-opacity-20 transition-all">
                              <ImageIcon className="h-6 w-6 text-white opacity-0 hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <p
                      className={`text-xs mt-1 ${
                        isMe ? "text-blue-100" : "text-gray-500"
                      }`}
                    >
                      {formatTime(message.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 px-6 py-4 shadow-lg">
        <div className="flex gap-3 items-end">
          <Textarea
            placeholder="Mesajınızı yazın..."
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={handleKeyPress}
            rows={2}
            maxLength={500}
            className="flex-1 resize-none"
          />
          <Button
            onClick={sendMessage}
            disabled={sending || !messageText.trim()}
            size="lg"
            className="px-6"
          >
            {sending ? (
              <span className="animate-pulse">Gönderiliyor...</span>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Gönder
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Enter ile gönderin • Shift+Enter ile yeni satır
        </p>
      </div>
    </div>
    </>
  );
}

