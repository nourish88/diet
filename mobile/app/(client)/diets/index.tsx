import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/features/auth/stores/auth-store";
import api from "@/core/api/client";
import { Card } from "@/shared/ui/Card";
import { Loading } from "@/shared/ui/Loading";
import {
  ClipboardList,
  Calendar,
  ChevronRight,
  FileText,
} from "lucide-react-native";

interface ClientDiet {
  id: number;
  tarih: string;
  createdAt: string;
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

  const loadDiets = useCallback(async () => {
    try {
      setIsLoading(true);

      // Load client's diets
      const dietsData = await api.get("/api/diets?clientId=" + user?.id);
      setDiets(dietsData.diets || []);
    } catch (error) {
      console.error("Error loading diets:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDiets();
    setRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("tr-TR");
  };

  useEffect(() => {
    loadDiets();
  }, []);

  if (isLoading) {
    return <Loading text="Beslenme programlarınız yükleniyor..." />;
  }

  return (
    <View className="flex-1 bg-secondary-50">
      {/* Header */}
      <View className="bg-white px-4 py-4 border-b border-secondary-200">
        <Text className="text-xl font-bold text-secondary-900">
          Beslenme Programlarım
        </Text>
        <Text className="text-secondary-600 text-sm mt-1">
          Diyetisyeniniz tarafından hazırlanan programlar
        </Text>
      </View>

      {/* Diets List */}
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="p-4">
          {diets.length === 0 ? (
            <Card>
              <View className="py-12 items-center">
                <ClipboardList className="h-16 w-16 text-secondary-400 mb-4" />
                <Text className="text-lg font-medium text-secondary-700 mb-2">
                  Henüz beslenme programınız yok
                </Text>
                <Text className="text-secondary-600 text-center">
                  Diyetisyeniniz size bir program hazırladığında burada
                  görünecek
                </Text>
              </View>
            </Card>
          ) : (
            <View className="space-y-3">
              {diets.map((diet) => (
                <Card key={diet.id}>
                  <TouchableOpacity
                    onPress={() => router.push(`/(client)/diets/${diet.id}`)}
                    className="flex-row items-center justify-between"
                  >
                    <View className="flex-1">
                      <View className="flex-row items-center mb-2">
                        <FileText className="h-5 w-5 text-primary-600 mr-2" />
                        <Text className="text-lg font-semibold text-secondary-900">
                          Program #{diet.id}
                        </Text>
                      </View>

                      <View className="space-y-1">
                        <View className="flex-row items-center">
                          <Calendar className="h-4 w-4 text-secondary-500 mr-2" />
                          <Text className="text-secondary-600 text-sm">
                            Program Tarihi:{" "}
                            {diet.tarih
                              ? formatDate(diet.tarih)
                              : "Belirtilmemiş"}
                          </Text>
                        </View>

                        <Text className="text-secondary-600 text-sm">
                          Oluşturulma: {formatDate(diet.createdAt)}
                        </Text>

                        <Text className="text-primary-600 text-sm font-medium">
                          {diet.oguns.length} öğün
                        </Text>
                      </View>
                    </View>

                    <ChevronRight className="h-5 w-5 text-secondary-400" />
                  </TouchableOpacity>
                </Card>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
