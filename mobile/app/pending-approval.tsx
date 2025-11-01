import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/features/auth/stores/auth-store";
import { Clock, AlertCircle, Copy, CheckCircle } from "lucide-react-native";
import { useState } from "react";
import * as Clipboard from "expo-clipboard";

export default function PendingApprovalScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [copied, setCopied] = useState(false);

  const handleCopyReferenceCode = async () => {
    if (user?.referenceCode) {
      await Clipboard.setStringAsync(user.referenceCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/(auth)/login");
  };

  if (!user) {
    return null;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Clock size={80} color="#3b82f6" />
        </View>

        {/* Title */}
        <Text style={styles.title}>Onay Bekleniyor</Text>

        {/* Description */}
        <Text style={styles.description}>
          Hesabınız başarıyla oluşturuldu. Diyetisyeninizin sizi onaylaması
          bekleniyor.
        </Text>

        {/* Reference Code Card */}
        {user.referenceCode && (
          <View style={styles.referenceCard}>
            <Text style={styles.referenceLabel}>Referans Kodunuz</Text>
            
            <View style={styles.referenceCodeBox}>
              <Text style={styles.referenceCode}>{user.referenceCode}</Text>
            </View>

            <TouchableOpacity
              style={styles.copyButton}
              onPress={handleCopyReferenceCode}
            >
              {copied ? (
                <>
                  <CheckCircle size={20} color="#10b981" />
                  <Text style={styles.copiedText}>Kopyalandı!</Text>
                </>
              ) : (
                <>
                  <Copy size={20} color="#3b82f6" />
                  <Text style={styles.copyButtonText}>Kopyala</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Instructions */}
        <View style={styles.instructionsCard}>
          <View style={styles.instructionHeader}>
            <AlertCircle size={24} color="#3b82f6" />
            <Text style={styles.instructionTitle}>Sonraki Adımlar</Text>
          </View>

          <View style={styles.instructionList}>
            <View style={styles.instructionItem}>
              <Text style={styles.instructionNumber}>1</Text>
              <Text style={styles.instructionText}>
                Referans kodunuzu diyetisyeninizle paylaşın
              </Text>
            </View>

            <View style={styles.instructionItem}>
              <Text style={styles.instructionNumber}>2</Text>
              <Text style={styles.instructionText}>
                Diyetisyeniniz sizi kendi sistemine ekleyecektir
              </Text>
            </View>

            <View style={styles.instructionItem}>
              <Text style={styles.instructionNumber}>3</Text>
              <Text style={styles.instructionText}>
                Onaylandığınızda hesabınıza erişim sağlayabilirsiniz
              </Text>
            </View>
          </View>
        </View>

        {/* Contact Info */}
        <View style={styles.contactCard}>
          <Text style={styles.contactText}>
            Eğer bir sorun yaşıyorsanız, lütfen diyetisyeninizle iletişime
            geçin.
          </Text>
          <Text style={styles.emailText}>Giriş E-postası: {user.email}</Text>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Çıkış Yap</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  content: {
    flex: 1,
    padding: 24,
    alignItems: "center",
  },
  iconContainer: {
    marginTop: 60,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: 16,
    textAlign: "center",
  },
  description: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  referenceCard: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 2,
    borderColor: "#3b82f6",
  },
  referenceLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
    marginBottom: 12,
    textAlign: "center",
  },
  referenceCodeBox: {
    backgroundColor: "#eff6ff",
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#bfdbfe",
  },
  referenceCode: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1e40af",
    textAlign: "center",
    letterSpacing: 3,
    fontFamily: "monospace",
  },
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eff6ff",
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  copyButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#3b82f6",
  },
  copiedText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#10b981",
  },
  instructionsCard: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 24,
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
  instructionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 12,
  },
  instructionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
  },
  instructionList: {
    gap: 16,
  },
  instructionItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
  },
  instructionNumber: {
    width: 28,
    height: 28,
    backgroundColor: "#3b82f6",
    borderRadius: 14,
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 28,
  },
  instructionText: {
    flex: 1,
    fontSize: 15,
    color: "#475569",
    lineHeight: 22,
  },
  contactCard: {
    width: "100%",
    backgroundColor: "#fef3c7",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#fcd34d",
  },
  contactText: {
    fontSize: 14,
    color: "#92400e",
    textAlign: "center",
    marginBottom: 8,
    lineHeight: 20,
  },
  emailText: {
    fontSize: 13,
    color: "#78350f",
    textAlign: "center",
    fontWeight: "600",
  },
  logoutButton: {
    width: "100%",
    backgroundColor: "#ef4444",
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 32,
  },
  logoutButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
});


