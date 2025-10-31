import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "../features/auth/stores/auth-store";
import { api } from "../core/api/client";
import { Card } from "../shared/ui/Card";
import { Button } from "../shared/ui/Button";
import { Loading } from "../shared/ui/Loading";
import {
  Users,
  ClipboardList,
  FileText,
  Calendar,
  TrendingUp,
  PlusCircle,
} from "lucide-react-native";

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
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);

      // Load dashboard stats
      const dashboardData = await api.get("/api/analytics/stats");

      // Load recent diets
      const recentDietsData = await api.get("/api/diets?skip=0&take=5");

      setStats({
        totalClients: dashboardData.totalClients || 0,
        totalDiets: dashboardData.totalDiets || 0,
        thisMonthDiets: dashboardData.thisMonthDiets || 0,
        pendingApprovals: dashboardData.pendingApprovals || 0,
        recentDiets: recentDietsData.diets || [],
      });
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      router.replace("/(auth)/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (isLoading) {
    return <Loading text="Dashboard yükleniyor..." />;
  }

  return (
    <ScrollView
      className="flex-1 bg-secondary-50"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View className="p-4">
        {/* Header */}
        <View className="flex-row justify-between items-center mb-6">
          <View>
            <Text className="text-2xl font-bold text-secondary-900">
              Hoş geldiniz, {user?.email}
            </Text>
            <Text className="text-secondary-600">Diyetisyen Paneli</Text>
          </View>
          <TouchableOpacity
            onPress={handleLogout}
            className="bg-error-100 px-3 py-2 rounded-lg"
          >
            <Text className="text-error-700 font-medium">Çıkış</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Cards */}
        <View className="flex-row flex-wrap gap-4 mb-6">
          <Card className="flex-1 min-w-[45%]">
            <View className="items-center">
              <Users className="h-8 w-8 text-primary-600 mb-2" />
              <Text className="text-2xl font-bold text-secondary-900">
                {stats?.totalClients || 0}
              </Text>
              <Text className="text-secondary-600 text-sm">Toplam Danışan</Text>
            </View>
          </Card>

          <Card className="flex-1 min-w-[45%]">
            <View className="items-center">
              <ClipboardList className="h-8 w-8 text-success-600 mb-2" />
              <Text className="text-2xl font-bold text-secondary-900">
                {stats?.totalDiets || 0}
              </Text>
              <Text className="text-secondary-600 text-sm">Toplam Diyet</Text>
            </View>
          </Card>

          <Card className="flex-1 min-w-[45%]">
            <View className="items-center">
              <TrendingUp className="h-8 w-8 text-warning-600 mb-2" />
              <Text className="text-2xl font-bold text-secondary-900">
                {stats?.thisMonthDiets || 0}
              </Text>
              <Text className="text-secondary-600 text-sm">Bu Ay Diyet</Text>
            </View>
          </Card>

          <Card className="flex-1 min-w-[45%]">
            <View className="items-center">
              <Calendar className="h-8 w-8 text-error-600 mb-2" />
              <Text className="text-2xl font-bold text-secondary-900">
                {stats?.pendingApprovals || 0}
              </Text>
              <Text className="text-secondary-600 text-sm">Bekleyen Onay</Text>
            </View>
          </Card>
        </View>

        {/* Quick Actions */}
        <Card className="mb-6">
          <Text className="text-lg font-semibold text-secondary-900 mb-4">
            Hızlı İşlemler
          </Text>

          <View className="space-y-3">
            <Button
              onPress={() => router.push("/(dietitian)/diets/new")}
              className="w-full"
            >
              <PlusCircle className="h-5 w-5 mr-2" />
              Yeni Diyet Oluştur
            </Button>

            <Button
              variant="outline"
              onPress={() => router.push("/(dietitian)/clients")}
              className="w-full"
            >
              <Users className="h-5 w-5 mr-2" />
              Danışanları Görüntüle
            </Button>

            <Button
              variant="outline"
              onPress={() => router.push("/(dietitian)/templates")}
              className="w-full"
            >
              <FileText className="h-5 w-5 mr-2" />
              Şablonları Görüntüle
            </Button>
          </View>
        </Card>

        {/* Recent Diets */}
        <Card>
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-semibold text-secondary-900">
              Son Diyetler
            </Text>
            <TouchableOpacity onPress={() => router.push("/(dietitian)/diets")}>
              <Text className="text-primary-600 font-medium">Tümünü Gör</Text>
            </TouchableOpacity>
          </View>

          {stats?.recentDiets && stats.recentDiets.length > 0 ? (
            <View className="space-y-3">
              {stats.recentDiets.map((diet) => (
                <TouchableOpacity
                  key={diet.id}
                  onPress={() => router.push(`/(dietitian)/diets/${diet.id}`)}
                  className="bg-secondary-50 p-3 rounded-lg"
                >
                  <View className="flex-row justify-between items-center">
                    <View>
                      <Text className="font-medium text-secondary-900">
                        {diet.client.name} {diet.client.surname}
                      </Text>
                      <Text className="text-secondary-600 text-sm">
                        {diet.tarih
                          ? new Date(diet.tarih).toLocaleDateString("tr-TR")
                          : "Tarih belirtilmemiş"}
                      </Text>
                    </View>
                    <Text className="text-primary-600 font-medium">
                      #{diet.id}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View className="py-8 items-center">
              <ClipboardList className="h-12 w-12 text-secondary-400 mb-3" />
              <Text className="text-secondary-600 text-center">
                Henüz diyet oluşturulmamış
              </Text>
              <Button
                variant="outline"
                onPress={() => router.push("/(dietitian)/diets/new")}
                className="mt-3"
              >
                İlk Diyetinizi Oluşturun
              </Button>
            </View>
          )}
        </Card>
      </View>
    </ScrollView>
  );
}
