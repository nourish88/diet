import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, Stack } from "expo-router";
import { MessageCircle, ArrowLeft, Clock } from "lucide-react-native";
import api from "@/core/api/client";

interface UnreadConversation {
  clientId: number;
  clientName: string;
  dietId: number;
  unreadCount: number;
  latestMessage: {
    content: string;
    createdAt: string;
    senderName: string;
  } | null;
}

export default function UnreadMessagesPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<UnreadConversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUnreadMessages();
  }, []);

  const loadUnreadMessages = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/unread-messages/list");
      if (response.success) {
        setConversations(response.conversations || []);
      }
    } catch (error) {
      console.error("❌ Error loading unread messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = () => {
    loadUnreadMessages();
  };

  const goToConversation = (clientId: number, dietId: number) => {
    // Navigate to the dietitian's client messaging page
    router.push(`/(dietitian)/clients/${clientId}/messages?dietId=${dietId}`);
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

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Okunmamış Mesajlar</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {conversations.length === 0 ? (
          <View style={styles.emptyState}>
            <MessageCircle size={64} color="#d1d5db" />
            <Text style={styles.emptyStateText}>
              {loading ? "Yükleniyor..." : "Okunmamış mesajınız yok"}
            </Text>
          </View>
        ) : (
          conversations.map((conversation) => (
            <TouchableOpacity
              key={`${conversation.clientId}-${conversation.dietId}`}
              style={styles.conversationCard}
              onPress={() =>
                goToConversation(conversation.clientId, conversation.dietId)
              }
            >
              <View style={styles.conversationHeader}>
                <View style={styles.avatarContainer}>
                  <MessageCircle size={24} color="#3b82f6" />
                </View>
                <View style={styles.conversationInfo}>
                  <Text style={styles.clientName}>{conversation.clientName}</Text>
                  <Text style={styles.dietInfo}>Diyet #{conversation.dietId}</Text>
                </View>
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>
                    {conversation.unreadCount}
                  </Text>
                </View>
              </View>
              {conversation.latestMessage && (
                <View style={styles.conversationBody}>
                  <Text style={styles.senderName}>
                    {conversation.latestMessage.senderName}:
                  </Text>
                  <Text style={styles.messagePreview} numberOfLines={2}>
                    {conversation.latestMessage.content}
                  </Text>
                  <View style={styles.timeContainer}>
                    <Clock size={12} color="#9ca3af" />
                    <Text style={styles.timeText}>
                      {formatTime(conversation.latestMessage.createdAt)}
                    </Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#9ca3af",
    marginTop: 16,
  },
  conversationCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: "#3b82f6",
  },
  conversationHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
  },
  conversationInfo: {
    flex: 1,
    marginLeft: 12,
  },
  clientName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 2,
  },
  dietInfo: {
    fontSize: 14,
    color: "#6b7280",
  },
  unreadBadge: {
    backgroundColor: "#ef4444",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  conversationBody: {
    paddingLeft: 60,
  },
  senderName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 4,
  },
  messagePreview: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 20,
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  timeText: {
    fontSize: 12,
    color: "#9ca3af",
    marginLeft: 4,
  },
});

