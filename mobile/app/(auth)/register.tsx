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

export default function RegisterScreen() {
  const router = useRouter();
  const { register, isLoading, user } = useAuthStore();
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [referenceCode, setReferenceCode] = useState<string>("");
  const [showReferenceCode, setShowReferenceCode] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
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
    if (!formData.confirmPassword) {
      setError("Şifre tekrarı gereklidir");
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Şifreler eşleşmiyor");
      return false;
    }
    return true;
  };

  const onSubmit = async () => {
    try {
      setError("");
      setSuccess("");
      if (!validateForm()) return;

      await register(formData.email, formData.password, "client");
      
      // Get the user to access reference code
      const currentUser = useAuthStore.getState().user;
      if (currentUser?.referenceCode) {
        setReferenceCode(currentUser.referenceCode);
        setShowReferenceCode(true);
        setSuccess("Kayıt başarılı! Referans kodunuzu diyetisyeninize iletin.");
      } else {
        setSuccess("Kayıt başarılı! Onay bekleniyor...");
        setTimeout(() => {
          router.replace("/(auth)/login");
        }, 2000);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Kayıt olurken bir hata oluştu";
      setError(errorMessage);
    }
  };

  const goToLogin = () => {
    router.push("/(auth)/login");
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Kayıt olunuyor...</Text>
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
          <Text style={styles.subtitle}>Yeni bir hesap oluşturun</Text>

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

            <Text style={styles.label}>Şifre Tekrarı</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              secureTextEntry
              autoCapitalize="none"
              onChangeText={(value) =>
                handleInputChange("confirmPassword", value)
              }
              value={formData.confirmPassword}
            />

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={onSubmit}
              disabled={isLoading}
            >
              <Text style={styles.primaryButtonText}>Kayıt Ol</Text>
            </TouchableOpacity>

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {success && (
              <View style={styles.successContainer}>
                <Text style={styles.successText}>{success}</Text>
              </View>
            )}

            {showReferenceCode && referenceCode && (
              <View style={styles.referenceCodeContainer}>
                <Text style={styles.referenceCodeTitle}>
                  Referans Kodunuz
                </Text>
                <View style={styles.referenceCodeBox}>
                  <Text style={styles.referenceCodeText}>{referenceCode}</Text>
                </View>
                <Text style={styles.referenceCodeInfo}>
                  Bu kodu diyetisyeninize iletin. Diyetisyeniniz bu kod ile
                  sizi kendi danışan listesine ekleyecektir.
                </Text>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => router.replace("/(auth)/login")}
                >
                  <Text style={styles.primaryButtonText}>Giriş Sayfasına Git</Text>
                </TouchableOpacity>
              </View>
            )}

            {!showReferenceCode && (
              <View style={styles.loginContainer}>
                <Text style={styles.loginText}>Zaten hesabınız var mı?</Text>
                <TouchableOpacity
                  style={styles.outlineButton}
                  onPress={goToLogin}
                >
                  <Text style={styles.outlineButtonText}>Giriş Yap</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.infoContainer}>
              <Text style={styles.infoText}>
                Kayıt olduktan sonra diyetisyeniniz tarafından onaylanmanız
                gerekmektedir. Onay süreci hakkında bilgi için diyetisyeninizle
                iletişime geçin.
              </Text>
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
  successContainer: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  successText: {
    color: "#16a34a",
    textAlign: "center",
    fontSize: 14,
  },
  loginContainer: {
    alignItems: "center",
  },
  loginText: {
    color: "#64748b",
    marginBottom: 8,
    fontSize: 14,
  },
  infoContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: "#eff6ff",
    borderRadius: 8,
  },
  infoText: {
    color: "#1e40af",
    textAlign: "center",
    fontSize: 12,
    lineHeight: 18,
  },
  referenceCodeContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: "#eff6ff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#3b82f6",
  },
  referenceCodeTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e40af",
    marginBottom: 12,
    textAlign: "center",
  },
  referenceCodeBox: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#3b82f6",
    marginBottom: 12,
  },
  referenceCodeText: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1e40af",
    textAlign: "center",
    letterSpacing: 2,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  referenceCodeInfo: {
    fontSize: 13,
    color: "#1e40af",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
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
