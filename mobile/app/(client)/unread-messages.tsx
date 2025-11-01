import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
} from "react-native";
import { useRouter, Stack } from "expo-router";
import { useAuthStore } from "@/features/auth/stores/auth-store";
import api from "@/core/api/client";
import { Loading } from "@/shared/ui/Loading";
import {
  MessageCircle,
  ArrowLeft,
  Calendar,
  Clock,
  ChevronRight,
} from "lucide-react-native";

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

export default function UnreadMessagesScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [conversations, setConversations] = useState<UnreadConversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadUnreadMessages();
  }, []);

  const loadUnreadMessages = async () => {
    try {
      setIsLoading(true);
      const response = await api.get("/api/unread-messages/list");
      
      if (response.success) {
        setConversations(response.conversations || []);
      }
    } catch (error) {
      console.error("❌ Error loading unread messages:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUnreadMessages();
    setRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const goToMessages = (dietId: number) => {
    router.push(`/diets/${dietId}/messages`);
  };

  if (isLoading) {
    return <Loading text="Okunmamış mesajlar yükleniyor..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color="#374151" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Okunmamış Mesajlar</Text>
          <Text style={styles.headerSubtitle}>
            {conversations.length > 0
              ? `${conversations.reduce((sum, c) => sum + c.unreadCount, 0)} mesaj`
              : "Mesaj yok"}
          </Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* Messages List */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#8b5cf6"
          />
        }
      >
        {conversations.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <MessageCircle size={64} color="#d1d5db" />
            </View>
            <Text style={styles.emptyTitle}>Okunmamış mesaj yok</Text>
            <Text style={styles.emptyDescription}>
              Tüm mesajlarınızı okudunuz! 🎉
            </Text>
          </View>
        ) : (
          <View style={styles.content}>
            {conversations.map((conversation) => (
              <TouchableOpacity
                key={`${conversation.clientId}-${conversation.dietId}`}
                style={styles.conversationCard}
                onPress={() => goToMessages(conversation.dietId)}
                activeOpacity={0.7}
              >
                {/* Header */}
                <View style={styles.conversationHeader}>
                  <View style={styles.conversationInfo}>
                    <Text style={styles.conversationTitle}>
                      Diyet #{conversation.dietId}
                    </Text>
                    {conversation.dietDate && (
                      <View style={styles.dateRow}>
                        <Calendar size={14} color="#6b7280" />
                        <Text style={styles.dateText}>
                          {formatDate(conversation.dietDate)}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {conversation.unreadCount}
                    </Text>
                  </View>
                </View>

                {/* Latest Message */}
                <View style={styles.latestMessage}>
                  {conversation.messages[0].ogun && (
                    <View style={styles.ogunTag}>
                      <Text style={styles.ogunTagText}>
                        📍 {conversation.messages[0].ogun.name}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.messageContent} numberOfLines={2}>
                    {conversation.messages[0].content}
                  </Text>
                  <View style={styles.messageFooter}>
                    <Clock size={12} color="#9ca3af" />
                    <Text style={styles.messageTime}>
                      {formatTime(conversation.messages[0].createdAt)}
                    </Text>
                  </View>
                </View>

                {/* Arrow */}
                <ChevronRight
                  size={24}
                  color="#9ca3af"
                  style={styles.arrow}
                />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
  },
  conversationCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    position: "relative",
  },
  conversationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  conversationInfo: {
    flex: 1,
  },
  conversationTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dateText: {
    fontSize: 12,
    color: "#6b7280",
  },
  badge: {
    backgroundColor: "#ef4444",
    borderRadius: 12,
    minWidth: 28,
    height: 28,
    paddingHorizontal: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  latestMessage: {
    marginBottom: 8,
  },
  ogunTag: {
    backgroundColor: "#fef3c7",
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  ogunTagText: {
    fontSize: 12,
    color: "#92400e",
    fontWeight: "500",
  },
  messageContent: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
    marginBottom: 8,
  },
  messageFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  messageTime: {
    fontSize: 12,
    color: "#9ca3af",
  },
  arrow: {
    position: "absolute",
    right: 16,
    top: "50%",
    marginTop: -12,
  },
});

