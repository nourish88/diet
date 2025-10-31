import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Save, ArrowLeft, X, Clock, Utensils } from "lucide-react-native";
import api from "@/core/api/client";
import ClientSelector from "@/shared/components/ClientSelector";
import DietFormBasicFields from "@/shared/components/DietFormBasicFields";
import OgunCard from "@/shared/components/OgunCard";
import PresetSelector, { MealPreset } from "@/shared/components/PresetSelector";

// Default öğünler
const DEFAULT_OGUNS = [
  {
    name: "Uyanınca",
    time: "07:00",
    detail: "",
    items: [{ besin: "", miktar: "", birim: "" }],
  },
  {
    name: "Kahvaltı",
    time: "07:30",
    detail: "",
    items: [{ besin: "", miktar: "", birim: "" }],
  },
  {
    name: "İlk Ara Öğün",
    time: "10:00",
    detail: "",
    items: [{ besin: "", miktar: "", birim: "" }],
  },
  {
    name: "Öğlen",
    time: "12:30",
    detail: "",
    items: [{ besin: "", miktar: "", birim: "" }],
  },
  {
    name: "İkindi Ara Öğünü",
    time: "15:30",
    detail: "",
    items: [{ besin: "", miktar: "", birim: "" }],
  },
  {
    name: "Akşam",
    time: "19:30",
    detail: "",
    items: [{ besin: "", miktar: "", birim: "" }],
  },
  {
    name: "Son Ara Öğün",
    time: "21:30",
    detail: "",
    items: [{ besin: "", miktar: "", birim: "" }],
  },
];

interface DietFormData {
  Tarih?: string | null;
  Hedef?: string;
  Sonuc?: string;
  Su?: string;
  Fizik?: string;
  dietitianNote?: string;
}

interface OgunData {
  name: string;
  time: string;
  detail: string;
  items: Array<{
    besin: string;
    miktar: string;
    birim: string;
  }>;
}

interface DietCreateScreenProps {
  initialClientId?: number;
}

