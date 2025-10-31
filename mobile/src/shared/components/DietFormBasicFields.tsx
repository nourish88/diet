import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import {
  Calendar,
  Target,
  TrendingUp,
  Droplet,
  Activity,
  FileText,
  ChevronDown,
} from "lucide-react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import api from "@/core/api/client";
import Dropdown from "@/shared/components/Dropdown";

interface DietFormData {
  Tarih?: string | null;
  Hedef?: string;
  Sonuc?: string;
  Su?: string;
  Fizik?: string;
  dietitianNote?: string;
}

interface Definition {
  id: number;
  type: string;
  name: string;
  isActive: boolean;
}

interface DietFormBasicFieldsProps {
  diet: DietFormData;
  onDietChange: (diet: Partial<DietFormData>) => void;
}

export default function DietFormBasicFields({
  diet,
  onDietChange,
}: DietFormBasicFieldsProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [suDefinitions, setSuDefinitions] = useState<Definition[]>([]);
  const [fizikDefinitions, setFizikDefinitions] = useState<Definition[]>([]);
  const [isLoadingDefinitions, setIsLoadingDefinitions] = useState(false);

  // Load definitions
  useEffect(() => {
    loadDefinitions();
  }, []);

  const loadDefinitions = async () => {
    try {
      setIsLoadingDefinitions(true);
      const [suDefs, fizikDefs] = await Promise.all([
        api.get<Definition[]>("/api/definitions?type=su_tuketimi"),
        api.get<Definition[]>("/api/definitions?type=fiziksel_aktivite"),
      ]);
      console.log("📋 Su definitions loaded:", suDefs?.length || 0);
      console.log("📋 Fizik definitions loaded:", fizikDefs?.length || 0);
      setSuDefinitions(suDefs || []);
      setFizikDefinitions(fizikDefs || []);
    } catch (error) {
      console.error("❌ Error loading definitions:", error);
    } finally {
      setIsLoadingDefinitions(false);
    }
  };

  const saveCustomDefinition = async (
    type: "su_tuketimi" | "fiziksel_aktivite",
    name: string
  ) => {
    try {
      const newDef = await api.post<Definition>("/api/definitions", {
        type,
        name: name.trim(),
      });

      if (type === "su_tuketimi") {
        setSuDefinitions((prev) => [newDef, ...prev]);
        onDietChange({ Su: name.trim() });
      } else {
        setFizikDefinitions((prev) => [newDef, ...prev]);
        onDietChange({ Fizik: name.trim() });
      }
    } catch (error) {
      console.error("Error saving custom definition:", error);
    }
  };

  const suOptions = useMemo(() => {
    const opts: Array<{
      id: number | string;
      label: string;
      value: string;
      isCustom?: boolean;
    }> = suDefinitions.map((def) => ({
      id: def.id,
      label: def.name,
      value: def.name,
    }));
    opts.push({
      id: "__custom__",
      label: "Özel giriş yap",
      value: "__custom__",
      isCustom: true,
    });
    console.log("💧 Su options:", opts.length);
    return opts;
  }, [suDefinitions]);

  const fizikOptions = useMemo(() => {
    const opts: Array<{
      id: number | string;
      label: string;
      value: string;
      isCustom?: boolean;
    }> = fizikDefinitions.map((def) => ({
      id: def.id,
      label: def.name,
      value: def.name,
    }));
    opts.push({
      id: "__custom__",
      label: "Özel giriş yap",
      value: "__custom__",
      isCustom: true,
    });
    console.log("🏃 Fizik options:", opts.length);
    return opts;
  }, [fizikDefinitions]);

  // Debug logs
  useEffect(() => {
    console.log(
      "🔍 Su options:",
      suOptions.length,
      "Fizik options:",
      fizikOptions.length,
      "isLoading:",
      isLoadingDefinitions
    );
  }, [suOptions, fizikOptions, isLoadingDefinitions]);

  const handleSelectSu = (value: string) => {
    if (value !== "__custom__") {
      onDietChange({ Su: value });
    }
  };

  const handleSelectFizik = (value: string) => {
    if (value !== "__custom__") {
      onDietChange({ Fizik: value });
    }
  };

  const handleCustomSu = async (value: string) => {
    await saveCustomDefinition("su_tuketimi", value);
  };

  const handleCustomFizik = async (value: string) => {
    await saveCustomDefinition("fiziksel_aktivite", value);
  };

  const handleFieldChange = (field: keyof DietFormData, value: any) => {
    onDietChange({ [field]: value });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("tr-TR");
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Diyet Bilgileri</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Tarih */}
        <View style={styles.fieldContainer}>
          <View style={styles.labelContainer}>
            <Calendar size={18} color="#667eea" />
            <Text style={styles.label}>Tarih</Text>
          </View>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateText}>
              {diet.Tarih ? formatDate(diet.Tarih) : "Tarih seçin"}
            </Text>
            <Calendar size={20} color="#9ca3af" />
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={diet.Tarih ? new Date(diet.Tarih) : new Date()}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) {
                  handleFieldChange("Tarih", selectedDate.toISOString());
                }
              }}
            />
          )}
        </View>

        {/* Hedef */}
        <View style={styles.fieldContainer}>
          <View style={styles.labelContainer}>
            <Target size={18} color="#667eea" />
            <Text style={styles.label}>Hedef</Text>
          </View>
          <TextInput
            style={styles.textInput}
            placeholder="Bu hafta için hedef..."
            placeholderTextColor="#9ca3af"
            value={diet.Hedef}
            onChangeText={(text) => handleFieldChange("Hedef", text)}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Sonuç */}
        <View style={styles.fieldContainer}>
          <View style={styles.labelContainer}>
            <TrendingUp size={18} color="#667eea" />
            <Text style={styles.label}>Sonuç</Text>
          </View>
          <TextInput
            style={styles.textInput}
            placeholder="Geçen hafta sonuçları..."
            placeholderTextColor="#9ca3af"
            value={diet.Sonuc}
            onChangeText={(text) => handleFieldChange("Sonuc", text)}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Su */}
        <View style={styles.fieldContainer}>
          <View style={styles.labelContainer}>
            <Droplet size={18} color="#667eea" />
            <Text style={styles.label}>Su Tüketimi</Text>
          </View>
          <Dropdown
            value={diet.Su}
            options={suOptions}
            placeholder="Su tüketimi seçiniz..."
            onSelect={handleSelectSu}
            onCustomAdd={handleCustomSu}
            isLoading={isLoadingDefinitions}
          />
        </View>

        {/* Fiziksel Aktivite */}
        <View style={styles.fieldContainer}>
          <View style={styles.labelContainer}>
            <Activity size={18} color="#667eea" />
            <Text style={styles.label}>Fiziksel Aktivite</Text>
          </View>
          <Dropdown
            value={diet.Fizik}
            options={fizikOptions}
            placeholder="Fiziksel aktivite seçiniz..."
            onSelect={handleSelectFizik}
            onCustomAdd={handleCustomFizik}
            isLoading={isLoadingDefinitions}
          />
        </View>

        {/* Notlar */}
        <View style={styles.fieldContainer}>
          <View style={styles.labelContainer}>
            <FileText size={18} color="#667eea" />
            <Text style={styles.label}>Diyetisyen Notları</Text>
          </View>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            placeholder="Özel notlar, hatırlatmalar..."
            placeholderTextColor="#9ca3af"
            value={diet.dietitianNote}
            onChangeText={(text) => handleFieldChange("dietitianNote", text)}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: "hidden",
  },
  header: {
    backgroundColor: "#667eea",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  content: {
    padding: 20,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  labelContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginLeft: 8,
  },
  dateButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  dateText: {
    fontSize: 16,
    color: "#1f2937",
    fontWeight: "500",
  },
  textInput: {
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
  textArea: {
    minHeight: 100,
    paddingTop: 14,
  },
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
  placeholder: {
    color: "#9ca3af",
    fontWeight: "400",
  },
});
