import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "../features/auth/stores/auth-store";
import { api } from "../core/api/client";
import { Card } from "../shared/ui/Card";
import { Button } from "../shared/ui/Button";
import { Loading } from "../shared/ui/Loading";
import {
  ClipboardList,
  Search,
  PlusCircle,
  Calendar,
  ChevronRight,
  FileText,
} from "lucide-react-native";

interface Diet {
  id: number;
  tarih: string;
  createdAt: string;
  client: {
    id: number;
    name: string;
    surname: string;
  };
}

interface DietsResponse {
  diets: Diet[];
  total: number;
  hasMore: boolean;
}

const ITEMS_PER_PAGE = 20;

export default function DietsListScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [diets, setDiets] = useState<Diet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);

  const loadDiets = useCallback(
    async (pageNum: number, search: string, append: boolean = false) => {
      try {
        if (append) {
          setIsLoadingMore(true);
        } else {
          setIsLoading(true);
        }

        const skip = pageNum * ITEMS_PER_PAGE;
        const queryParams = new URLSearchParams();
        queryParams.append("skip", skip.toString());
        queryParams.append("take", ITEMS_PER_PAGE.toString());
        if (search) {
          queryParams.append("search", search);
        }

        const url = `/api/diets?${queryParams.toString()}`;
        const data: DietsResponse = await api.get(url);

        if (append) {
          setDiets((prev) => [...prev, ...data.diets]);
        } else {
          setDiets(data.diets);
        }

        setHasMore(data.hasMore);
        setTotal(data.total);
      } catch (error) {
        console.error("Error loading diets:", error);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    []
  );

  const onRefresh = async () => {
    setRefreshing(true);
    setPage(0);
    await loadDiets(0, searchTerm, false);
    setRefreshing(false);
  };

  const loadMore = useCallback(() => {
    if (!isLoadingMore && !isLoading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadDiets(nextPage, searchTerm, true);
    }
  }, [page, searchTerm, hasMore, isLoading, isLoadingMore, loadDiets]);

  const handleSearch = useCallback(
    (text: string) => {
      setSearchTerm(text);
      setPage(0);
      loadDiets(0, text, false);
    },
    [loadDiets]
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("tr-TR");
  };

  useEffect(() => {
    loadDiets(0, "", false);
  }, []);

  if (isLoading) {
    return <Loading text="Beslenme programları yükleniyor..." />;
  }

  return (
    <View className="flex-1 bg-secondary-50">
      {/* Header */}
      <View className="bg-white px-4 py-4 border-b border-secondary-200">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-xl font-bold text-secondary-900">
            Beslenme Programları
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/(dietitian)/diets/new")}
            className="bg-primary-600 px-3 py-2 rounded-lg"
          >
            <PlusCircle className="h-5 w-5 text-white" />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View className="relative">
          <Search className="absolute left-3 top-3 h-5 w-5 text-secondary-400" />
          <TextInput
            className="pl-10 pr-4 py-3 border border-secondary-300 rounded-lg bg-white"
            placeholder="Danışan veya program ara..."
            value={searchTerm}
            onChangeText={handleSearch}
          />
        </View>

        {searchTerm && (
          <Text className="text-sm text-secondary-600 mt-2">
            "{searchTerm}" için {total} sonuç bulundu
          </Text>
        )}
      </View>

      {/* Diets List */}
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const paddingToBottom = 20;
          if (
            layoutMeasurement.height + contentOffset.y >=
            contentSize.height - paddingToBottom
          ) {
            loadMore();
          }
        }}
        scrollEventThrottle={400}
      >
        <View className="p-4">
          {diets.length === 0 ? (
            <Card>
              <View className="py-12 items-center">
                <ClipboardList className="h-16 w-16 text-secondary-400 mb-4" />
                <Text className="text-lg font-medium text-secondary-700 mb-2">
                  {searchTerm
                    ? "Arama sonucu bulunamadı"
                    : "Henüz beslenme programı bulunmuyor"}
                </Text>
                <Text className="text-secondary-600 text-center mb-6">
                  {searchTerm
                    ? `"${searchTerm}" ile eşleşen program bulunamadı`
                    : "İlk beslenme programınızı oluşturun"}
                </Text>
                {!searchTerm && (
                  <Button onPress={() => router.push("/(dietitian)/diets/new")}>
                    <PlusCircle className="h-5 w-5 mr-2" />
                    İlk Programı Oluştur
                  </Button>
                )}
              </View>
            </Card>
          ) : (
            <View className="space-y-3">
              {diets.map((diet) => (
                <Card key={diet.id}>
                  <TouchableOpacity
                    onPress={() => router.push(`/(dietitian)/diets/${diet.id}`)}
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
                            {diet.client.name} {diet.client.surname}
                          </Text>
                        </View>

                        <Text className="text-secondary-600 text-sm">
                          Program Tarihi:{" "}
                          {diet.tarih
                            ? formatDate(diet.tarih)
                            : "Belirtilmemiş"}
                        </Text>

                        <Text className="text-secondary-600 text-sm">
                          Oluşturulma: {formatDate(diet.createdAt)}
                        </Text>
                      </View>
                    </View>

                    <ChevronRight className="h-5 w-5 text-secondary-400" />
                  </TouchableOpacity>
                </Card>
              ))}

              {/* Load More Indicator */}
              {isLoadingMore && (
                <View className="py-4 items-center">
                  <Loading text="Daha fazla yükleniyor..." size="small" />
                </View>
              )}

              {/* End of List */}
              {!hasMore && diets.length > 0 && (
                <View className="py-4 items-center">
                  <Text className="text-secondary-500 text-sm">
                    Tüm programlar yüklendi ({total} toplam)
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
