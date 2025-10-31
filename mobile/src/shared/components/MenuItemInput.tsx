import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Search, X, Trash2 } from "lucide-react-native";
import api from "@/core/api/client";

interface MenuItemData {
  besin: string;
  miktar: string;
  birim: string;
}

interface BesinSuggestion {
  id: number;
  name: string;
  miktar?: string;
  birim?: string;
  usageCount?: number;
  score?: number;
}

interface Birim {
  id: number;
  name: string;
}

interface MenuItemInputProps {
  item: MenuItemData;
  onItemChange: (field: keyof MenuItemData, value: string) => void;
  onDelete?: () => void;
}

const COMMON_BIRIMS = [
  "adet",
  "dilim",
  "su bardağı",
  "çay bardağı",
  "yemek kaşığı",
  "tatlı kaşığı",
  "çay kaşığı",
  "gram",
  "kg",
  "ml",
  "litre",
  "porsiyon",
];

export default function MenuItemInput({
  item,
  onItemChange,
  onDelete,
}: MenuItemInputProps) {
  const [showBirimModal, setShowBirimModal] = useState(false);
  const [showBesinModal, setShowBesinModal] = useState(false);
  const [besinSuggestions, setBesinSuggestions] = useState<BesinSuggestion[]>(
    []
  );
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const besinInputRef = useRef<TextInput>(null);

  // Debounce search for besin suggestions
  useEffect(() => {
    if (!showBesinModal || searchTerm.length < 2) {
      setBesinSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsLoadingSuggestions(true);
        const response = await api.get<{ suggestions: BesinSuggestion[] }>(
          `/api/suggestions/besin?q=${encodeURIComponent(searchTerm)}`
        );
        setBesinSuggestions(response.suggestions || []);
      } catch (error) {
        console.error("Error fetching besin suggestions:", error);
        setBesinSuggestions([]);
      } finally {
        setIsLoadingSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, showBesinModal]);

  const handleSelectBesin = (suggestion: BesinSuggestion) => {
    onItemChange("besin", suggestion.name);
    if (suggestion.miktar && !item.miktar) {
      onItemChange("miktar", suggestion.miktar);
    }
    if (suggestion.birim && !item.birim) {
      onItemChange("birim", suggestion.birim);
    }
    setShowBesinModal(false);
    setSearchTerm("");
  };

  const handleSelectBirim = (birim: string) => {
    onItemChange("birim", birim);
    setShowBirimModal(false);
  };

  return (
    <View style={styles.container}>
      {/* Besin Input Row */}
      <View style={styles.row}>
        <TouchableOpacity
          style={styles.besinButton}
          onPress={() => {
            setShowBesinModal(true);
            setSearchTerm(item.besin || "");
          }}
        >
          <Search size={16} color="#667eea" />
          <Text
            style={[styles.besinText, !item.besin && styles.placeholder]}
            numberOfLines={1}
          >
            {item.besin || "Besin ara..."}
          </Text>
        </TouchableOpacity>
        {onDelete && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={onDelete}
          >
            <Trash2 size={18} color="#ef4444" />
          </TouchableOpacity>
        )}
      </View>

      {/* Miktar and Birim Row */}
      <View style={styles.row}>
        <TextInput
          style={styles.miktarInput}
          placeholder="Miktar"
          placeholderTextColor="#9ca3af"
          value={item.miktar}
          onChangeText={(text) => onItemChange("miktar", text)}
          keyboardType="numeric"
        />
        <TouchableOpacity
          style={styles.birimButton}
          onPress={() => setShowBirimModal(true)}
        >
          <Text
            style={[
              styles.birimText,
              !item.birim && styles.placeholder,
            ]}
          >
            {item.birim || "Birim"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Besin Suggestions Modal */}
      <Modal
        visible={showBesinModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowBesinModal(false);
          setSearchTerm("");
        }}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Besin Ara</Text>
            <TouchableOpacity
              onPress={() => {
                setShowBesinModal(false);
                setSearchTerm("");
              }}
            >
              <X size={24} color="#1f2937" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Search size={18} color="#667eea" />
            <TextInput
              ref={besinInputRef}
              style={styles.searchInput}
              placeholder="Besin adı yazın..."
              placeholderTextColor="#9ca3af"
              value={searchTerm}
              onChangeText={setSearchTerm}
              autoFocus
            />
            {searchTerm.length > 0 && (
              <TouchableOpacity onPress={() => setSearchTerm("")}>
                <X size={18} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>

          {isLoadingSuggestions ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#667eea" />
            </View>
          ) : (
            <FlatList
              data={besinSuggestions}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item: suggestion }) => {
                if (!suggestion || typeof suggestion !== 'object') return null;
                return (
                  <TouchableOpacity
                    style={styles.suggestionItem}
                    onPress={() => handleSelectBesin(suggestion)}
                  >
                    <View style={styles.suggestionContent}>
                      <Text style={styles.suggestionName}>
                        {suggestion.name || ''}
                      </Text>
                      {suggestion.miktar && suggestion.birim && (
                        <Text style={styles.suggestionDetails}>
                          {String(suggestion.miktar)} {String(suggestion.birim)}
                        </Text>
                      )}
                      {suggestion.usageCount && suggestion.usageCount > 0 && (
                        <Text style={styles.usageCount}>
                          {String(suggestion.usageCount)}× kullanıldı
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                searchTerm.length >= 2 ? (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>
                      "{searchTerm}" için sonuç bulunamadı
                    </Text>
                  </View>
                ) : (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>
                      Arama yapmak için en az 2 karakter yazın
                    </Text>
                  </View>
                )
              }
              contentContainerStyle={styles.listContent}
            />
          )}
        </SafeAreaView>
      </Modal>

      {/* Birim Selection Modal */}
      <Modal
        visible={showBirimModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowBirimModal(false)}
      >
        <TouchableOpacity
          style={styles.birimModalOverlay}
          activeOpacity={1}
          onPress={() => setShowBirimModal(false)}
        >
          <View style={styles.birimModalContent}>
            <Text style={styles.birimModalTitle}>Birim Seç</Text>
            <FlatList
              data={COMMON_BIRIMS}
              keyExtractor={(birimItem) => birimItem}
              renderItem={({ item: birimItem }) => (
                <TouchableOpacity
                  style={[
                    styles.birimItem,
                    item.birim === birimItem && styles.birimItemSelected,
                  ]}
                  onPress={() => handleSelectBirim(birimItem)}
                >
                  <Text
                    style={[
                      styles.birimItemText,
                      item.birim === birimItem && styles.birimItemTextSelected,
                    ]}
                  >
                    {birimItem}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  besinButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    gap: 8,
  },
  besinText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: "#1f2937",
  },
  placeholder: {
    color: "#9ca3af",
    fontWeight: "400",
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#fef2f2",
    justifyContent: "center",
    alignItems: "center",
  },
  miktarInput: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1f2937",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  birimButton: {
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    minWidth: 100,
  },
  birimText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#1f2937",
    textAlign: "center",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f2937",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#1f2937",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  listContent: {
    padding: 20,
  },
  suggestionItem: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  suggestionContent: {
    gap: 4,
  },
  suggestionName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
  },
  suggestionDetails: {
    fontSize: 14,
    color: "#6b7280",
  },
  usageCount: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 4,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
  },
  birimModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  birimModalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: "50%",
  },
  birimModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f2937",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  birimItem: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  birimItemSelected: {
    backgroundColor: "#f0f4ff",
  },
  birimItemText: {
    fontSize: 16,
    color: "#1f2937",
  },
  birimItemTextSelected: {
    color: "#667eea",
    fontWeight: "600",
  },
});

