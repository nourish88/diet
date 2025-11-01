import React, { useState } from "react";
import { View, TouchableOpacity, StyleSheet, Modal, Text } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  Home,
  UtensilsCrossed,
  MessageCircle,
  User,
  LogOut,
} from "lucide-react-native";
import { useAuthStore } from "@/features/auth/stores/auth-store";

export const ClientBottomNav: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const navItems = [
    {
      id: "home",
      route: "/(client)",
      icon: Home,
      label: "Anasayfa",
    },
    {
      id: "diets",
      route: "/(client)/diets",
      icon: UtensilsCrossed,
      label: "Diyetlerim",
    },
    {
      id: "messages",
      route: "/(client)/unread-messages",
      icon: MessageCircle,
      label: "Mesajlar",
    },
  ];

  const isActive = (route: string) => {
    if (route === "/(client)") {
      return pathname === "/(client)" || pathname === "/(client)/";
    }
    // For messages, only match exact route (not child routes)
    if (route === "/(client)/unread-messages") {
      return pathname === "/(client)/unread-messages";
    }
    // For diets, only match the list page, not detail pages
    if (route === "/(client)/diets") {
      return pathname === "/(client)/diets" || pathname === "/(client)/diets/";
    }
    return false;
  };

  const handleLogout = async () => {
    try {
      setShowUserMenu(false);
      await logout();
      router.replace("/(auth)/login");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  return (
    <>
      <View style={styles.container}>
        <LinearGradient colors={["#3b82f6", "#2563eb"]} style={styles.gradient}>
          <View style={styles.navContent}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.route);

              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.navItem, active && styles.activeNavItem]}
                  onPress={() => router.push(item.route as any)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.iconContainer,
                      active && styles.activeIconContainer,
                    ]}
                  >
                    <Icon
                      size={22}
                      color={active ? "#3b82f6" : "rgba(255, 255, 255, 0.7)"}
                    />
                  </View>
                  <Text
                    style={[
                      styles.navLabel,
                      active && styles.activeNavLabel,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {/* User Menu Button */}
            <TouchableOpacity
              style={styles.navItem}
              onPress={() => setShowUserMenu(true)}
              activeOpacity={0.7}
            >
              <View style={styles.iconContainer}>
                <User size={22} color="rgba(255, 255, 255, 0.7)" />
              </View>
              <Text style={styles.navLabel}>Profil</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>

      {/* User Menu Modal */}
      <Modal
        visible={showUserMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowUserMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowUserMenu(false)}
        >
          <View style={styles.userMenu}>
            <View style={styles.userMenuHeader}>
              <View style={styles.userMenuIconContainer}>
                <User size={24} color="#3b82f6" />
              </View>
              <View style={styles.userMenuDetails}>
                <Text style={styles.userMenuName}>
                  {user?.client?.name} {user?.client?.surname}
                </Text>
                <Text style={styles.userMenuEmail}>{user?.email}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.logoutMenuItem}
              onPress={handleLogout}
            >
              <LogOut size={20} color="#ef4444" />
              <Text style={styles.logoutText}>Çıkış Yap</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 90,
  },
  gradient: {
    flex: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingBottom: 34,
    paddingHorizontal: 12,
  },
  navContent: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    flex: 1,
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    flex: 1,
  },
  activeNavItem: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
  },
  activeIconContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
  },
  navLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
  },
  activeNavLabel: {
    color: "#ffffff",
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  userMenu: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  userMenuHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  userMenuIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  userMenuDetails: {
    flex: 1,
  },
  userMenuName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
  },
  userMenuEmail: {
    fontSize: 14,
    color: "#6b7280",
  },
  logoutMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: "#fef2f2",
    borderRadius: 12,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#ef4444",
    marginLeft: 12,
  },
});

