import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  StyleSheet,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/core/api/client";
import { Loading } from "@/shared/ui/Loading";
import { BottomNavbar } from "@/shared/components/BottomNavbar";

import {
  ClipboardList,
  Search,
  PlusCircle,
  Calendar,
  ChevronRight,
  Heart,
  FileText,
} from "lucide-react-native";
import { useAuthStore } from "@/features/auth/stores/auth-store";

const { width } = Dimensions.get("window");

interface Diet {
  id: number;
  tarih: string;
  createdAt: string;
  client: {
    id: number;
    name: string;
    surname: string;
  };
  oguns?: Array<{
    id: number;
    name: string;
  }>;
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
  const queryClient = useQueryClient();
  const searchInputRef = useRef<TextInput>(null);
  const [diets, setDiets] = useState<Diet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);

  // Cache first page load
  const { data: cachedFirstPage } = useQuery({
    queryKey: ['diets-list-first-page'],
    queryFn: async () => {
      console.log("🔄 FETCHING first page of diets from API");
      const data: DietsResponse = await api.get(`/api/diets?skip=0&take=${ITEMS_PER_PAGE}`);
      console.log("✅ RECEIVED first page:", data.diets.length, "diets");
      return data;
    },
    staleTime: 3 * 60 * 1000, // 3 minutes
  });

  const loadDiets = useCallback(
    async (
      pageNum: number,
      search: string,
      append: boolean = false,
      showLoading: boolean = true
    ) => {
      try {
        // İlk sayfa ve arama yoksa cache'den kullan
        if (pageNum === 0 && !search && !append && cachedFirstPage) {
          console.log("💾 CACHE - Using cached first page");
          setDiets(cachedFirstPage.diets);
          setHasMore(cachedFirstPage.hasMore);
          setTotal(cachedFirstPage.total);
          setIsLoading(false);
          return;
        }

        if (append) {
          setIsLoadingMore(true);
        } else if (showLoading) {
          setIsLoading(true);
        } else {
          // Search sırasında sadece isSearching state'ini kullan
          setIsSearching(true);
        }

        const skip = pageNum * ITEMS_PER_PAGE;
        const queryParams = new URLSearchParams();
        queryParams.append("skip", skip.toString());
        queryParams.append("take", ITEMS_PER_PAGE.toString());
        if (search) {
          queryParams.append("search", search);
        }

        const url = `/api/diets?${queryParams.toString()}`;
        console.log("🔄 FETCHING diets from API:", url);
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
        if (showLoading) {
          setIsLoading(false);
        } else {
          setIsSearching(false);
        }
        setIsLoadingMore(false);
      }
    },
    [cachedFirstPage]
  );

  const onRefresh = async () => {
    setRefreshing(true);
    setPage(0);
    await loadDiets(0, searchTerm, false, false);
    setRefreshing(false);
  };

  const loadMore = useCallback(() => {
    if (!isLoadingMore && !isLoading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadDiets(nextPage, searchTerm, true, true);
    }
  }, [page, searchTerm, hasMore, isLoading, isLoadingMore, loadDiets]);

  const handleSearch = useCallback((text: string) => {
    setSearchTerm(text);
    // Focus'u koru
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 0);
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("tr-TR");
  };

  // Debounce search term ve API çağrısı
  useEffect(() => {
    const timer = setTimeout(() => {
      // Search term değiştiğinde API çağrısı yap
      loadDiets(0, searchTerm, false, searchTerm === "" ? true : false);
      setPage(0);
    }, 800); // 800ms delay

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // İlk yükleme
  useEffect(() => {
    loadDiets(0, "", false, true);
  }, []);

  // Sadece ilk yüklemede tüm sayfa loading göster
  if (isLoading && diets.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <Loading text="Beslenme programları yükleniyor..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Stunning Header */}
      <LinearGradient
        colors={["#667eea", "#764ba2", "#f093fb", "#f5576c"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        {/* Floating Elements */}
        <View style={styles.floatingElements}>
          <View style={[styles.floatingCircle, styles.circle1]} />
          <View style={[styles.floatingCircle, styles.circle2]} />
          <View style={[styles.floatingCircle, styles.circle3]} />
        </View>

        <View style={styles.headerContent}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <View style={styles.titleSection}>
              <View style={styles.titleIconContainer}>
                <ClipboardList size={24} color="#fff" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Beslenme Programları</Text>
                <Text style={styles.headerSubtitle}>{total} aktif program</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push("/(dietitian)/diets/new")}
            >
              <PlusCircle size={20} color="#667eea" />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.searchSection}>
            <View style={styles.searchContainer}>
              <Search size={18} color="#667eea" style={styles.searchIcon} />
              <TextInput
                ref={searchInputRef}
                style={styles.searchInput}
                placeholder="Program ara..."
                placeholderTextColor="#9ca3af"
                value={searchTerm}
                onChangeText={handleSearch}
              />
              {searchTerm.length > 0 && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => {
                    handleSearch("");
                    // Focus'u koru
                    setTimeout(() => {
                      if (searchInputRef.current) {
                        searchInputRef.current.focus();
                      }
                    }, 0);
                  }}
                >
                  <Text style={styles.clearButtonText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Search Results */}
          {searchTerm && (
            <View style={styles.searchResultContainer}>
              <Text style={styles.searchResultText}>
                "{searchTerm}" için {total} sonuç bulundu
              </Text>
            </View>
          )}
        </View>
      </LinearGradient>

      {/* Diets List */}
      <ScrollView
        style={styles.scrollView}
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
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {diets.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <ClipboardList size={48} color="#9ca3af" />
              </View>
              <Text style={styles.emptyTitle}>
                {searchTerm
                  ? "Arama sonucu bulunamadı"
                  : "Henüz diyet bulunmuyor"}
              </Text>
              <Text style={styles.emptySubtitle}>
                {searchTerm
                  ? `"${searchTerm}" ile eşleşen diyet bulunamadı`
                  : "İlk diyetinizi oluşturarak başlayın"}
              </Text>
              {!searchTerm && (
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={() => router.push("/(dietitian)/diets/new")}
                >
                  <PlusCircle size={20} color="#fff" />
                  <Text style={styles.emptyButtonText}>İlk Diyeti Oluştur</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.dietsList}>
              {/* Search Loading Spinner */}
              {isSearching && (
                <View style={styles.searchLoadingContainer}>
                  <Loading text="Aranıyor..." size="small" />
                </View>
              )}

              {diets.map((diet, index) => (
                <TouchableOpacity
                  key={diet.id}
                  style={[styles.dietCard, { marginTop: index === 0 ? 0 : 16 }]}
                  onPress={() => router.push(`/(dietitian)/diets/${diet.id}`)}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={["#fff", "#f8fafc"]}
                    style={styles.dietCardGradient}
                  >
                    {/* Diet Header */}
                    <View style={styles.dietHeader}>
                      <View style={styles.dietAvatarContainer}>
                        <LinearGradient
                          colors={["#667eea", "#764ba2"]}
                          style={styles.dietAvatar}
                        >
                          <FileText size={20} color="#fff" />
                        </LinearGradient>
                      </View>

                      <View style={styles.dietInfo}>
                        <Text style={styles.dietTitle}>
                          {diet.client.name} {diet.client.surname}
                        </Text>
                        <Text style={styles.dietSubtitle}>
                          Beslenme Programı
                        </Text>
                      </View>

                      <View style={styles.dietActions}>
                        <TouchableOpacity style={styles.actionButton}>
                          <ChevronRight size={18} color="#9ca3af" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Diet Details */}
                    <View style={styles.dietDetails}>
                      <View style={styles.detailRow}>
                        <View style={styles.detailIconContainer}>
                          <Calendar size={14} color="#667eea" />
                        </View>
                        <Text style={styles.detailText}>
                          Tarih: {formatDate(diet.tarih)}
                        </Text>
                      </View>

                      <View style={styles.detailRow}>
                        <View style={styles.detailIconContainer}>
                          <Calendar size={14} color="#667eea" />
                        </View>
                        <Text style={styles.detailText}>
                          Oluşturulma: {formatDate(diet.createdAt)}
                        </Text>
                      </View>

                      {diet.oguns && diet.oguns.length > 0 && (
                        <View style={styles.ogunCountContainer}>
                          <View style={styles.ogunCountIcon}>
                            <Heart size={14} color="#ef4444" />
                          </View>
                          <Text style={styles.ogunCountText}>
                            {diet.oguns.length} öğün
                          </Text>
                        </View>
                      )}
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              ))}

              {/* Load More Indicator */}
              {isLoadingMore && (
                <View style={styles.loadMoreContainer}>
                  <Loading text="Daha fazla yükleniyor..." size="small" />
                </View>
              )}

              {/* End of List */}
              {!hasMore && diets.length > 0 && (
                <View style={styles.endOfList}>
                  <Text style={styles.endOfListText}>
                    Tüm diyetler yüklendi ({total} toplam)
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

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

  // Header Styles
  headerGradient: {
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    position: "relative",
    overflow: "hidden",
  },
  floatingElements: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  floatingCircle: {
    position: "absolute",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 50,
  },
  circle1: {
    width: 80,
    height: 80,
    top: -20,
    right: -20,
  },
  circle2: {
    width: 60,
    height: 60,
    top: 40,
    left: -30,
  },
  circle3: {
    width: 40,
    height: 40,
    bottom: 20,
    right: 50,
  },
  headerContent: {
    position: "relative",
    zIndex: 1,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  titleSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  titleIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },

  // Search Section
  searchSection: {
    marginBottom: 8,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#1f2937",
  },
  clearButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  clearButtonText: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "600",
  },
  searchResultContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  searchResultText: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "500",
  },
  // Content Styles
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 120,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#667eea",
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: "#667eea",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
  },

  // Diet Cards
  dietsList: {
    flex: 1,
  },
  searchLoadingContainer: {
    paddingVertical: 20,
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  dietCard: {
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  dietCardGradient: {
    borderRadius: 20,
    padding: 20,
  },
  dietHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  dietAvatarContainer: {
    position: "relative",
    marginRight: 16,
  },
  dietAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
  },
  dietInfo: {
    flex: 1,
  },
  dietTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 4,
  },
  dietSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  dietActions: {
    padding: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
  },
  dietDetails: {
    gap: 10,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f0f4ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  detailText: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  ogunCountContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef2f2",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  ogunCountIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#fee2e2",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  ogunCountText: {
    fontSize: 12,
    color: "#ef4444",
    fontWeight: "700",
  },
  loadMoreContainer: {
    paddingVertical: 20,
    alignItems: "center",
  },
  endOfList: {
    paddingVertical: 20,
    alignItems: "center",
  },
  endOfListText: {
    fontSize: 14,
    color: "#9ca3af",
  },
});
