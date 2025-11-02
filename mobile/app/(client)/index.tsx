import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/features/auth/stores/auth-store";
import { UtensilsCrossed, User, MessageCircle } from "lucide-react-native";
import api from "@/core/api/client";
import { ClientBottomNav } from "@/shared/components/ClientBottomNav";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "https://diet-six.vercel.app";

export default function ClientDashboard() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadUnreadCount();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [user?.client?.id]);

  const loadUnreadCount = async () => {
    try {
      if (!user?.client?.id) return;
      
      const response = await api.get(`/api/clients/${user.client.id}/unread-messages`);
      if (response.success) {
        setUnreadCount(response.totalUnread || 0);
      }
    } catch (error) {
      console.error("❌ Error loading unread count:", error);
    }
  };

  const goToDiets = () => {
    router.push("/(client)/diets/");
  };

  const goToUnreadMessages = () => {
    router.push("/(client)/unread-messages");
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Logo Card */}
        <View style={styles.logoCard}>
          <Image
            source={{
              uri: `${API_BASE_URL}/ezgi_evgin-removebg-preview.png`,
            }}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.welcomeText}>Hoş Geldiniz</Text>
          <Text style={styles.userName}>
            {user?.client?.name} {user?.client?.surname}
          </Text>
        </View>

        {/* User Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <User size={20} color="#6b7280" />
            <Text style={styles.infoLabel}>E-posta:</Text>
            <Text style={styles.infoValue}>{user?.email}</Text>
          </View>
          {user?.client?.phoneNumber && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Telefon:</Text>
              <Text style={styles.infoValue}>{user.client.phoneNumber}</Text>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hızlı Erişim</Text>

          <TouchableOpacity style={styles.actionCard} onPress={goToDiets}>
            <View style={styles.actionIconContainer}>
              <UtensilsCrossed size={32} color="#3b82f6" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Beslenme Programlarım</Text>
              <Text style={styles.actionDescription}>
                Diyetisyeninizin oluşturduğu programları görüntüleyin
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={goToUnreadMessages}>
            <View style={[styles.actionIconContainer, styles.messageIconContainer]}>
              <MessageCircle size={32} color="#8b5cf6" />
              {unreadCount > 0 && (
                <View style={styles.badgeContainer}>
                  <Text style={styles.badgeText}>{unreadCount}</Text>
                </View>
              )}
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Okunmamış Mesajlar</Text>
              <Text style={styles.actionDescription}>
                {unreadCount > 0
                  ? `${unreadCount} okunmamış mesajınız var`
                  : "Tüm mesajlarınızı okudunuz"}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoSectionTitle}>📱 Mobil Uygulama</Text>
          <Text style={styles.infoSectionText}>
            Diyetisyeninizin size özel hazırladığı beslenme programlarına
            buradan ulaşabilirsiniz.
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <ClientBottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  scrollView: {
    flex: 1,
    paddingBottom: 100, // Space for bottom navigation
  },
  logoCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    margin: 16,
    marginBottom: 8,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logo: {
    width: "100%",
    height: 80,
  },
  header: {
    padding: 20,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  welcomeText: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 4,
  },
  userName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  infoCard: {
    backgroundColor: "#ffffff",
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 14,
    color: "#111827",
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },
  actionCard: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  actionIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  actionContent: {
    flex: 1,
    justifyContent: "center",
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 18,
  },
  messageIconContainer: {
    backgroundColor: "#f3e8ff",
    position: "relative",
  },
  badgeContainer: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#ef4444",
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    paddingHorizontal: 6,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  badgeText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  infoSection: {
    margin: 16,
    padding: 16,
    backgroundColor: "#eff6ff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  infoSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e40af",
    marginBottom: 8,
  },
  infoSectionText: {
    fontSize: 14,
    color: "#1e40af",
    lineHeight: 20,
  },
});

