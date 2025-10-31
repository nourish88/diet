import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "../features/auth/stores/auth-store";
import { api } from "../core/api/client";

export default function NewClientScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [formData, setFormData] = useState({
    name: "",
    surname: "",
    phoneNumber: "",
    birthdate: "",
    notes: "",
    illness: "",
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError("Ad gerekli");
      return false;
    }
    if (!formData.surname.trim()) {
      setError("Soyad gerekli");
      return false;
    }
    return true;
  };

  const onSubmit = async () => {
    try {
      setIsLoading(true);
      setError("");

      if (!validateForm()) return;

      const clientData = {
        ...formData,
        dietitianId: user?.id,
        birthdate: formData.birthdate
          ? new Date(formData.birthdate).toISOString()
          : null,
      };

      await api.post("/api/clients", clientData);

      // Navigate back to clients list
      router.back();
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Danışan oluşturulurken bir hata oluştu";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Danışan oluşturuluyor...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.card}>
            <Text style={styles.title}>Yeni Danışan Ekle</Text>
            <Text style={styles.subtitle}>Danışan bilgilerini giriniz</Text>
          </View>

          {/* Form */}
          <View style={styles.card}>
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.formContainer}>
              <Text style={styles.label}>Ad *</Text>
              <TextInput
                style={styles.input}
                placeholder="Danışanın adını giriniz"
                value={formData.name}
                onChangeText={(value) => handleInputChange("name", value)}
              />

              <Text style={styles.label}>Soyad *</Text>
              <TextInput
                style={styles.input}
                placeholder="Danışanın soyadını giriniz"
                value={formData.surname}
                onChangeText={(value) => handleInputChange("surname", value)}
              />

              <Text style={styles.label}>Telefon Numarası</Text>
              <TextInput
                style={styles.input}
                placeholder="Telefon numarasını giriniz"
                value={formData.phoneNumber}
                onChangeText={(value) =>
                  handleInputChange("phoneNumber", value)
                }
                keyboardType="phone-pad"
              />

              <Text style={styles.label}>Doğum Tarihi</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD formatında giriniz"
                value={formData.birthdate}
                onChangeText={(value) => handleInputChange("birthdate", value)}
              />

              <Text style={styles.label}>Hastalık Durumu</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                placeholder="Varsa hastalık durumunu belirtiniz"
                value={formData.illness}
                onChangeText={(value) => handleInputChange("illness", value)}
                multiline
                numberOfLines={3}
              />

              <Text style={styles.label}>Notlar</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                placeholder="Ek notlarınızı yazınız"
                value={formData.notes}
                onChangeText={(value) => handleInputChange("notes", value)}
                multiline
                numberOfLines={4}
              />

              <TouchableOpacity
                style={styles.submitButton}
                onPress={onSubmit}
                disabled={isLoading}
              >
                <Text style={styles.submitButtonText}>Danışanı Kaydet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    padding: 16,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#64748b",
  },
  formContainer: {
    gap: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    width: "100%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    fontSize: 16,
    backgroundColor: "white",
    color: "#111827",
  },
  multilineInput: {
    height: 80,
    textAlignVertical: "top",
  },
  submitButton: {
    backgroundColor: "#3b82f6",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 24,
  },
  submitButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  errorContainer: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: "#dc2626",
    textAlign: "center",
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#64748b",
  },
});