export default function DietCreateScreen({
  initialClientId,
}: DietCreateScreenProps) {
  const router = useRouter();
  const params = useLocalSearchParams();
  const templateId = params.templateId
    ? parseInt(params.templateId as string)
    : null;
  const [selectedClientId, setSelectedClientId] = useState<number | null>(
    initialClientId || null
  );
  const [diet, setDiet] = useState<DietFormData>({
    Tarih: new Date().toISOString(),
    Hedef: "",
    Sonuc: "",
    Su: "",
    Fizik: "",
    dietitianNote: "",
  });
  const [oguns, setOguns] = useState<OgunData[]>(DEFAULT_OGUNS);
  const [isSaving, setIsSaving] = useState(false);
  const [showPresetSelector, setShowPresetSelector] = useState(false);
  const [selectedOgunIndex, setSelectedOgunIndex] = useState<number | null>(
    null
  );
  const [presets, setPresets] = useState<MealPreset[]>([]);
  const [isLoadingPresets, setIsLoadingPresets] = useState(false);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [showAddOgunModal, setShowAddOgunModal] = useState(false);
  const [newOgunName, setNewOgunName] = useState("");
  const [newOgunTime, setNewOgunTime] = useState("");

  // Load template if templateId is provided
  useEffect(() => {
    if (templateId) {
      loadTemplate(templateId);
    }
  }, [templateId]);

  const loadTemplate = async (id: number) => {
    try {
      setIsLoadingTemplate(true);
      const template = await api.get<any>(`/api/templates/${id}`);

      // Populate form with template data
      setDiet({
        Tarih: new Date().toISOString(),
        Hedef: template.hedef || "",
        Sonuc: template.sonuc || "",
        Su: template.su || "",
        Fizik: template.fizik || "",
        dietitianNote: "",
      });

      // Populate oguns
      if (template.oguns && Array.isArray(template.oguns)) {
        setOguns(
          template.oguns.map((ogun: any) => ({
            name: ogun.name || "",
            time: ogun.time || "",
            detail: ogun.detail || "",
            items: (ogun.items || []).map((item: any) => ({
              besin: item.besinName || item.besin?.name || "",
              miktar: item.miktar || "",
              birim: item.birim || item.birim?.name || "",
            })),
          }))
        );
      }
    } catch (error) {
      console.error("Error loading template:", error);
      Alert.alert("Hata", "Şablon yüklenirken bir hata oluştu");
    } finally {
      setIsLoadingTemplate(false);
    }
  };

  const handleDietChange = (changes: Partial<DietFormData>) => {
    setDiet((prev) => ({ ...prev, ...changes }));
  };

  // Convert time string (HH:MM) to minutes for sorting
  const timeToMinutes = (time: string): number => {
    if (!time || !time.includes(":")) return 9999; // Put invalid times at end
    const [hours, minutes] = time.split(":").map(Number);
    if (isNaN(hours) || isNaN(minutes)) return 9999;
    return hours * 60 + minutes;
  };

  // Sort oguns by time
  const sortOgunsByTime = (ogunsArray: OgunData[]): OgunData[] => {
    return [...ogunsArray].sort((a, b) => {
      return timeToMinutes(a.time) - timeToMinutes(b.time);
    });
  };

  const handleOgunChange = (
    index: number,
    field: keyof OgunData,
    value: string
  ) => {
    setOguns((prev) => {
      const updated = prev.map((ogun, idx) =>
        idx === index ? { ...ogun, [field]: value } : ogun
      );
      // If time changed, re-sort by time
      if (field === "time") {
        return sortOgunsByTime(updated);
      }
      return updated;
    });
  };

  const handleMenuItemChange = (
    ogunIndex: number,
    itemIndex: number,
    field: string,
    value: string
  ) => {
    setOguns((prev) =>
      prev.map((ogun, idx) => {
        if (idx === ogunIndex) {
          return {
            ...ogun,
            items: ogun.items.map((item, itemIdx) =>
              itemIdx === itemIndex ? { ...item, [field]: value } : item
            ),
          };
        }
        return ogun;
      })
    );
  };

  const handleAddMenuItem = (ogunIndex: number) => {
    setOguns((prev) =>
      prev.map((ogun, idx) =>
        idx === ogunIndex
          ? {
              ...ogun,
              items: [...ogun.items, { besin: "", miktar: "", birim: "" }],
            }
          : ogun
      )
    );
  };

  const handleDeleteMenuItem = (ogunIndex: number, itemIndex: number) => {
    setOguns((prev) =>
      prev.map((ogun, idx) =>
        idx === ogunIndex
          ? {
              ...ogun,
              items: ogun.items.filter((_, itemIdx) => itemIdx !== itemIndex),
            }
          : ogun
      )
    );
  };

  const handleAddOgun = () => {
    setNewOgunName("");
    setNewOgunTime("");
    setShowAddOgunModal(true);
  };

  const handleSaveNewOgun = () => {
    if (!newOgunName.trim()) {
      Alert.alert("Uyarı", "Lütfen öğün adı girin");
      return;
    }

    if (!newOgunTime.trim()) {
      Alert.alert("Uyarı", "Lütfen öğün saati girin (örn: 08:00)");
      return;
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(newOgunTime.trim())) {
      Alert.alert("Uyarı", "Saat formatı geçersiz. Örnek: 08:00 veya 14:30");
      return;
    }

    const newOgun: OgunData = {
      name: newOgunName.trim(),
      time: newOgunTime.trim(),
      detail: "",
      items: [{ besin: "", miktar: "", birim: "" }],
    };

    // Add new ogun and sort by time
    setOguns((prev) => {
      const updated = [...prev, newOgun];
      return sortOgunsByTime(updated);
    });

    setShowAddOgunModal(false);
    setNewOgunName("");
    setNewOgunTime("");
  };

  const handleDeleteOgun = (index: number) => {
    Alert.alert("Öğünü Sil", "Bu öğünü silmek istediğinizden emin misiniz?", [
      { text: "İptal", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: () => {
          setOguns((prev) => prev.filter((_, idx) => idx !== index));
        },
      },
    ]);
  };

  const handleApplyPreset = async (ogunIndex: number) => {
    try {
      setIsLoadingPresets(true);
      const ogun = oguns[ogunIndex];
      const mealType = getMealType(ogun.name);
      const response = await api.get<MealPreset[]>(
        `/api/presets${mealType ? `?mealType=${mealType}` : ""}`
      );
      setPresets(response || []);
      setSelectedOgunIndex(ogunIndex);
      setShowPresetSelector(true);
    } catch (error) {
      console.error("Error loading presets:", error);
      Alert.alert("Hata", "Preset'ler yüklenirken bir hata oluştu");
    } finally {
      setIsLoadingPresets(false);
    }
  };

  const getMealType = (name: string): string => {
    const lower = name.toLowerCase();
    if (lower.includes("kahvaltı")) return "kahvalti";
    if (lower.includes("öğle")) return "ogle";
    if (lower.includes("akşam")) return "aksam";
    if (lower.includes("ara")) return "ara_ogun";
    return "";
  };

  const handlePresetSelect = (preset: MealPreset) => {
    if (selectedOgunIndex === null) return;

    setOguns((prev) =>
      prev.map((ogun, idx) => {
        if (idx === selectedOgunIndex) {
          return {
            ...ogun,
            items: preset.items.map((item) => ({
              besin: item.besinName,
              miktar: item.miktar,
              birim: item.birim,
            })),
          };
        }
        return ogun;
      })
    );
    setSelectedOgunIndex(null);
  };

  const handleSave = async () => {
    if (!selectedClientId) {
      Alert.alert("Uyarı", "Lütfen bir danışan seçin");
      return;
    }

    try {
      setIsSaving(true);

      const dietData = {
        clientId: selectedClientId,
        tarih: diet.Tarih || new Date().toISOString(),
        hedef: diet.Hedef || "",
        sonuc: diet.Sonuc || "",
        su: diet.Su || "",
        fizik: diet.Fizik || "",
        dietitianNote: diet.dietitianNote || "",
        oguns: oguns.map((ogun, index) => ({
          name: ogun.name,
          time: ogun.time,
          detail: ogun.detail,
          order: index + 1,
          items: ogun.items
            .filter((item) => item.besin && item.besin.trim() !== "")
            .map((item) => ({
              besin: item.besin,
              miktar: item.miktar,
              birim: item.birim,
            })),
        })),
      };

      const response = await api.post("/api/diets", dietData);

      Alert.alert("Başarılı", "Diyet başarıyla oluşturuldu", [
        {
          text: "Tamam",
          onPress: () => {
            router.back();
          },
        },
      ]);
    } catch (error: any) {
      console.error("Error saving diet:", error);
      Alert.alert(
        "Hata",
        error.message || "Diyet kaydedilirken bir hata oluştu"
      );
    } finally {
      setIsSaving(false);
    }
  };

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
          <Text style={styles.headerTitle}>Yeni Diyet</Text>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
            disabled={isSaving || !selectedClientId}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#667eea" />
            ) : (
              <Save size={20} color="#667eea" />
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Content */}
      {isLoadingTemplate ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Şablon yükleniyor...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Client Selector */}
          <ClientSelector
            selectedClientId={selectedClientId}
            onSelectClient={setSelectedClientId}
          />

          {/* Basic Fields */}
          <DietFormBasicFields diet={diet} onDietChange={handleDietChange} />

          {/* Oguns */}
          <View style={styles.ogunsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Öğünler</Text>
              <TouchableOpacity
                style={styles.addOgunButton}
                onPress={handleAddOgun}
              >
                <Text style={styles.addOgunButtonText}>+ Öğün Ekle</Text>
              </TouchableOpacity>
            </View>

            {oguns.map((ogun, index) => (
              <OgunCard
                key={index}
                ogun={ogun}
                index={index}
                onOgunChange={(field: keyof OgunData, value: string) =>
                  handleOgunChange(index, field, value)
                }
                onMenuItemChange={(
                  itemIndex: number,
                  field: string,
                  value: string
                ) => handleMenuItemChange(index, itemIndex, field, value)}
                onAddMenuItem={() => handleAddMenuItem(index)}
                onDeleteMenuItem={(itemIndex: number) =>
                  handleDeleteMenuItem(index, itemIndex)
                }
                onDeleteOgun={() => handleDeleteOgun(index)}
                onApplyPreset={() => handleApplyPreset(index)}
              />
            ))}
          </View>
        </ScrollView>
      )}

      {/* Preset Selector Modal */}
      <PresetSelector
        visible={showPresetSelector}
        onClose={() => {
          setShowPresetSelector(false);
          setSelectedOgunIndex(null);
        }}
        onSelect={handlePresetSelect}
        presets={presets}
        isLoading={isLoadingPresets}
        mealType={
          selectedOgunIndex !== null
            ? getMealType(oguns[selectedOgunIndex].name)
            : undefined
        }
      />

      {/* Add Ogun Modal */}
      <Modal
        visible={showAddOgunModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddOgunModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAddOgunModal(false)}
        >
          <View
            style={styles.addOgunModalContent}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.addOgunModalHeader}>
              <Text style={styles.addOgunModalTitle}>Yeni Öğün Ekle</Text>
              <TouchableOpacity
                onPress={() => setShowAddOgunModal(false)}
                style={styles.modalCloseButton}
              >
                <X size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.addOgunForm}>
              {/* Ogun Name */}
              <View style={styles.addOgunField}>
                <View style={styles.addOgunLabelContainer}>
                  <Utensils size={18} color="#667eea" />
                  <Text style={styles.addOgunLabel}>Öğün Adı</Text>
                </View>
                <TextInput
                  style={styles.addOgunInput}
                  placeholder="Örn: Kahvaltı, Öğle, Akşam..."
                  placeholderTextColor="#9ca3af"
                  value={newOgunName}
                  onChangeText={setNewOgunName}
                  autoFocus
                />
              </View>

              {/* Ogun Time */}
              <View style={styles.addOgunField}>
                <View style={styles.addOgunLabelContainer}>
                  <Clock size={18} color="#667eea" />
                  <Text style={styles.addOgunLabel}>Saat</Text>
                </View>
                <TextInput
                  style={styles.addOgunInput}
                  placeholder="Örn: 08:00, 14:30"
                  placeholderTextColor="#9ca3af"
                  value={newOgunTime}
                  onChangeText={(text) => {
                    // Format time as user types
                    let formatted = text.replace(/[^\d:]/g, "");
                    if (formatted.length === 2 && !formatted.includes(":")) {
                      formatted = formatted + ":";
                    }
                    if (formatted.length > 5) {
                      formatted = formatted.substring(0, 5);
                    }
                    setNewOgunTime(formatted);
                  }}
                  keyboardType="numeric"
                  maxLength={5}
                />
                <Text style={styles.addOgunHint}>
                  Format: HH:MM (örn: 08:00)
                </Text>
              </View>

              <View style={styles.addOgunActions}>
                <TouchableOpacity
                  style={styles.addOgunCancelButton}
                  onPress={() => {
                    setShowAddOgunModal(false);
                    setNewOgunName("");
                    setNewOgunTime("");
                  }}
                >
                  <Text style={styles.addOgunCancelText}>İptal</Text>
                </TouchableOpacity>
                <View style={styles.addOgunActionsSpacer} />
                <TouchableOpacity
                  style={[
                    styles.addOgunSaveButton,
                    (!newOgunName.trim() || !newOgunTime.trim()) &&
                      styles.addOgunSaveButtonDisabled,
                  ]}
                  onPress={handleSaveNewOgun}
                  disabled={!newOgunName.trim() || !newOgunTime.trim()}
                >
                  <Text style={styles.addOgunSaveText}>Ekle</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
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
  saveButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 120,
  },
  ogunsSection: {
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f2937",
  },
  addOgunButton: {
    backgroundColor: "#667eea",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  addOgunButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  addOgunModalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  addOgunModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  addOgunModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
  },
  addOgunForm: {
    padding: 20,
  },
  addOgunField: {
    marginBottom: 20,
  },
  addOgunLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  addOgunLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginLeft: 8,
  },
  addOgunInput: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#1f2937",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    minHeight: 48,
  },
  addOgunHint: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
    marginLeft: 4,
  },
  addOgunActions: {
    flexDirection: "row",
    marginTop: 8,
  },
  addOgunActionsSpacer: {
    width: 12,
  },
  addOgunCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  addOgunCancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
  addOgunSaveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#667eea",
    alignItems: "center",
    justifyContent: "center",
  },
  addOgunSaveButtonDisabled: {
    backgroundColor: "#d1d5db",
  },
  addOgunSaveText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
