import React, { useState, useEffect } from "react";
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
  ClipboardList,
  Calendar,
  MessageCircle,
  Camera,
  Clock,
  TrendingUp,
} from "lucide-react-native";

interface ClientDiet {
  id: number;
  tarih: string;
  createdAt: string;
  oguns: Array<{
    id: number;
    name: string;
    time: string;
    items: Array<{
      besin: { name: string };
      miktar: number;
      birim: { name: string };
    }>;
  }>;
}

interface DashboardStats {
  totalDiets: number;
  thisMonthDiets: number;
  upcomingMeals: Array<{
    ogunName: string;
    time: string;
    items: string[];
  }>;
}

export default function ClientDashboard() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentDiet, setRecentDiet] = useState<ClientDiet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);

      // Load client's diets
      const dietsData = await api.get("/api/diets?clientId=" + user?.id);
      const diets = dietsData.diets || [];

      // Get the most recent diet
      const latestDiet = diets.length > 0 ? diets[0] : null;
      setRecentDiet(latestDiet);

      // Calculate stats
      const now = new Date();
      const thisMonth = now.getMonth();
      const thisYear = now.getFullYear();

      const thisMonthDiets = diets.filter((diet: ClientDiet) => {
        const dietDate = new Date(diet.createdAt);
        return (
          dietDate.getMonth() === thisMonth &&
          dietDate.getFullYear() === thisYear
        );
      }).length;

      // Get upcoming meals for today
      const upcomingMeals: Array<{
        ogunName: string;
        time: string;
        items: string[];
      }> = [];

      if (latestDiet) {
        const currentTime = new Date();
        const currentHour = currentTime.getHours();
        const currentMinute = currentTime.getMinutes();

        latestDiet.oguns.forEach((ogun) => {
          const [hours, minutes] = ogun.time.split(":").map(Number);
          const mealTime = hours * 60 + minutes;
          const currentTimeMinutes = currentHour * 60 + currentMinute;

          // Show meals that are coming up in the next 4 hours
          if (
            mealTime > currentTimeMinutes &&
            mealTime <= currentTimeMinutes + 240
          ) {
            upcomingMeals.push({
              ogunName: ogun.name,
              time: ogun.time,
              items: ogun.items.map(
                (item) => `${item.besin.name} ${item.miktar} ${item.birim.name}`
              ),
            });
          }
        });
      }

      setStats({
        totalDiets: diets.length,
        thisMonthDiets,
        upcomingMeals: upcomingMeals.slice(0, 3), // Show next 3 meals
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

  const handleLogout = async () => {
    try {
      await logout();
      router.replace("/(auth)/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

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
              Hoş geldiniz!
            </Text>
            <Text className="text-secondary-600">Danışan Paneli</Text>
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
              <ClipboardList className="h-8 w-8 text-primary-600 mb-2" />
              <Text className="text-2xl font-bold text-secondary-900">
                {stats?.totalDiets || 0}
              </Text>
              <Text className="text-secondary-600 text-sm">Toplam Diyet</Text>
            </View>
          </Card>

          <Card className="flex-1 min-w-[45%]">
            <View className="items-center">
              <TrendingUp className="h-8 w-8 text-success-600 mb-2" />
              <Text className="text-2xl font-bold text-secondary-900">
                {stats?.thisMonthDiets || 0}
              </Text>
              <Text className="text-secondary-600 text-sm">Bu Ay Diyet</Text>
            </View>
          </Card>
        </View>

        {/* Recent Diet */}
        {recentDiet ? (
          <Card className="mb-6">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-semibold text-secondary-900">
                Son Diyet Programı
              </Text>
              <TouchableOpacity
                onPress={() => router.push(`/(client)/diets/${recentDiet.id}`)}
              >
                <Text className="text-primary-600 font-medium">
                  Detayları Gör
                </Text>
              </TouchableOpacity>
            </View>

            <View className="space-y-3">
              <View className="flex-row items-center">
                <Calendar className="h-5 w-5 text-secondary-500 mr-2" />
                <Text className="text-secondary-700">
                  {recentDiet.tarih
                    ? new Date(recentDiet.tarih).toLocaleDateString("tr-TR")
                    : "Tarih belirtilmemiş"}
                </Text>
              </View>

              <View className="flex-row items-center">
                <Clock className="h-5 w-5 text-secondary-500 mr-2" />
                <Text className="text-secondary-700">
                  {recentDiet.oguns.length} öğün
                </Text>
              </View>
            </View>
          </Card>
        ) : (
          <Card className="mb-6">
            <View className="py-8 items-center">
              <ClipboardList className="h-16 w-16 text-secondary-400 mb-4" />
              <Text className="text-lg font-medium text-secondary-700 mb-2">
                Henüz diyet programınız yok
              </Text>
              <Text className="text-secondary-600 text-center">
                Diyetisyeniniz size bir program hazırladığında burada görünecek
              </Text>
            </View>
          </Card>
        )}

        {/* Upcoming Meals */}
        {stats?.upcomingMeals && stats.upcomingMeals.length > 0 && (
          <Card className="mb-6">
            <Text className="text-lg font-semibold text-secondary-900 mb-4">
              Yaklaşan Öğünler
            </Text>

            <View className="space-y-3">
              {stats.upcomingMeals.map((meal, index) => (
                <View key={index} className="bg-primary-50 p-3 rounded-lg">
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="font-medium text-primary-900">
                      {meal.ogunName}
                    </Text>
                    <Text className="text-primary-700 font-medium">
                      {meal.time}
                    </Text>
                  </View>
                  <Text className="text-primary-800 text-sm">
                    {meal.items.join(", ")}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* Quick Actions */}
        <Card>
          <Text className="text-lg font-semibold text-secondary-900 mb-4">
            Hızlı İşlemler
          </Text>

          <View className="space-y-3">
            <Button
              onPress={() => router.push("/(client)/diets")}
              className="w-full"
            >
              <ClipboardList className="h-5 w-5 mr-2" />
              Tüm Diyetlerimi Gör
            </Button>

            {recentDiet && (
              <Button
                variant="outline"
                onPress={() => router.push(`/(client)/diets/${recentDiet.id}`)}
                className="w-full"
              >
                <MessageCircle className="h-5 w-5 mr-2" />
                Son Diyete Yorum Yap
              </Button>
            )}

            {recentDiet && (
              <Button
                variant="outline"
                onPress={() => router.push(`/(client)/diets/${recentDiet.id}`)}
                className="w-full"
              >
                <Camera className="h-5 w-5 mr-2" />
                Öğün Fotoğrafı Paylaş
              </Button>
            )}
          </View>
        </Card>
      </View>
    </ScrollView>
  );
}
