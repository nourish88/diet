import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Stack } from "expo-router";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/stores/auth-store";
import api from "@/core/api/client";
import { Loading } from "@/shared/ui/Loading";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as SecureStore from "expo-secure-store";
import * as FileSystem from "expo-file-system/legacy";
import {
  Clock,
  Download,
  MessageCircle,
  Camera,
  Calendar,
  User,
  ArrowLeft,
  List,
} from "lucide-react-native";

interface DietDetail {
  id: number;
  tarih: string;
  createdAt: string;
  su: string;
  sonuc: string;
  hedef: string;
  fizik: string;
  dietitianNote: string;
  oguns: Array<{
    id: number;
    name: string;
    time: string;
    items: Array<{
      id: number;
      miktar: number;
      besin: {
        name: string;
      };
      birim: {
        name: string;
      };
    }>;
  }>;
  client: {
    name: string;
    surname: string;
  };
}

export default function ClientDietDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuthStore();
  const [isDownloading, setIsDownloading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Use React Query for caching
  const {
    data: diet,
    isLoading,
    error,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ["diet", id, user?.client?.id],
    queryFn: async () => {
      if (!user?.client?.id) {
        throw new Error("Client ID not found");
      }
      
      console.log("🔄 FETCHING diet from API:", { dietId: id, clientId: user.client.id });
      const response = await api.get(`/api/clients/${user.client.id}/diets/${id}`);
      console.log("✅ RECEIVED diet data:", response);
      return response.diet || response;
    },
    enabled: !!id && !!user?.client?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Debug: Log cache status
  useEffect(() => {
    if (diet) {
      const cacheAge = Date.now() - dataUpdatedAt;
      console.log(
        `💾 CACHE - Diet ${id}: ${
          cacheAge < 1000 ? "FRESH" : `${Math.round(cacheAge / 1000)}s old`
        }`
      );
    }
  }, [diet, dataUpdatedAt, id]);

  // Load unread message count
  useEffect(() => {
    const loadUnreadCount = async () => {
      if (!user?.client?.id || !id) return;

      try {
        const response = await api.get(`/api/clients/${user.client.id}/unread-messages`);
        if (response.success && response.unreadByDiet) {
          setUnreadCount(response.unreadByDiet[Number(id)] || 0);
        }
      } catch (error) {
        console.error("❌ Error loading unread count:", error);
      }
    };

    loadUnreadCount();

    // Refresh every 30 seconds
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [user?.client?.id, id]);

  // Show error alert if query failed
  useEffect(() => {
    if (error) {
      Alert.alert(
        "Hata",
        "Diyet yüklenirken bir hata oluştu. Lütfen tekrar giriş yapın."
      );
    }
  }, [error]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("tr-TR");
  };

  const formatTime = (timeString: string) => {
    return timeString;
  };

  const downloadPDF = async () => {
    if (!diet) return;

    try {
      setIsDownloading(true);

      // Get base URL from API client
      const baseURL = api.instance.defaults.baseURL || "http://localhost:3000";
      const downloadUrl = `${baseURL}/api/diets/download-pdfmake/${diet.id}`;

      const fileName = `Beslenme_Programi_${
        diet.id
      }_${new Date().getTime()}.pdf`;

      // Get auth token from SecureStore
      const token = await SecureStore.getItemAsync("supabase_token");

      // Download directly to the device file system using Expo FileSystem
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      const downloadRes = await FileSystem.downloadAsync(downloadUrl, fileUri, {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      });

      if (downloadRes && (downloadRes as any).status === 200) {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(fileUri, {
            mimeType: "application/pdf",
            dialogTitle: "Beslenme Programı Paylaş",
            UTI: "com.adobe.pdf",
          });
          Alert.alert("Başarılı", "PDF indirildi ve paylaşıldı");
        } else {
          Alert.alert("Başarılı", `PDF indirildi: ${fileName}`);
        }
      } else {
        console.error("FileSystem.downloadAsync returned:", downloadRes);
        throw new Error("PDF indirilemedi (download failed)");
      }
    } catch (error) {
      console.error("PDF download error:", error);
      Alert.alert(
        "Hata",
        "PDF indirilirken bir hata oluştu. Lütfen daha sonra tekrar deneyin."
      );
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return <Loading text="Diyet yükleniyor..." />;
  }

  if (!diet) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Diyet bulunamadı</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Custom Navigation Header */}
      <View style={styles.navHeader}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.navButton}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color="#ffffff" />
          <Text style={styles.navButtonText}>Geri</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push("/diets")}
          style={styles.navButton}
          activeOpacity={0.7}
        >
          <List size={24} color="#ffffff" />
          <Text style={styles.navButtonText}>Diyetlerim</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.screenContent}
      >
        <View style={styles.wrapper}>
          {/* Header Card */}
          <LinearGradient
            colors={["#667eea", "#764ba2"]}
            style={[styles.headerCard, styles.mb6]}
          >
            <View style={styles.headerTopRow}>
              <Text style={styles.headerTitle}>
                Beslenme Programım #{diet.id}
              </Text>
              <TouchableOpacity
                onPress={downloadPDF}
                activeOpacity={0.7}
                style={styles.headerDownloadBtn}
              >
                <Download
                  size={16}
                  color="#ffffff"
                  style={styles.headerDownloadIcon}
                />
                <Text style={styles.headerDownloadText}>PDF İndir</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.headerSubtitle}>
              {formatDate(diet.createdAt)}
            </Text>
            <View style={styles.dateRow}>
              <Calendar
                size={16}
                color="rgba(255,255,255,0.9)"
                style={styles.iconSpacing}
              />
              <Text style={styles.dateText}>
                {diet.tarih ? formatDate(diet.tarih) : "Belirtilmemiş"}
              </Text>
            </View>
          </LinearGradient>

          {/* Client Info Card */}
          {diet.client && (
            <View style={[styles.sectionCard, styles.mb4]}>
              <Text style={styles.sectionTitle}>Danışan Bilgileri</Text>
              <View style={styles.infoRow}>
                <View style={styles.infoAvatar}>
                  <User size={18} color="#667eea" />
                </View>
                <View>
                  <Text style={styles.infoName}>
                    {diet.client?.name} {diet.client?.surname}
                  </Text>
                  <Text style={styles.infoMeta}>
                    Diyet Tarihi:{" "}
                    {diet.tarih ? formatDate(diet.tarih) : "Belirtilmemiş"}
                  </Text>
                  <Text style={styles.infoMeta}>
                    Oluşturulma: {formatDate(diet.createdAt)}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Program Summary Card */}
          {(diet.su || diet.sonuc || diet.hedef || diet.fizik) && (
            <View style={[styles.sectionCard, styles.mb4]}>
              <Text style={styles.sectionTitle}>Program Detayları</Text>
              <View style={styles.detailList}>
                {diet.hedef && (
                  <View style={[styles.detailItem, styles.borderYellow]}>
                    <Text style={styles.detailLabel}>Hedef</Text>
                    <Text style={styles.detailValue}>{diet.hedef}</Text>
                  </View>
                )}
                {diet.sonuc && (
                  <View style={[styles.detailItem, styles.borderGreen]}>
                    <Text style={styles.detailLabel}>Sonuç</Text>
                    <Text style={styles.detailValue}>{diet.sonuc}</Text>
                  </View>
                )}
                {diet.su && (
                  <View style={[styles.detailItem, styles.borderBlue]}>
                    <Text style={styles.detailLabel}>Su Tüketimi</Text>
                    <Text style={styles.detailValue}>{diet.su}</Text>
                  </View>
                )}
                {diet.fizik && (
                  <View style={[styles.detailItem, styles.borderPurple]}>
                    <Text style={styles.detailLabel}>Fiziksel Aktivite</Text>
                    <Text style={styles.detailValue}>{diet.fizik}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Dietitian Note Card */}
          {diet.dietitianNote && (
            <View style={[styles.sectionCard, styles.mb4]}>
              <Text style={styles.sectionTitle}>Diyetisyen Notu</Text>
              <Text style={styles.noteText}>{diet.dietitianNote}</Text>
            </View>
          )}

          {/* Meals Card */}
          <View style={[styles.sectionCard, styles.mb4]}>
            <Text style={styles.sectionTitle}>Günlük Öğün Programı</Text>
            {diet.oguns.map((ogun: DietDetail["oguns"][0]) => (
              <View key={ogun.id} style={[styles.mealCard, styles.mb3]}>
                <View style={styles.mealHeaderRow}>
                  <Text style={styles.mealTitle}>{ogun.name}</Text>
                  {ogun.time && (
                    <View style={styles.mealTimePill}>
                      <Clock size={12} color="#667eea" />
                      <Text style={styles.mealTimeText}>
                        {formatTime(ogun.time)}
                      </Text>
                    </View>
                  )}
                </View>
                {ogun.items && ogun.items.length > 0 ? (
                  <View style={styles.mealItemsContainer}>
                    {ogun.items.map(
                      (item: DietDetail["oguns"][0]["items"][0]) => (
                        <View key={item.id} style={styles.mealItemRow}>
                          <View style={styles.bullet} />
                          <Text style={styles.mealItemText}>
                            {item.besin.name}
                          </Text>
                          <View style={styles.badge}>
                            <Text style={styles.badgeText}>
                              {item.miktar} {item.birim.name}
                            </Text>
                          </View>
                        </View>
                      )
                    )}
                  </View>
                ) : (
                  <Text style={styles.emptyMealText}>
                    Bu öğün için besin eklenmemiş
                  </Text>
                )}
              </View>
            ))}
          </View>

          {/* Actions Card */}
          <LinearGradient
            colors={["#fff", "#f8fafc"]}
            style={[styles.card, styles.mb6]}
          >
            <View style={styles.cardBody}>
              <Text style={styles.sectionTitle}>Hızlı İşlemler</Text>
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.fullWidth]}
                  onPress={() => router.push(`/diets/${diet.id}/messages`)}
                  activeOpacity={0.7}
                >
                  <MessageCircle
                    size={18}
                    color="#667eea"
                    style={styles.iconSpacing}
                  />
                  <Text style={styles.actionText}>Diyetisyenimle İletişime Geç</Text>
                  {unreadCount > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>

          {/* PDF Card */}
          <LinearGradient
            colors={["#667eea", "#764ba2"]}
            style={styles.pdfCard}
          >
            <TouchableOpacity
              style={styles.pdfBtn}
              onPress={downloadPDF}
              activeOpacity={0.7}
              disabled={isDownloading}
            >
              <Download size={18} color="#ffffff" style={styles.iconSpacing} />
              <Text style={styles.pdfText}>
                {isDownloading ? "İndiriliyor..." : "PDF Olarak İndir"}
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  navHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#667eea",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#5a67d8",
  },
  navButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
  navButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  screen: {
    flex: 1,
  },
  screenContent: {
    paddingBottom: 24,
  },
  wrapper: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#64748b",
  },
  headerCard: {
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  card: {
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  pdfCard: {
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 48,
  },
  cardBody: {
    padding: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    marginBottom: 12,
  },
  headerDownloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 6 : 4,
    borderRadius: 12,
  },
  headerDownloadIcon: {
    marginRight: 6,
  },
  headerDownloadText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#ffffff",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  dateText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
  },
  iconSpacing: {
    marginRight: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1f2937",
    textAlign: "center",
    marginBottom: 12,
  },
  sectionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 12,
  },
  infoAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#eef2ff",
    alignItems: "center",
    justifyContent: "center",
  },
  infoName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
  },
  infoMeta: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  detailList: {
    rowGap: 12,
  },
  detailItem: {
    borderLeftWidth: 4,
    paddingLeft: 12,
    paddingVertical: 6,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4c1d95",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
  },
  borderIndigo: {
    borderLeftColor: "#4338ca",
  },
  borderPurple: {
    borderLeftColor: "#7c3aed",
  },
  borderBlue: {
    borderLeftColor: "#2563eb",
  },
  borderYellow: {
    borderLeftColor: "#f59e0b",
  },
  borderGreen: {
    borderLeftColor: "#059669",
  },
  noteText: {
    fontSize: 13,
    color: "#4b5563",
    lineHeight: 20,
    textAlign: "center",
  },
  mealCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#ffffff",
    padding: 12,
  },
  mealHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  mealTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1f2937",
  },
  mealTimePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eef2ff",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  mealTimeText: {
    marginLeft: 4,
    fontSize: 11,
    fontWeight: "600",
    color: "#4f46e5",
  },
  mealItemsContainer: {
    marginTop: 4,
  },
  mealItemRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#667eea",
    marginRight: 10,
  },
  mealItemText: {
    flex: 1,
    fontSize: 14,
    color: "#374151",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#667eea",
  },
  emptyMealText: {
    fontSize: 13,
    color: "#9ca3af",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 8,
  },
  actionsRow: {
    flexDirection: "row",
    padding: 16,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#ffffff",
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  actionText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "600",
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: "#ef4444",
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    paddingHorizontal: 6,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  unreadBadgeText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  pdfBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  pdfText: {
    fontSize: 14,
    color: "#ffffff",
    fontWeight: "600",
  },
  mb2: {
    marginBottom: 8,
  },
  mb3: {
    marginBottom: 12,
  },
  mb4: {
    marginBottom: 16,
  },
  mb6: {
    marginBottom: 24,
  },
  mr2: {
    marginRight: 8,
  },
  ml2: {
    marginLeft: 8,
  },
  fullWidth: {
    flex: 1,
  },
});

