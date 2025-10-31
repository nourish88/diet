import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  Dimensions,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/stores/auth-store";
import api from "@/core/api/client";
import { BottomNavbar } from "@/shared/components/BottomNavbar";
import {
  Users,
  ClipboardList,
  FileText,
  Calendar,
  TrendingUp,
  PlusCircle,
  LogOut,
  User,
  Stethoscope,
} from "lucide-react-native";

const { width } = Dimensions.get("window");

interface DashboardStats {
  totalClients: number;
  totalDiets: number;
  thisMonthDiets: number;
  pendingApprovals: number;
  recentDiets: Array<{
    id: number;
    tarih: string;
    client: {
      name: string;
      surname: string;
    };
  }>;
}

export default function DietitianDashboard() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Use React Query for caching dashboard stats
  const {
    data: statsData,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      return await api.get("/api/analytics/stats");
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Use React Query for caching recent diets
  const {
    data: recentDietsData,
    isLoading: dietsLoading,
    refetch: refetchDiets,
  } = useQuery({
    queryKey: ["recent-diets"],
    queryFn: async () => {
      return await api.get("/api/diets?skip=0&take=5");
    },
    staleTime: 1 * 60 * 1000, // 1 minute
  });

  const isLoading = statsLoading || dietsLoading;
  const error = statsError ? "Veriler yüklenirken hata oluştu" : null;

  const stats: DashboardStats = {
    totalClients: statsData?.totalClients || 0,
    totalDiets: statsData?.totalDiets || 0,
    thisMonthDiets: statsData?.thisMonthDiets || 0,
    pendingApprovals: statsData?.pendingApprovals || 0,
    recentDiets: recentDietsData?.diets || [],
  };

  const onRefresh = async () => {
    await Promise.all([refetchStats(), refetchDiets()]);
  };

  const handleLogout = async () => {
    try {
      setShowUserMenu(false);
      await logout();
      router.replace("/(auth)/login");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  if (isLoading && !stats) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Panel verileri yükleniyor...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Users size={24} color="#3b82f6" />
            </View>
            <Text style={styles.statNumber}>{stats?.totalClients || 0}</Text>
            <Text style={styles.statLabel}>Toplam Danışan</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <ClipboardList size={24} color="#10b981" />
            </View>
            <Text style={styles.statNumber}>{stats?.totalDiets || 0}</Text>
            <Text style={styles.statLabel}>Toplam Diyet</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Calendar size={24} color="#f59e0b" />
            </View>
            <Text style={styles.statNumber}>{stats?.thisMonthDiets || 0}</Text>
            <Text style={styles.statLabel}>Bu Ay</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <TrendingUp size={24} color="#8b5cf6" />
            </View>
            <Text style={styles.statNumber}>
              {stats?.pendingApprovals || 0}
            </Text>
            <Text style={styles.statLabel}>Bekleyen</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hızlı İşlemler</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push("/(dietitian)/clients")}
            >
              <Users size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Danışanlar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push("/(dietitian)/diets/new")}
            >
              <PlusCircle size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Yeni Diyet</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Diets */}
        {stats?.recentDiets && stats.recentDiets.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Son Diyetler</Text>
            {stats.recentDiets.map((diet) => (
              <TouchableOpacity
                key={diet.id}
                style={styles.dietCard}
                onPress={() => router.push(`/(dietitian)/diets/${diet.id}`)}
              >
                <View style={styles.dietCardContent}>
                  <Text style={styles.dietClientName}>
                    {diet.client.name} {diet.client.surname}
                  </Text>
                  <Text style={styles.dietDate}>{diet.tarih}</Text>
                </View>
                <FileText size={16} color="#6b7280" />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          onPress={() => setShowUserMenu(true)}
          style={styles.bottomNavItem}
        >
          <User size={24} color="#3b82f6" />
        </TouchableOpacity>
      </View>

      {/* User Menu Modal */}
      <Modal
        visible={showUserMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowUserMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowUserMenu(false)}
        >
          <View style={styles.userMenu}>
            <View style={styles.userMenuHeader}>
              <View style={styles.userIconContainer}>
                <User size={20} color="#3b82f6" />
              </View>
              <View style={styles.userDetails}>
                <Text style={styles.userName}>Diyetisyen</Text>
                <Text style={styles.userEmail}>{user?.email}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.logoutMenuItem}
              onPress={handleLogout}
            >
              <LogOut size={20} color="#ef4444" />
              <Text style={styles.logoutText}>Çıkış Yap</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Bottom Navigation */}
      <BottomNavbar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  loadingText: {
    fontSize: 16,
    color: "#6b7280",
  },
  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 8,
    paddingBottom: 34, // iPhone safe area için
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  bottomNavItem: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  userMenu: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  userMenuHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  userIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: "#6b7280",
  },
  logoutMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#fef2f2",
    borderRadius: 12,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#ef4444",
    marginLeft: 12,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10, // SafeAreaView sayesinde daha az padding
    paddingBottom: 120, // Bottom navbar için daha fazla padding
  },
  errorContainer: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginVertical: 16,
  },
  errorText: {
    color: "#b91c1c",
    textAlign: "center",
    fontSize: 14,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 20,
  },
  statCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    width: (width - 60) / 2,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 16,
  },
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  actionButton: {
    backgroundColor: "#3b82f6",
    borderRadius: 12,
    padding: 16,
    flex: 1,
    marginHorizontal: 4,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 8,
  },
  dietCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  dietCardContent: {
    flex: 1,
  },
  dietClientName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
  },
  dietDate: {
    fontSize: 14,
    color: "#6b7280",
  },
});
