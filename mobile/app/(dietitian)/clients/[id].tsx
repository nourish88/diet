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
import {
  Calendar,
  User,
  Phone,
  FileText,
  ClipboardList,
  PlusCircle,
  Edit,
  ChevronLeft,
} from "lucide-react-native";

interface Client {
  id: number;
  name: string;
  surname: string;
  birthdate: string | null;
  phoneNumber?: string | null;
  notes?: string | null;
  illness?: string | null;
  gender?: number | null;
  createdAt: string;
  updatedAt: string;
  diets: Array<{
    id: number;
    createdAt: string;
    tarih?: string | null;
  }>;
  bannedFoods: Array<{
    id: number;
    besin: {
      id: number;
      name: string;
    };
    reason?: string;
  }>;
}

export default function ClientDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuthStore();

  // Use React Query for caching
  const {
    data: client,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["client", id],
    queryFn: async () => {
      const response = await api.get(`/api/clients/${id}`);

      // Check if diets are included, if not fetch them
      if (!response.client.diets || !Array.isArray(response.client.diets)) {
        try {
          const dietsResponse = await api.get(`/api/clients/${id}/diets`);
          return {
            ...response.client,
            diets: dietsResponse.diets || [],
          };
        } catch (dietsError) {
          console.error("Error fetching client diets:", dietsError);
          return response.client;
        }
      }
      return response.client;
    },
    enabled: !!id,
    staleTime: 3 * 60 * 1000, // 3 minutes
  });

  // Show error alert if query failed
  useEffect(() => {
    if (error) {
      Alert.alert("Hata", "Danışan bilgileri yüklenirken bir hata oluştu.");
    }
  }, [error]);

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "Belirtilmemiş";
    try {
      return new Date(dateString).toLocaleDateString("tr-TR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch (error) {
      return "Belirtilmemiş";
    }
  };

  if (isLoading) {
    return <Loading text="Danışan bilgileri yükleniyor..." />;
  }

  if (!client) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Danışan bulunamadı</Text>
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
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ChevronLeft size={20} color="#667eea" />
            <Text style={styles.backButtonText}>Danışan Listesi</Text>
          </TouchableOpacity>

          {/* Header Card */}
          <LinearGradient
            colors={["#667eea", "#764ba2"]}
            style={[styles.headerCard, styles.mb6]}
          >
            <View style={styles.headerTopRow}>
              <View style={styles.headerTextGroup}>
                <Text style={styles.headerTitle}>
                  {client.name} {client.surname}
                </Text>
                <Text style={styles.headerSubtitle}>
                  Danışan #{client.id} | Kayıt: {formatDate(client.createdAt)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => router.push(`/clients/${client.id}/edit` as any)}
                activeOpacity={0.7}
                style={styles.headerEditBtn}
              >
                <Edit size={16} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* Personal Information Card */}
          <View style={[styles.sectionCard, styles.mb4]}>
            <Text style={styles.sectionTitle}>Kişisel Bilgiler</Text>
            <View style={styles.infoList}>
              <View style={styles.infoItem}>
                <View style={[styles.infoIcon, styles.bgIndigo]}>
                  <Calendar size={18} color="#4338ca" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Doğum Tarihi</Text>
                  <Text style={styles.infoValue}>
                    {formatDate(client.birthdate)}
                  </Text>
                </View>
              </View>

              <View style={styles.infoItem}>
                <View style={[styles.infoIcon, styles.bgPurple]}>
                  <User size={18} color="#7c3aed" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Cinsiyet</Text>
                  <Text style={styles.infoValue}>
                    {client.gender === 1
                      ? "Erkek"
                      : client.gender === 2
                      ? "Kadın"
                      : "Belirtilmemiş"}
                  </Text>
                </View>
              </View>

              <View style={styles.infoItem}>
                <View style={[styles.infoIcon, styles.bgBlue]}>
                  <Phone size={18} color="#2563eb" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Telefon</Text>
                  <Text style={styles.infoValue}>
                    {client.phoneNumber || "Belirtilmemiş"}
                  </Text>
                </View>
              </View>

              <View style={styles.infoItem}>
                <View style={[styles.infoIcon, styles.bgYellow]}>
                  <FileText size={18} color="#f59e0b" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Hastalık</Text>
                  <Text style={styles.infoValue}>
                    {client.illness || "Belirtilmemiş"}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Notes Card */}
          {client.notes && (
            <View style={[styles.sectionCard, styles.mb4]}>
              <Text style={styles.sectionTitle}>Notlar</Text>
              <Text style={styles.notesText}>{client.notes}</Text>
            </View>
          )}

          {/* Banned Foods Card */}
          {client.bannedFoods && client.bannedFoods.length > 0 && (
            <View style={[styles.sectionCard, styles.mb4]}>
              <Text style={styles.sectionTitle}>Yasaklı Besinler</Text>
              <View style={styles.bannedFoodsGrid}>
                {client.bannedFoods.map((banned: Client["bannedFoods"][0]) => (
                  <View key={banned.besin.id} style={styles.bannedFoodItem}>
                    <Text style={styles.bannedFoodName}>
                      {banned.besin.name}
                    </Text>
                    {banned.reason && (
                      <Text style={styles.bannedFoodReason}>
                        Sebep: {banned.reason}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Diets List Card */}
          <View style={[styles.sectionCard, styles.mb8]}>
            <View style={styles.dietsHeader}>
              <View style={styles.dietsHeaderLeft}>
                <ClipboardList size={18} color="#667eea" />
                <Text style={[styles.sectionTitle, styles.dietsHeaderTitle]}>
                  Beslenme Programları
                </Text>
              </View>
              <TouchableOpacity
                onPress={() =>
                  router.push(`/diets/new?clientId=${client.id}` as any)
                }
                activeOpacity={0.7}
                style={styles.addDietBtn}
              >
                <PlusCircle size={14} color="#ffffff" />
                <Text style={styles.addDietBtnText}>Yeni</Text>
              </TouchableOpacity>
            </View>

            {client.diets && client.diets.length > 0 ? (
              <View style={styles.dietsList}>
                {client.diets.map((diet: Client["diets"][0]) => (
                  <TouchableOpacity
                    key={diet.id}
                    style={styles.dietItem}
                    onPress={() => router.push(`/diets/${diet.id}` as any)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.dietItemContent}>
                      <Text style={styles.dietItemTitle}>
                        Beslenme Programı #{diet.id}
                      </Text>
                      <Text style={styles.dietItemDate}>
                        Oluşturulma: {formatDate(diet.createdAt)}
                      </Text>
                    </View>
                    {diet.tarih && (
                      <View style={styles.dietDateBadge}>
                        <Text style={styles.dietDateBadgeText}>
                          {formatDate(diet.tarih)}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyDietsText}>Henüz diyet bulunmuyor.</Text>
            )}
          </View>
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
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 14,
    color: "#667eea",
    fontWeight: "600",
    marginLeft: 4,
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
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  headerTextGroup: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.85)",
  },
  headerEditBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1f2937",
    marginBottom: 12,
  },
  infoList: {
    rowGap: 16,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  bgIndigo: {
    backgroundColor: "#eef2ff",
  },
  bgPurple: {
    backgroundColor: "#faf5ff",
  },
  bgBlue: {
    backgroundColor: "#eff6ff",
  },
  bgYellow: {
    backgroundColor: "#fffbeb",
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
  },
  notesText: {
    fontSize: 14,
    color: "#4b5563",
    lineHeight: 20,
  },
  bannedFoodsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  bannedFoodItem: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 12,
    padding: 12,
    minWidth: "48%",
    maxWidth: "100%",
  },
  bannedFoodName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#b91c1c",
    marginBottom: 4,
  },
  bannedFoodReason: {
    fontSize: 11,
    color: "#dc2626",
  },
  dietsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  dietsHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 8,
  },
  dietsHeaderTitle: {
    marginBottom: 0,
  },
  addDietBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#667eea",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    columnGap: 6,
  },
  addDietBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#ffffff",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dietsList: {
    rowGap: 12,
  },
  dietItem: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#ffffff",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dietItemContent: {
    flex: 1,
  },
  dietItemTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 4,
  },
  dietItemDate: {
    fontSize: 12,
    color: "#6b7280",
  },
  dietDateBadge: {
    backgroundColor: "#eef2ff",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  dietDateBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#4f46e5",
  },
  emptyDietsText: {
    fontSize: 13,
    color: "#9ca3af",
    fontStyle: "italic",
    textAlign: "center",
  },
  mb4: {
    marginBottom: 16,
  },
  mb6: {
    marginBottom: 24,
  },
  mb8: {
    marginBottom: 32,
  },
});
