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
import { BottomNavbar } from "@/shared/components/BottomNavbar";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as SecureStore from "expo-secure-store";
import {
  Clock,
  Download,
  MessageCircle,
  Camera,
  Calendar,
  User,
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
    id: number;
    name: string;
    surname: string;
  };
}

export default function DietDetailScreen() {
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
    queryKey: ["diet", id],
    queryFn: async () => {
      console.log("🔄 FETCHING diet from API:", id);
      const response = await api.get(`/api/diets/${id}`);
      console.log("✅ RECEIVED diet data:", id);
      return response.diet || response;
    },
    enabled: !!id,
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

  // Show error alert if query failed
  useEffect(() => {
    if (error) {
      Alert.alert(
        "Hata",
        "Diyet yüklenirken bir hata oluştu. Lütfen tekrar giriş yapın."
      );
    }
  }, [error]);

  // Load unread messages count for this diet
  useEffect(() => {
    if (diet?.client?.id && id) {
      loadUnreadCount();
    }
  }, [diet?.client?.id, id]);

  const loadUnreadCount = async () => {
    try {
      if (!diet?.client?.id) return;
      const clientId = (diet.client as any).id;
      console.log(`📧 Loading unread count for diet ${id}, client ${clientId}`);
      const response = await api.get(`/api/clients/${clientId}/unread-messages`);
      if (response.success && response.unreadByDiet) {
        const count = response.unreadByDiet[id as string] || 0;
        console.log(`📧 Unread count for diet ${id}: ${count}`);
        setUnreadCount(count);
      }
    } catch (error) {
      console.error("❌ Error loading unread count:", error);
    }
  };

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

      try {
        const downloadRes = await FileSystem.downloadAsync(
          downloadUrl,
          fileUri,
          {
            headers: {
              Authorization: token ? `Bearer ${token}` : "",
            },
          }
        );

        if (downloadRes && downloadRes.status === 200) {
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
      } catch (downloadError) {
        console.error("PDF download error details:", downloadError);
        throw downloadError;
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

  // Normalized fields
  const waterConsumption = (diet as any)?.su || (diet as any)?.Su || "";
  const physicalActivity = (diet as any)?.fizik || (diet as any)?.Fizik || "";
  const goalText = (diet as any)?.hedef || (diet as any)?.Hedef || "";
  const resultText = (diet as any)?.sonuc || (diet as any)?.Sonuc || "";
  const generalNotes =
    (diet as any)?.dietitianNote ||
    (diet as any)?.notlar ||
    (diet as any)?.Notes ||
    "";

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
                Beslenme Programı #{diet.id}
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
            <LinearGradient
              colors={["#fff", "#f8fafc"]}
              style={[styles.card, styles.mb4]}
            >
              <View style={styles.cardBody}>
                <View style={styles.clientRow}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {diet.client.name?.charAt(0)}
                      {diet.client.surname?.charAt(0)}
                    </Text>
                  </View>
                  <View style={styles.clientInfo}>
                    <Text style={styles.clientName}>
                      {diet.client.name} {diet.client.surname}
                    </Text>
                    <View style={styles.clientDateRow}>
                      <Calendar
                        size={14}
                        color="#667eea"
                        style={styles.iconSpacing}
                      />
                      <Text style={styles.clientDate}>
                        {diet.tarih ? formatDate(diet.tarih) : "Belirtilmemiş"}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </LinearGradient>
          )}

          {/* Summary Card */}
          {(waterConsumption || resultText || goalText || physicalActivity) && (
            <LinearGradient
              colors={["#fff", "#f8fafc"]}
              style={[styles.card, styles.mb4]}
            >
              <View style={styles.cardBody}>
                <Text style={styles.sectionTitle}>Program Özeti</Text>
                <View style={styles.gridRow}>
                  {goalText && (
                    <View style={styles.gridCol}>
                      <View style={styles.infoBox}>
                        <Text style={styles.infoLabel}>HEDEF</Text>
                        <Text style={styles.infoValue}>{goalText}</Text>
                      </View>
                    </View>
                  )}

                  {resultText && (
                    <View style={styles.gridCol}>
                      <View style={styles.infoBox}>
                        <Text style={styles.infoLabel}>SONUÇ</Text>
                        <Text style={styles.infoValue}>{resultText}</Text>
                      </View>
                    </View>
                  )}

                  {waterConsumption && (
                    <View style={styles.gridCol}>
                      <View style={styles.infoBox}>
                        <Text style={styles.infoLabel}>SU TÜKETİMİ</Text>
                        <Text style={styles.infoValue}>{waterConsumption}</Text>
                      </View>
                    </View>
                  )}

                  {physicalActivity && (
                    <View style={styles.gridCol}>
                      <View style={styles.infoBox}>
                        <Text style={styles.infoLabel}>FİZİKSEL AKTİVİTE</Text>
                        <Text style={styles.infoValue}>{physicalActivity}</Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            </LinearGradient>
          )}

          {/* Dietitian Note */}
          {generalNotes ? (
            <LinearGradient
              colors={["#fff", "#f8fafc"]}
              style={[styles.card, styles.mb4]}
            >
              <View style={styles.cardBody}>
                <Text style={styles.sectionTitle}>Notlar</Text>
                <Text style={styles.noteText}>{generalNotes}</Text>
              </View>
            </LinearGradient>
          ) : null}

          {/* Client Messages Button for Dietitian */}
          {user?.role === "dietitian" && diet.client && (
            <TouchableOpacity
              style={styles.clientMessagesCard}
              onPress={() => {
                const clientId = (diet.client as any).id;
                router.push(`/(dietitian)/clients/${clientId}/messages?dietId=${id}`);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.clientMessagesContent}>
                <View style={styles.clientMessagesHeader}>
                  <MessageCircle size={24} color="#667eea" />
                  <Text style={styles.clientMessagesTitle}>
                    Danışan Mesajları
                  </Text>
                </View>
                <Text style={styles.clientMessagesDescription}>
                  {unreadCount > 0
                    ? `${unreadCount} okunmamış mesaj`
                    : "Danışanınızla mesajlaşın"}
                </Text>
              </View>
              {unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          {/* Meals Card */}
          <LinearGradient
            colors={["#fff", "#f8fafc"]}
            style={[styles.card, styles.mb4]}
          >
            <View style={styles.cardBody}>
              <Text style={styles.sectionTitle}>Günlük Öğün Programı</Text>
              {diet.oguns.map((ogun: DietDetail["oguns"][0]) => (
                <View key={ogun.id} style={[styles.mealCard, styles.mb3]}>
                  <Text style={styles.mealTitle}>{ogun.name}</Text>
                  {ogun.time && (
                    <Text style={styles.mealTime}>{formatTime(ogun.time)}</Text>
                  )}
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
          </LinearGradient>

          {/* Actions (client only) */}
          {user?.role === "client" && (
            <LinearGradient
              colors={["#fff", "#f8fafc"]}
              style={[styles.card, styles.mb6]}
            >
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.mr2]}
                  onPress={() => console.log("Comment on diet")}
                  activeOpacity={0.7}
                >
                  <MessageCircle
                    size={18}
                    color="#667eea"
                    style={styles.iconSpacing}
                  />
                  <Text style={styles.actionText}>Yorum Yap</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.ml2]}
                  onPress={() => console.log("Upload meal photo")}
                  activeOpacity={0.7}
                >
                  <Camera
                    size={18}
                    color="#667eea"
                    style={styles.iconSpacing}
                  />
                  <Text style={styles.actionText}>Fotoğraf</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          )}

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

      <BottomNavbar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  screen: {
    flex: 1,
  },
  screenContent: {
    paddingBottom: 96,
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
  clientRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#eef2ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#667eea",
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
    textAlign: "center",
    marginBottom: 4,
  },
  clientDateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  clientDate: {
    fontSize: 12,
    color: "#6b7280",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1f2937",
    textAlign: "center",
    marginBottom: 12,
  },
  gridRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
  },
  gridCol: {
    width: "50%",
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  infoBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#ffffff",
    padding: 12,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#667eea",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
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
  mealTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1f2937",
    textAlign: "center",
    marginBottom: 4,
  },
  mealTime: {
    fontSize: 11,
    fontWeight: "600",
    color: "#667eea",
    textAlign: "center",
    marginBottom: 8,
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
  clientMessagesCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: "#667eea",
  },
  clientMessagesContent: {
    flex: 1,
  },
  clientMessagesHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  clientMessagesTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
    marginLeft: 8,
  },
  clientMessagesDescription: {
    fontSize: 14,
    color: "#6b7280",
  },
  unreadBadge: {
    backgroundColor: "#ef4444",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadBadgeText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});
