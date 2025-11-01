import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/features/auth/stores/auth-store";
import api from "@/core/api/client";
import { Loading } from "@/shared/ui/Loading";
import {
  UtensilsCrossed,
  Calendar,
  ChevronRight,
  Clock,
  Sparkles,
} from "lucide-react-native";
import { ClientBottomNav } from "@/shared/components/ClientBottomNav";

interface ClientDiet {
  id: number;
  tarih: string | null;
  createdAt: string;
  hedef?: string;
  su?: string;
  isBirthdayCelebration?: boolean;
  isImportantDateCelebrated?: boolean;
  importantDate?: {
    name: string;
    message: string;
  };
  oguns: Array<{
    id: number;
    name: string;
    time: string;
  }>;
}

export default function ClientDietsListScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [diets, setDiets] = useState<ClientDiet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<number, number>>({});

  const loadDiets = useCallback(async () => {
    try {
      setIsLoading(true);

      // Check if user has client data
      if (!user?.client?.id) {
        console.error("❌ No client ID found for user");
        setDiets([]);
        setIsLoading(false);
        return;
      }

      console.log("📥 Loading diets for client ID:", user.client.id);

      // Load client's diets using the correct endpoint
      const dietsData = await api.get(`/api/clients/${user.client.id}/diets`);
      
      console.log("✅ Diets loaded:", dietsData);
      
      setDiets(dietsData.diets || []);
    } catch (error) {
      console.error("❌ Error loading diets:", error);
      setDiets([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.client?.id]);

  const loadUnreadMessages = useCallback(async () => {
    try {
      if (!user?.client?.id) return;

      console.log("📧 Loading unread message counts...");
      
      const response = await api.get(`/api/clients/${user.client.id}/unread-messages`);
      
      if (response.success) {
        setUnreadCounts(response.unreadByDiet || {});
        console.log("✅ Unread counts loaded:", response.unreadByDiet);
      }
    } catch (error) {
      console.error("❌ Error loading unread messages:", error);
    }
  }, [user?.client?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadDiets(), loadUnreadMessages()]);
    setRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatShortDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "short",
    });
  };

  const getDietStatus = (diet: ClientDiet) => {
    if (diet.isBirthdayCelebration) {
      return { icon: "🎂", text: "Doğum Günü Özel", color: "#ec4899" };
    }
    if (diet.isImportantDateCelebrated && diet.importantDate) {
      return { icon: "🎉", text: diet.importantDate.name, color: "#8b5cf6" };
    }
    return null;
  };

  useEffect(() => {
    // Only load diets if user and client data are available
    if (user?.client?.id) {
      console.log("✅ User ready, loading diets...");
      loadDiets();
      loadUnreadMessages();
    } else {
      console.log("⏳ Waiting for user data...", { 
        hasUser: !!user, 
        hasClient: !!user?.client,
        clientId: user?.client?.id 
      });
    }
  }, [user?.client?.id, loadDiets, loadUnreadMessages]);

  // Refresh unread counts every 30 seconds
  useEffect(() => {
    if (!user?.client?.id) return;

    const interval = setInterval(() => {
      loadUnreadMessages();
    }, 30000);

    return () => clearInterval(interval);
  }, [user?.client?.id, loadUnreadMessages]);

  if (isLoading) {
    return <Loading text="Beslenme programlarınız yükleniyor..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Beslenme Programlarım</Text>
        <Text style={styles.headerSubtitle}>
          {diets.length > 0
            ? `${diets.length} program`
            : "Henüz program yok"}
        </Text>
      </View>

      {/* Diets List */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor="#3b82f6"
          />
        }
      >
        <View style={styles.content}>
          {diets.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <UtensilsCrossed size={64} color="#d1d5db" />
              </View>
              <Text style={styles.emptyTitle}>
                Henüz beslenme programınız yok
              </Text>
              <Text style={styles.emptyDescription}>
                Diyetisyeniniz size bir program hazırladığında burada
                görünecektir
              </Text>
            </View>
          ) : (
            <View style={styles.dietsList}>
              {diets.map((diet, index) => {
                const status = getDietStatus(diet);
                return (
                  <TouchableOpacity
                    key={diet.id}
                    style={[
                      styles.dietCard,
                      index === 0 && styles.dietCardFirst,
                    ]}
                    onPress={() => router.push(`/(client)/diets/${diet.id}`)}
                    activeOpacity={0.7}
                  >
                    {/* Special Badge */}
                    {status && (
                      <View style={[styles.specialBadge, { backgroundColor: status.color + "20" }]}>
                        <Text style={styles.specialBadgeText}>
                          {status.icon} {status.text}
                        </Text>
                      </View>
                    )}

                    <View style={styles.dietCardContent}>
                      {/* Left: Icon & Date */}
                      <View style={styles.dietCardLeft}>
                        <View style={styles.dietIconContainer}>
                          <UtensilsCrossed size={24} color="#3b82f6" />
                        </View>
                        <View style={styles.dietDateBadge}>
                          <Text style={styles.dietDateBadgeText}>
                            {diet.tarih ? formatShortDate(diet.tarih) : "Tarihsiz"}
                          </Text>
                        </View>
                      </View>

                      {/* Middle: Details */}
                      <View style={styles.dietCardMiddle}>
                        <Text style={styles.dietCardTitle}>
                          Beslenme Programı #{diet.id}
                        </Text>
                        
                        <View style={styles.dietCardInfo}>
                          <View style={styles.dietCardInfoRow}>
                            <Calendar size={14} color="#6b7280" />
                            <Text style={styles.dietCardInfoText}>
                              {diet.tarih ? formatDate(diet.tarih) : "Tarih belirtilmemiş"}
                            </Text>
                          </View>
                          
                          <View style={styles.dietCardInfoRow}>
                            <Clock size={14} color="#6b7280" />
                            <Text style={styles.dietCardInfoText}>
                              {diet.oguns.length} öğün
                            </Text>
                          </View>
                        </View>

                        {diet.hedef && (
                          <View style={styles.dietCardGoal}>
                            <Sparkles size={12} color="#f59e0b" />
                            <Text style={styles.dietCardGoalText} numberOfLines={1}>
                              {diet.hedef}
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Right: Arrow & Unread Badge */}
                      <View style={styles.dietCardRight}>
                        {unreadCounts[diet.id] > 0 && (
                          <View style={styles.unreadBadge}>
                            <Text style={styles.unreadBadgeText}>
                              {unreadCounts[diet.id]}
                            </Text>
                          </View>
                        )}
                        <ChevronRight size={24} color="#9ca3af" />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <ClientBottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  header: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6b7280",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100, // Space for bottom navigation
  },
  emptyState: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 48,
    alignItems: "center",
    marginTop: 32,
  },
  emptyIconContainer: {
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyDescription: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
  },
  dietsList: {
    gap: 12,
  },
  dietCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  dietCardFirst: {
    borderWidth: 2,
    borderColor: "#3b82f6",
  },
  specialBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  specialBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#374151",
  },
  dietCardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dietCardLeft: {
    alignItems: "center",
  },
  dietIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  dietDateBadge: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  dietDateBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#4b5563",
  },
  dietCardMiddle: {
    flex: 1,
  },
  dietCardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  dietCardInfo: {
    gap: 4,
  },
  dietCardInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dietCardInfoText: {
    fontSize: 13,
    color: "#6b7280",
  },
  dietCardGoal: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
    backgroundColor: "#fef3c7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  dietCardGoalText: {
    fontSize: 12,
    color: "#92400e",
    fontWeight: "500",
  },
  dietCardRight: {
    justifyContent: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  unreadBadge: {
    backgroundColor: "#ef4444",
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    paddingHorizontal: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  unreadBadgeText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
});
