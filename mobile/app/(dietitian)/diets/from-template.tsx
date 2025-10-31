import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import { FileText, ArrowLeft, Search, X, Calendar } from "lucide-react-native";
import api from "@/core/api/client";

interface Template {
  id: number;
  name: string;
  category?: string;
  description?: string;
  createdAt: string;
  su?: string;
  fizik?: string;
  hedef?: string;
  sonuc?: string;
  oguns: Array<{
    id: number;
    name: string;
    time: string;
    detail?: string;
    order: number;
    items: Array<{
      id: number;
      besinName: string;
      miktar: string;
      birim: string;
    }>;
  }>;
}

export default function DietFromTemplateScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const templateId = params.templateId
    ? parseInt(params.templateId as string)
    : null;

  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const loadTemplates = useCallback(async (search: string = "") => {
    try {
      if (search) {
        setIsSearching(true);
      } else {
        setIsLoading(true);
      }

      const queryParams = new URLSearchParams();
      if (search) {
        queryParams.append("search", search);
      }

      const url = `/api/templates${
        queryParams.toString() ? `?${queryParams.toString()}` : ""
      }`;
      const data = await api.get<Template[]>(url);
      setTemplates(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading templates:", error);
      setTemplates([]);
    } finally {
      setIsLoading(false);
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, []);

  // Debounce search
  useEffect(() => {
    if (searchTerm === "") {
      loadTemplates("");
      return;
    }

    const timer = setTimeout(() => {
      loadTemplates(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // If templateId is provided, load that template and redirect
  useEffect(() => {
    if (templateId) {
      loadTemplateAndRedirect(templateId);
    }
  }, [templateId]);

  const loadTemplateAndRedirect = async (id: number) => {
    try {
      setIsLoading(true);
      const template = await api.get<Template>(`/api/templates/${id}`);
      router.push({
        pathname: "/(dietitian)/diets/create",
        params: {
          templateId: id.toString(),
        },
      });
    } catch (error) {
      console.error("Error loading template:", error);
      Alert.alert("Hata", "Şablon yüklenirken bir hata oluştu");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectTemplate = (template: Template) => {
    router.push({
      pathname: "/(dietitian)/diets/create",
      params: {
        templateId: template.id.toString(),
      },
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("tr-TR");
  };

  if (isLoading && templates.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Şablonlar yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <LinearGradient
        colors={["#667eea", "#764ba2", "#f093fb"]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Şablondan Oluştur</Text>
          <View style={styles.backButton} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search size={18} color="#667eea" />
          <TextInput
            style={styles.searchInput}
            placeholder="Şablon ara..."
            placeholderTextColor="#9ca3af"
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => setSearchTerm("")}
            >
              <X size={18} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadTemplates(searchTerm)}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {isSearching && (
          <View style={styles.searchLoadingContainer}>
            <ActivityIndicator size="small" color="#667eea" />
            <Text style={styles.searchLoadingText}>Aranıyor...</Text>
          </View>
        )}

        {templates.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FileText size={48} color="#9ca3af" />
            <Text style={styles.emptyTitle}>
              {searchTerm
                ? "Arama sonucu bulunamadı"
                : "Henüz şablon bulunmuyor"}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchTerm
                ? `"${searchTerm}" ile eşleşen şablon bulunamadı`
                : "İlk şablonunuzu oluşturarak başlayın"}
            </Text>
          </View>
        ) : (
          <View style={styles.templatesList}>
            {templates.map((template) => (
              <TouchableOpacity
                key={template.id}
                style={styles.templateCard}
                onPress={() => handleSelectTemplate(template)}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={["#fff", "#f8fafc"]}
                  style={styles.templateCardGradient}
                >
                  <View style={styles.templateHeader}>
                    <View style={styles.templateIcon}>
                      <FileText size={24} color="#10b981" />
                    </View>
                    <View style={styles.templateInfo}>
                      <Text style={styles.templateName}>{template.name}</Text>
                      {template.category && (
                        <Text style={styles.templateCategory}>
                          {template.category}
                        </Text>
                      )}
                    </View>
                  </View>

                  {template.description && (
                    <Text style={styles.templateDescription}>
                      {template.description}
                    </Text>
                  )}

                  <View style={styles.templateFooter}>
                    <View style={styles.templateMeta}>
                      <Calendar size={14} color="#6b7280" />
                      <Text style={styles.templateMetaText}>
                        {formatDate(template.createdAt)}
                      </Text>
                    </View>
                    <View style={styles.templateMeta}>
                      <Text style={styles.templateMetaText}>
                        {template.oguns.length} öğün
                      </Text>
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    flex: 1,
    textAlign: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
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
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 120,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6b7280",
  },
  searchLoadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 16,
    gap: 8,
  },
  searchLoadingText: {
    fontSize: 14,
    color: "#6b7280",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#374151",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 24,
  },
  templatesList: {
    gap: 16,
  },
  templateCard: {
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  templateCardGradient: {
    borderRadius: 20,
    padding: 20,
  },
  templateHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  templateIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#d1fae5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 4,
  },
  templateCategory: {
    fontSize: 14,
    color: "#10b981",
    fontWeight: "600",
  },
  templateDescription: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 20,
    marginBottom: 12,
  },
  templateFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  templateMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  templateMetaText: {
    fontSize: 12,
    color: "#6b7280",
  },
});
