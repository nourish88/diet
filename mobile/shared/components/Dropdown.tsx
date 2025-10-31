import React, { useState, useEffect } from "react";
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
import { ChevronDown, X, Plus, Check, Search } from "lucide-react-native";

interface DropdownOption {
  id: number | string;
  label: string;
  value: string;
  isCustom?: boolean;
}

interface DropdownProps {
  value: string | null | undefined;
  options: DropdownOption[];
  placeholder?: string;
  onSelect: (value: string) => void;
  onCustomAdd?: (value: string) => Promise<void>;
  isLoading?: boolean;
  disabled?: boolean;
  searchable?: boolean;
  onSearch?: (searchTerm: string) => void;
  searchPlaceholder?: string;
}

export default function Dropdown({
  value,
  options,
  placeholder = "Seçiniz...",
  onSelect,
  onCustomAdd,
  isLoading = false,
  disabled = false,
  searchable = false,
  onSearch,
  searchPlaceholder = "Ara...",
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const selectedOption = options.find((opt) => opt.value === value);

  // Debounce search
  useEffect(() => {
    if (!isOpen || !searchable || !onSearch) return;
    const timer = setTimeout(() => {
      onSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, isOpen, searchable, onSearch]);

  const handleSelect = (option: DropdownOption) => {
    if (option.isCustom) {
      setShowCustomInput(true);
      setCustomValue("");
    } else {
      onSelect(option.value);
      setIsOpen(false);
    }
  };

  const handleSaveCustom = async () => {
    if (customValue.trim() && onCustomAdd) {
      await onCustomAdd(customValue.trim());
      setShowCustomInput(false);
      setCustomValue("");
      setIsOpen(false);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.dropdownButton, disabled && styles.disabled]}
        onPress={() => !disabled && setIsOpen(true)}
        disabled={disabled}
      >
        <Text
          style={[styles.dropdownText, !value && styles.placeholder]}
          numberOfLines={1}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <ChevronDown size={18} color="#9ca3af" />
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
                onRequestClose={() => {
                  setIsOpen(false);
                  setShowCustomInput(false);
                  setCustomValue("");
                  setSearchTerm("");
                }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setIsOpen(false);
            setShowCustomInput(false);
            setCustomValue("");
            setSearchTerm("");
          }}
        >
          <View
            style={styles.dropdownContent}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownTitle}>
                {showCustomInput ? "Özel Ekle" : placeholder}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setIsOpen(false);
                  setShowCustomInput(false);
                  setCustomValue("");
                  setSearchTerm("");
                }}
                style={styles.closeButton}
              >
                <X size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {/* Search Bar */}
            {searchable && !showCustomInput && (
              <View style={styles.searchContainer}>
                <Search size={18} color="#9ca3af" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder={searchPlaceholder}
                  placeholderTextColor="#9ca3af"
                  value={searchTerm}
                  onChangeText={setSearchTerm}
                  autoFocus
                />
                {searchTerm.length > 0 && (
                  <TouchableOpacity
                    style={styles.clearButton}
                    onPress={() => setSearchTerm("")}
                  >
                    <Text style={styles.clearButtonText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {showCustomInput ? (
              <View style={styles.customInputContainer}>
                <Text style={styles.customInputLabel}>Yeni değer ekle</Text>
                <View style={styles.customInputRow}>
                  <View style={styles.customInputWrapper}>
                    <TextInput
                      style={styles.customInput}
                      placeholder="Örn: Günde 2-3 litre su"
                      placeholderTextColor="#9ca3af"
                      value={customValue}
                      onChangeText={setCustomValue}
                      autoFocus
                    />
                  </View>
                  <View style={styles.customInputSpacer} />
                  <TouchableOpacity
                    style={[
                      styles.saveCustomButton,
                      !customValue.trim() && styles.saveCustomButtonDisabled,
                    ]}
                    onPress={handleSaveCustom}
                    disabled={!customValue.trim() || isLoading}
                  >
                    <Text style={styles.saveCustomButtonText}>Ekle</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <>
                {isLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#667eea" />
                    <Text style={styles.loadingText}>Yükleniyor...</Text>
                  </View>
                ) : (
                  <FlatList
                    data={options}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[
                          styles.option,
                          value === item.value && styles.optionSelected,
                          item.isCustom && styles.optionCustom,
                        ]}
                        onPress={() => handleSelect(item)}
                      >
                        <View style={styles.optionContent}>
                          {item.isCustom && (
                            <Plus
                              size={16}
                              color="#667eea"
                              style={{ marginRight: 8 }}
                            />
                          )}
                          <Text
                            style={[
                              styles.optionText,
                              value === item.value && styles.optionTextSelected,
                              item.isCustom && styles.optionTextCustom,
                            ]}
                          >
                            {item.label}
                          </Text>
                        </View>
                        {value === item.value && !item.isCustom && (
                          <Check size={18} color="#667eea" />
                        )}
                      </TouchableOpacity>
                    )}
                    style={styles.optionsList}
                    contentContainerStyle={styles.optionsListContent}
                  />
                )}
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  dropdownButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    minHeight: 48,
  },
  disabled: {
    opacity: 0.5,
  },
  dropdownText: {
    flex: 1,
    fontSize: 16,
    color: "#1f2937",
    fontWeight: "500",
  },
  placeholder: {
    color: "#9ca3af",
    fontWeight: "400",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  dropdownContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    width: "100%",
    maxWidth: 400,
    maxHeight: "70%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  dropdownHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
  },
  customInputContainer: {
    padding: 20,
  },
  customInputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
  },
  customInputRow: {
    flexDirection: "row",
  },
  customInputSpacer: {
    width: 12,
  },
  customInputWrapper: {
    flex: 1,
  },
  customInput: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1f2937",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  saveCustomButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#667eea",
    justifyContent: "center",
  },
  saveCustomButtonDisabled: {
    backgroundColor: "#d1d5db",
  },
  saveCustomButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6b7280",
  },
  optionsList: {
    maxHeight: 400,
  },
  optionsListContent: {
    paddingVertical: 8,
  },
  option: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  optionSelected: {
    backgroundColor: "#f0f4ff",
  },
  optionCustom: {
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  optionText: {
    fontSize: 16,
    color: "#1f2937",
    fontWeight: "500",
  },
  optionTextSelected: {
    color: "#667eea",
    fontWeight: "600",
  },
  optionTextCustom: {
    color: "#667eea",
    fontWeight: "600",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
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
});
