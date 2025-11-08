import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  AppState,
} from "react-native";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import { useAuthStore } from "@/features/auth/stores/auth-store";
import api from "@/core/api/client";
import { Loading } from "@/shared/ui/Loading";
import {
  Send,
  Camera,
  X,
  Clock,
  User,
  ChevronDown,
  ArrowLeft,
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import supabase from "@/lib/supabase";
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

interface Ogun {
  id: number;
  name: string;
}

export default function MessagesScreen() {
  const router = useRouter();
  const { id: dietId } = useLocalSearchParams();
  const { user } = useAuthStore();
  const scrollViewRef = useRef<ScrollView>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  // Form state
  const [messageText, setMessageText] = useState("");
  const [selectedOgun, setSelectedOgun] = useState<Ogun | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [showOgunPicker, setShowOgunPicker] = useState(false);
  
  // Available oguns (will be fetched from diet)
  const [oguns, setOguns] = useState<Ogun[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const presenceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const messagesRef = useRef<Message[]>([]);

  useEffect(() => {
    loadMessages();
    loadDietOguns();
  }, []);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Auto-mark messages as read after they've been loaded and displayed
  useEffect(() => {
    if (messages.length === 0 || !user?.client?.id) return;

    // Find unread messages from the other party (not from me)
    const unreadMessageIds = messages
      .filter((msg) => !msg.isRead && msg.user.id !== user.id)
      .map((msg) => msg.id);

    if (unreadMessageIds.length > 0) {
      // Wait a bit for messages to render, then mark as read
      const timer = setTimeout(() => {
        markMessagesAsRead(unreadMessageIds);
      }, 1500); // 1.5 seconds delay

      return () => clearTimeout(timer);
    }
  }, [messages, user]);

  const updatePresence = async (isActive: boolean) => {
    const clientId = user?.client?.id;
    if (!clientId || !dietId) return;
    try {
      await api.post("/api/conversations/presence", {
        dietId: Number(dietId),
        isActive,
        source: "pwa",
      });
    } catch (error) {
      console.error("❌ Presence update error:", error);
    }
  };

  const fetchMessageById = async (messageId: number): Promise<Message | null> => {
    const clientId = user?.client?.id;
    if (!clientId) return null;
    try {
      const response = await api.get<{
        success: boolean;
        message: Message;
      }>(
        `/api/clients/${clientId}/diets/${dietId}/messages?messageId=${messageId}`
      );
      if (response.success && response.message) {
        return response.message;
      }
    } catch (error) {
      console.error("Error fetching message by id:", error);
    }
    return null;
  };

  const loadMessages = async () => {
    try {
      setLoading(true);
      const clientId = user?.client?.id;
      if (!clientId) return;

      const response = await api.get(
        `/api/clients/${clientId}/diets/${dietId}/messages`
      );
      setMessages(response.messages || []);
      
      // Scroll to bottom after loading
      setTimeout(() => scrollToBottom(), 100);
    } catch (error) {
      console.error("Error loading messages:", error);
      Alert.alert("Hata", "Mesajlar yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  const markMessagesAsRead = async (messageIds: number[]) => {
    try {
      const clientId = user?.client?.id;
      if (!clientId || messageIds.length === 0) return;

      console.log(`📖 Marking ${messageIds.length} messages as read...`);

      const response = await api.patch(
        `/api/clients/${clientId}/diets/${dietId}/messages`,
        { messageIds }
      );

      if (response.success) {
        console.log(`✅ Marked ${response.markedCount} messages as read`);
        
        // Update local state
        setMessages((prev) =>
          prev.map((msg) =>
            messageIds.includes(msg.id)
              ? { ...msg, isRead: true, readAt: new Date().toISOString() }
              : msg
          )
        );
      }
    } catch (error) {
      console.error("❌ Error marking messages as read:", error);
    }
  };

  const loadDietOguns = async () => {
    try {
      const clientId = user?.client?.id;
      if (!clientId) return;

      const response = await api.get(
        `/api/clients/${clientId}/diets/${dietId}`
      );
      setOguns(response.diet?.oguns || []);
    } catch (error) {
      console.error("Error loading oguns:", error);
    }
  };

  useEffect(() => {
    if (!user?.client?.id || !dietId) return;

    updatePresence(true);

    const handleAppStateChange = (nextState: string) => {
      if (nextState === "active") {
        updatePresence(true);
      } else if (nextState === "background" || nextState === "inactive") {
        updatePresence(false);
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );

    presenceIntervalRef.current = setInterval(() => {
      updatePresence(true);
    }, 20000);

    return () => {
      subscription.remove();
      if (presenceIntervalRef.current) {
        clearInterval(presenceIntervalRef.current);
        presenceIntervalRef.current = null;
      }
      updatePresence(false);
    };
  }, [user?.client?.id, dietId]);

  useEffect(() => {
    if (!user?.client?.id || !dietId) return;

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
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.client?.id, dietId]);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets) {
        const photos = result.assets.map(asset => 
          `data:image/jpeg;base64,${asset.base64}`
        );
        setSelectedPhotos([...selectedPhotos, ...photos]);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Hata", "Fotoğraf seçilemedi");
    }
  };

  const takePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const photo = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setSelectedPhotos([...selectedPhotos, photo]);
      }
    } catch (error) {
      console.error("Error taking photo:", error);
      Alert.alert("Hata", "Fotoğraf çekilemedi");
    }
  };

  const removePhoto = (index: number) => {
    setSelectedPhotos(selectedPhotos.filter((_, i) => i !== index));
  };

  const sendMessage = async () => {
    if (!messageText.trim() && selectedPhotos.length === 0) {
      Alert.alert("Uyarı", "Lütfen bir mesaj yazın veya fotoğraf ekleyin");
      return;
    }

    try {
      setSending(true);
      const clientId = user?.client?.id;
      if (!clientId) return;

      const payload = {
        content: messageText.trim(),
        ogunId: selectedOgun?.id || null,
        photos: selectedPhotos.map(photo => ({ imageData: photo })),
      };

      const response = await api.post(
        `/api/clients/${clientId}/diets/${dietId}/messages`,
        payload
      );

      // Add new message to list
      setMessages((prev) => [...prev, response.message]);

      // Clear form
      setMessageText("");
      setSelectedPhotos([]);
      setSelectedOgun(null);
      
      // Scroll to bottom
      setTimeout(() => scrollToBottom(), 100);
    } catch (error: any) {
      console.error("Error sending message:", error);
      Alert.alert("Hata", "Mesaj gönderilemedi");
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
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

  if (loading) {
    return <Loading text="Mesajlar yükleniyor..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color="#3b82f6" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Diyetisyenimle İletişim</Text>
            <Text style={styles.headerSubtitle}>
              {messages.length} mesaj
            </Text>
          </View>
          <View style={styles.headerRight} />
        </View>

        {/* Messages List */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => scrollToBottom()}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              <User size={64} color="#d1d5db" />
              <Text style={styles.emptyText}>Henüz mesaj yok</Text>
              <Text style={styles.emptySubtext}>
                Diyetisyeninizle iletişime geçin
              </Text>
            </View>
          ) : (
            messages.map((message, index) => {
              const isMe = message.user.id === user?.id;
              const showDate =
                index === 0 ||
                formatDate(messages[index - 1].createdAt) !==
                  formatDate(message.createdAt);

              return (
                <View key={message.id}>
                  {showDate && (
                    <View style={styles.dateSeparator}>
                      <Text style={styles.dateSeparatorText}>
                        {formatDate(message.createdAt)}
                      </Text>
                    </View>
                  )}

                  <View
                    style={[
                      styles.messageBubble,
                      isMe ? styles.messageBubbleMe : styles.messageBubbleThem,
                    ]}
                  >
                    {!isMe && (
                      <Text style={styles.senderName}>
                        {message.user.role === "dietitian" ? "Diyetisyen" : "Ben"}
                      </Text>
                    )}

                    {message.ogun && (
                      <View style={styles.ogunBadge}>
                        <Text style={styles.ogunBadgeText}>
                          📍 {message.ogun.name}
                        </Text>
                      </View>
                    )}

                    <Text
                      style={[
                        styles.messageText,
                        isMe ? styles.messageTextMe : styles.messageTextThem,
                      ]}
                    >
                      {message.content}
                    </Text>

                    {message.photos && message.photos.length > 0 && (
                      <View style={styles.photosContainer}>
                        {message.photos.map((photo) => (
                          <Image
                            key={photo.id}
                            source={{ uri: photo.imageData }}
                            style={styles.messagePhoto}
                            resizeMode="cover"
                          />
                        ))}
                      </View>
                    )}

                    <Text
                      style={[
                        styles.messageTime,
                        isMe ? styles.messageTimeMe : styles.messageTimeThem,
                      ]}
                    >
                      {formatTime(message.createdAt)}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* Input Area */}
        <View style={styles.inputContainer}>
          {/* Ogun Selector */}
          {selectedOgun && (
            <View style={styles.selectedOgunBadge}>
              <Text style={styles.selectedOgunText}>
                📍 {selectedOgun.name}
              </Text>
              <TouchableOpacity onPress={() => setSelectedOgun(null)}>
                <X size={16} color="#ef4444" />
              </TouchableOpacity>
            </View>
          )}

          {/* Photo Previews */}
          {selectedPhotos.length > 0 && (
            <ScrollView horizontal style={styles.photoPreviewContainer}>
              {selectedPhotos.map((photo, index) => (
                <View key={index} style={styles.photoPreview}>
                  <Image
                    source={{ uri: photo }}
                    style={styles.previewImage}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    style={styles.removePhotoButton}
                    onPress={() => removePhoto(index)}
                  >
                    <X size={16} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}

          <View style={styles.inputRow}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => setShowOgunPicker(!showOgunPicker)}
            >
              <ChevronDown size={24} color="#6b7280" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconButton}
              onPress={pickImage}
            >
              <Camera size={24} color="#6b7280" />
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              placeholder="Mesajınızı yazın..."
              value={messageText}
              onChangeText={setMessageText}
              multiline
              maxLength={500}
            />

            <TouchableOpacity
              style={[
                styles.sendButton,
                (!messageText.trim() && selectedPhotos.length === 0) &&
                  styles.sendButtonDisabled,
              ]}
              onPress={sendMessage}
              disabled={
                sending ||
                (!messageText.trim() && selectedPhotos.length === 0)
              }
            >
              {sending ? (
                <Text style={styles.sendButtonText}>...</Text>
              ) : (
                <Send size={20} color="#ffffff" />
              )}
            </TouchableOpacity>
          </View>

          {/* Ogun Picker Dropdown */}
          {showOgunPicker && (
            <View style={styles.ogunPicker}>
              <TouchableOpacity
                style={styles.ogunOption}
                onPress={() => {
                  setSelectedOgun(null);
                  setShowOgunPicker(false);
                }}
              >
                <Text style={styles.ogunOptionText}>❌ Öğün seçme</Text>
              </TouchableOpacity>
              {oguns.map((ogun) => (
                <TouchableOpacity
                  key={ogun.id}
                  style={styles.ogunOption}
                  onPress={() => {
                    setSelectedOgun(ogun);
                    setShowOgunPicker(false);
                  }}
                >
                  <Text style={styles.ogunOptionText}>📍 {ogun.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  headerRight: {
    width: 40,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 4,
  },
  dateSeparator: {
    alignItems: "center",
    marginVertical: 16,
  },
  dateSeparatorText: {
    fontSize: 12,
    color: "#9ca3af",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  messageBubble: {
    maxWidth: "80%",
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  messageBubbleMe: {
    alignSelf: "flex-end",
    backgroundColor: "#3b82f6",
  },
  messageBubbleThem: {
    alignSelf: "flex-start",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  senderName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 4,
  },
  ogunBadge: {
    backgroundColor: "#fef3c7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 6,
    alignSelf: "flex-start",
  },
  ogunBadgeText: {
    fontSize: 11,
    color: "#92400e",
    fontWeight: "500",
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  messageTextMe: {
    color: "#ffffff",
  },
  messageTextThem: {
    color: "#111827",
  },
  photosContainer: {
    marginTop: 8,
    gap: 4,
  },
  messagePhoto: {
    width: 200,
    height: 200,
    borderRadius: 8,
    marginTop: 4,
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
  },
  messageTimeMe: {
    color: "#dbeafe",
    textAlign: "right",
  },
  messageTimeThem: {
    color: "#9ca3af",
  },
  inputContainer: {
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    padding: 8,
  },
  selectedOgunBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fef3c7",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedOgunText: {
    fontSize: 13,
    color: "#92400e",
    fontWeight: "500",
  },
  photoPreviewContainer: {
    marginBottom: 8,
  },
  photoPreview: {
    position: "relative",
    marginRight: 8,
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removePhotoButton: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#ef4444",
    borderRadius: 12,
    padding: 4,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  iconButton: {
    padding: 8,
  },
  input: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: "#3b82f6",
    borderRadius: 20,
    padding: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#9ca3af",
  },
  sendButtonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  ogunPicker: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  ogunOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  ogunOptionText: {
    fontSize: 15,
    color: "#374151",
  },
});

