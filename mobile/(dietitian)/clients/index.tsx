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
  Users,
  Search,
  PlusCircle,
  Phone,
  Calendar,
  ChevronRight,
} from "lucide-react-native";

interface Client {
  id: number;
  name: string;
  surname: string;
  phoneNumber?: string;
  birthdate?: string;
  createdAt: string;
  diets?: Array<{
    id: number;
    tarih?: string;
  }>;
}

interface ClientsResponse {
  clients: Client[];
  total: number;
  hasMore: boolean;
}

const ITEMS_PER_PAGE = 20;

export default function ClientsListScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);

  const loadClients = useCallback(
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

        const url = `/api/clients?${queryParams.toString()}`;
        const data: ClientsResponse = await api.get(url);

        if (append) {
          setClients((prev) => [...prev, ...data.clients]);
        } else {
          setClients(data.clients);
        }

        setHasMore(data.hasMore);
        setTotal(data.total);
      } catch (error) {
        console.error("Error loading clients:", error);
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
    await loadClients(0, searchTerm, false);
    setRefreshing(false);
  };

  const loadMore = useCallback(() => {
    if (!isLoadingMore && !isLoading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadClients(nextPage, searchTerm, true);
    }
  }, [page, searchTerm, hasMore, isLoading, isLoadingMore, loadClients]);

  const handleSearch = useCallback(
    (text: string) => {
      setSearchTerm(text);
      setPage(0);
      loadClients(0, text, false);
    },
    [loadClients]
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("tr-TR");
  };

  const getAge = (birthdate?: string) => {
    if (!birthdate) return null;
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
      age--;
    }
    return age;
  };

  useEffect(() => {
    loadClients(0, "", false);
  }, []);

  if (isLoading) {
    return <Loading text="Danışanlar yükleniyor..." />;
  }

  return (
    <View className="flex-1 bg-secondary-50">
      {/* Header */}
      <View className="bg-white px-4 py-4 border-b border-secondary-200">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-xl font-bold text-secondary-900">
            Danışanlar
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/(dietitian)/clients/new")}
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
            placeholder="Danışan ara..."
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

      {/* Clients List */}
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
          {clients.length === 0 ? (
            <Card>
              <View className="py-12 items-center">
                <Users className="h-16 w-16 text-secondary-400 mb-4" />
                <Text className="text-lg font-medium text-secondary-700 mb-2">
                  {searchTerm
                    ? "Arama sonucu bulunamadı"
                    : "Henüz danışan bulunmuyor"}
                </Text>
                <Text className="text-secondary-600 text-center mb-6">
                  {searchTerm
                    ? `"${searchTerm}" ile eşleşen danışan bulunamadı`
                    : "İlk danışanınızı ekleyerek başlayın"}
                </Text>
                {!searchTerm && (
                  <Button
                    onPress={() => router.push("/(dietitian)/clients/new")}
                  >
                    <PlusCircle className="h-5 w-5 mr-2" />
                    İlk Danışanı Ekle
                  </Button>
                )}
              </View>
            </Card>
          ) : (
            <View className="space-y-3">
              {clients.map((client) => (
                <Card key={client.id}>
                  <TouchableOpacity
                    onPress={() =>
                      router.push(`/(dietitian)/clients/${client.id}`)
                    }
                    className="flex-row items-center justify-between"
                  >
                    <View className="flex-1">
                      <View className="flex-row items-center mb-2">
                        <Users className="h-5 w-5 text-primary-600 mr-2" />
                        <Text className="text-lg font-semibold text-secondary-900">
                          {client.name} {client.surname}
                        </Text>
                      </View>

                      <View className="space-y-1">
                        {client.phoneNumber && (
                          <View className="flex-row items-center">
                            <Phone className="h-4 w-4 text-secondary-500 mr-2" />
                            <Text className="text-secondary-600 text-sm">
                              {client.phoneNumber}
                            </Text>
                          </View>
                        )}

                        <View className="flex-row items-center">
                          <Calendar className="h-4 w-4 text-secondary-500 mr-2" />
                          <Text className="text-secondary-600 text-sm">
                            Kayıt: {formatDate(client.createdAt)}
                            {client.birthdate &&
                              ` • ${getAge(client.birthdate)} yaş`}
                          </Text>
                        </View>

                        {client.diets && client.diets.length > 0 && (
                          <Text className="text-primary-600 text-sm font-medium">
                            {client.diets.length} diyet programı
                          </Text>
                        )}
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
              {!hasMore && clients.length > 0 && (
                <View className="py-4 items-center">
                  <Text className="text-secondary-500 text-sm">
                    Tüm danışanlar yüklendi ({total} toplam)
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
