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
import { useAuthStore } from "@/features/auth/stores/auth-store";

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const [error, setError] = useState<string>("");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.email) {
      setError("E-posta adresi gereklidir");
      return false;
    }
    if (!formData.email.includes("@")) {
      setError("Geçerli bir e-posta adresi giriniz");
      return false;
    }
    if (!formData.password) {
      setError("Şifre gereklidir");
      return false;
    }
    if (formData.password.length < 6) {
      setError("Şifre en az 6 karakter olmalıdır");
      return false;
    }
    return true;
  };

  const onSubmit = async () => {
    try {
      setError("");
      if (!validateForm()) return;

      await login(formData.email, formData.password);
      router.replace("/(dietitian)");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Giriş yapılırken bir hata oluştu";
      setError(errorMessage);
    }
  };

  const goToRegister = () => {
    router.push("/(auth)/register");
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Giriş yapılıyor...</Text>
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
          <Text style={styles.title}>Diet App</Text>
          <Text style={styles.subtitle}>Hesabınıza giriş yapın</Text>

          <View style={styles.card}>
            <Text style={styles.label}>E-posta</Text>
            <TextInput
              style={styles.input}
              placeholder="email@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={(value) => handleInputChange("email", value)}
              value={formData.email}
            />

            <Text style={styles.label}>Şifre</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              secureTextEntry
              autoCapitalize="none"
              onChangeText={(value) => handleInputChange("password", value)}
              value={formData.password}
            />

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={onSubmit}
              disabled={isLoading}
            >
              <Text style={styles.primaryButtonText}>Giriş Yap</Text>
            </TouchableOpacity>

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.registerContainer}>
              <Text style={styles.registerText}>Hesabınız yok mu?</Text>
              <TouchableOpacity
                style={styles.outlineButton}
                onPress={goToRegister}
              >
                <Text style={styles.outlineButtonText}>Kayıt Ol</Text>
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
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: "800",
    color: "#3b82f6",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: "#64748b",
    marginBottom: 40,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
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
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: "#3b82f6",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 16,
  },
  primaryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: "#3b82f6",
    backgroundColor: "transparent",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
    width: "100%",
  },
  outlineButtonText: {
    color: "#3b82f6",
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
  registerContainer: {
    alignItems: "center",
  },
  registerText: {
    color: "#64748b",
    marginBottom: 8,
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
