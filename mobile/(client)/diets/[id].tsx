import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuthStore } from "../features/auth/stores/auth-store";
import { api } from "../core/api/client";
import { Card } from "../shared/ui/Card";
import { Button } from "../shared/ui/Button";
import { Loading } from "../shared/ui/Loading";
import {
  Clock,
  FileText,
  Download,
  MessageCircle,
  Camera,
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
  const [diet, setDiet] = useState<DietDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadDiet = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`/api/diets/${id}`);
      // API returns { diet: ... }, so we need to extract the diet object
      setDiet(response.diet || response);
    } catch (error) {
      console.error("Error loading diet:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("tr-TR");
  };

  const formatTime = (timeString: string) => {
    return timeString;
  };

  useEffect(() => {
    if (id) {
      loadDiet();
    }
  }, [id]);

  if (isLoading) {
    return <Loading text="Diyet yükleniyor..." />;
  }

  if (!diet) {
    return (
      <View className="flex-1 bg-secondary-50 items-center justify-center">
        <Text className="text-secondary-600">Diyet bulunamadı</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-secondary-50">
      <View className="p-4">
        {/* Header */}
        <Card className="mb-4">
          <View className="flex-row items-center mb-3">
            <FileText className="h-6 w-6 text-primary-600 mr-2" />
            <Text className="text-xl font-bold text-secondary-900">
              Beslenme Programım #{diet.id}
            </Text>
          </View>

          <View className="space-y-2">
            <Text className="text-secondary-700">
              <Text className="font-medium">Program Tarihi:</Text>{" "}
              {diet.tarih ? formatDate(diet.tarih) : "Belirtilmemiş"}
            </Text>
            <Text className="text-secondary-700">
              <Text className="font-medium">Oluşturulma:</Text>{" "}
              {formatDate(diet.createdAt)}
            </Text>
          </View>
        </Card>

        {/* Program Bilgileri */}
        {(diet.su || diet.sonuc || diet.hedef || diet.fizik) && (
          <Card className="mb-4">
            <Text className="text-lg font-semibold text-secondary-900 mb-3">
              Program Bilgileri
            </Text>

            <View className="space-y-2">
              {diet.su && (
                <View>
                  <Text className="font-medium text-secondary-700">Su:</Text>
                  <Text className="text-secondary-600">{diet.su}</Text>
                </View>
              )}

              {diet.sonuc && (
                <View>
                  <Text className="font-medium text-secondary-700">Sonuç:</Text>
                  <Text className="text-secondary-600">{diet.sonuc}</Text>
                </View>
              )}

              {diet.hedef && (
                <View>
                  <Text className="font-medium text-secondary-700">Hedef:</Text>
                  <Text className="text-secondary-600">{diet.hedef}</Text>
                </View>
              )}

              {diet.fizik && (
                <View>
                  <Text className="font-medium text-secondary-700">
                    Fiziksel Aktivite:
                  </Text>
                  <Text className="text-secondary-600">{diet.fizik}</Text>
                </View>
              )}
            </View>
          </Card>
        )}

        {/* Diyetisyen Notu */}
        {diet.dietitianNote && (
          <Card className="mb-4">
            <Text className="text-lg font-semibold text-secondary-900 mb-3">
              Diyetisyen Notu
            </Text>
            <Text className="text-secondary-600">{diet.dietitianNote}</Text>
          </Card>
        )}

        {/* Öğünler */}
        <Card className="mb-4">
          <Text className="text-lg font-semibold text-secondary-900 mb-3">
            Öğünlerim
          </Text>

          <View className="space-y-4">
            {diet.oguns.map((ogun) => (
              <View key={ogun.id} className="bg-primary-50 p-3 rounded-lg">
                <View className="flex-row items-center mb-2">
                  <Clock className="h-4 w-4 text-primary-600 mr-2" />
                  <Text className="font-medium text-primary-900">
                    {ogun.name}
                  </Text>
                  <Text className="text-primary-700 font-medium ml-auto">
                    {formatTime(ogun.time)}
                  </Text>
                </View>

                <View className="space-y-1">
                  {ogun.items.map((item) => (
                    <Text key={item.id} className="text-primary-800 text-sm">
                      • {item.besin.name} - {item.miktar} {item.birim.name}
                    </Text>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </Card>

        {/* Actions */}
        <Card>
          <Text className="text-lg font-semibold text-secondary-900 mb-3">
            İşlemler
          </Text>

          <View className="space-y-3">
            <Button
              variant="outline"
              className="w-full"
              onPress={() => {
                // TODO: Implement comment functionality
                console.log("Comment on diet");
              }}
            >
              <MessageCircle className="h-5 w-5 mr-2" />
              Yorum Yap
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onPress={() => {
                // TODO: Implement photo upload functionality
                console.log("Upload meal photo");
              }}
            >
              <Camera className="h-5 w-5 mr-2" />
              Öğün Fotoğrafı Paylaş
            </Button>

            <Button
              className="w-full"
              onPress={() => {
                // TODO: Implement PDF generation
                console.log("Generate PDF");
              }}
            >
              <Download className="h-5 w-5 mr-2" />
              PDF Olarak İndir
            </Button>
          </View>
        </Card>
      </View>
    </ScrollView>
  );
}
