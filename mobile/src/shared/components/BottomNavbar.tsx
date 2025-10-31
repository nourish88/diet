import React, { useState } from "react";
import { View, TouchableOpacity, StyleSheet, Modal, Text } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  Home,
  Users,
  ClipboardList,
  PlusCircle,
  User,
  LogOut,
} from "lucide-react-native";
import { useAuthStore } from "@/features/auth/stores/auth-store";

interface BottomNavbarProps {
  currentRoute?: string;
}

export const BottomNavbar: React.FC<BottomNavbarProps> = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const navItems = [
    {
      id: "home",
      route: "/(dietitian)",
      icon: Home,
      label: "Ana Sayfa",
    },
    {
      id: "clients",
      route: "/(dietitian)/clients",
      icon: Users,
      label: "Danışanlar",
    },
    {
      id: "diets",
      route: "/(dietitian)/diets",
      icon: ClipboardList,
      label: "Diyetler",
    },
    {
      id: "new-diet",
      route: "/(dietitian)/diets/new",
      icon: PlusCircle,
      label: "Yeni Diyet",
    },
  ];

  const isActive = (route: string) => {
    if (route === "/(dietitian)") {
      return pathname === "/(dietitian)" || pathname === "/(dietitian)/";
    }
    return pathname?.startsWith(route);
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
        <LinearGradient colors={["#667eea", "#764ba2"]} style={styles.gradient}>
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
                      size={24}
                      color={active ? "#667eea" : "rgba(255, 255, 255, 0.7)"}
                    />
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* User Menu Button */}
            <TouchableOpacity
              style={styles.userButton}
              onPress={() => setShowUserMenu(true)}
              activeOpacity={0.7}
            >
              <View style={styles.userIconContainer}>
                <User size={20} color="#667eea" />
              </View>
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
                <User size={24} color="#667eea" />
              </View>
              <View style={styles.userMenuDetails}>
                <Text style={styles.userMenuName}>Diyetisyen</Text>
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
    paddingTop: 12,
    paddingBottom: 34,
    paddingHorizontal: 16,
  },
  navContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flex: 1,
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 12,
    flex: 1,
  },
  activeNavItem: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  activeIconContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
  },
  userButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginLeft: 8,
  },
  userIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    justifyContent: "center",
    alignItems: "center",
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
    backgroundColor: "#f0f4ff",
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
