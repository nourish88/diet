import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { BottomNavbar } from "@/shared/components/BottomNavbar";

import {
  PlusCircle,
  FileText,
  ClipboardList,
  Users,
} from "lucide-react-native";

const { width } = Dimensions.get("window");
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "https://diet-six.vercel.app";

export default function NewDietScreen() {
  const router = useRouter();

  const options = [
    {
      id: "new",
      title: "Yeni Diyet Oluştur",
      subtitle: "Sıfırdan yeni bir diyet programı oluşturun",
      icon: PlusCircle,
      color: "#667eea",
      route: "/(dietitian)/diets/create" as any,
    },
    {
      id: "template",
      title: "Şablondan Oluştur",
      subtitle: "Hazır şablonlardan diyet oluşturun",
      icon: FileText,
      color: "#10b981",
      route: "/(dietitian)/diets/from-template",
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Logo Card */}
          <View style={styles.logoCard}>
            <Image
              source={{
                uri: `${API_BASE_URL}/ezgi_evgin.png`,
              }}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.sectionTitle}>Diyet Oluşturma Yöntemi</Text>

          <View style={styles.optionsList}>
            {options.map((option, index) => {
              const Icon = option.icon;

              return (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.optionCard,
                    { marginTop: index === 0 ? 0 : 16 },
                  ]}
                  onPress={() => router.push(option.route as any)}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={["#fff", "#f8fafc"]}
                    style={styles.optionCardGradient}
                  >
                    <View style={styles.optionCardContent}>
                      <View style={styles.optionHeader}>
                        <View
                          style={[
                            styles.optionIcon,
                            { backgroundColor: `${option.color}20` },
                          ]}
                        >
                          <Icon size={24} color={option.color} />
                        </View>
                        <View style={styles.optionInfo}>
                          <Text style={styles.optionTitle}>{option.title}</Text>
                          <Text style={styles.optionSubtitle}>
                            {option.subtitle}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Quick Actions */}
          <Text style={styles.sectionTitle}>Hızlı İşlemler</Text>

          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => router.push("/(dietitian)/clients")}
            >
              <Users size={24} color="#fff" />
              <Text style={styles.quickActionText}>Danışanlar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => router.push("/(dietitian)/diets")}
            >
              <ClipboardList size={24} color="#fff" />
              <Text style={styles.quickActionText}>Diyetler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <BottomNavbar />
    </SafeAreaView>
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
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 120,
  },
  logoCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 16,
  },
  optionsList: {
    marginBottom: 32,
  },
  optionCard: {
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  optionCardGradient: {
    borderRadius: 16,
    padding: 20,
  },
  optionCardContent: {
    flex: 1,
  },
  optionHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
  },
  optionSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 20,
  },
  quickActionsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: "#667eea",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
    marginTop: 8,
    textAlign: "center",
  },
});
