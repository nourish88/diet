import React from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../hooks/useAuth";
import { apiClient } from "../../services/api";
import * as Clipboard from "expo-clipboard";

export default function ClientHomeScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ["client-diets", user?.client?.id],
    queryFn: () => apiClient.getDiets({ clientId: user?.client?.id }),
    enabled: !!user?.client?.id && !!user?.isApproved,
  });

  const diets = data?.diets || [];

  // Show pending approval screen if not approved
  if (!user?.isApproved) {
    return (
      <View style={styles.container}>
        <View style={styles.pendingContainer}>
          <Text style={styles.pendingTitle}>Account Pending Approval</Text>

          <View style={styles.codeCard}>
            <Text style={styles.codeLabel}>Your Reference Code:</Text>
            <Text style={styles.referenceCode}>{user?.referenceCode}</Text>

            <TouchableOpacity
              style={styles.copyButton}
              onPress={async () => {
                if (user?.referenceCode) {
                  await Clipboard.setStringAsync(user.referenceCode);
                  Alert.alert("Copied!", "Send this code to your dietitian");
                }
              }}
            >
              <Text style={styles.copyButtonText}>Copy Code</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.instructions}>
            Send this code to your dietitian via WhatsApp or SMS. Your account
            will be activated once approved.
          </Text>

          <TouchableOpacity
            style={styles.refreshButton}
            onPress={() => {
              // Refresh user data
              window.location.reload();
            }}
          >
            <Text style={styles.refreshButtonText}>Refresh Status</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const renderDiet = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.dietCard}
      onPress={() => router.push(`/(client)/diets/${item.id}`)}
    >
      <View style={styles.dietInfo}>
        <Text style={styles.dietDate}>
          {item.tarih ? new Date(item.tarih).toLocaleDateString() : "No date"}
        </Text>
        {item.hedef && (
          <Text style={styles.dietGoal} numberOfLines={2}>
            Goal: {item.hedef}
          </Text>
        )}
        <Text style={styles.dietMeals}>
          {item.oguns?.length || 0} meal{item.oguns?.length !== 1 ? "s" : ""}
        </Text>
      </View>
      <Text style={styles.arrow}>→</Text>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Error loading diets</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Diets</Text>
        <Text style={styles.subtitle}>
          {diets.length} diet plan{diets.length !== 1 ? "s" : ""}
        </Text>
      </View>

      <FlatList
        data={diets}
        renderItem={renderDiet}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No diets yet</Text>
            <Text style={styles.emptySubtext}>
              Your dietitian will create a diet plan for you
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    backgroundColor: "#fff",
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginTop: 4,
  },
  listContainer: {
    padding: 16,
  },
  dietCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dietInfo: {
    flex: 1,
  },
  dietDate: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  dietGoal: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  dietMeals: {
    fontSize: 12,
    color: "#999",
  },
  arrow: {
    fontSize: 24,
    color: "#007AFF",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#999",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#ccc",
    textAlign: "center",
  },
  errorText: {
    fontSize: 16,
    color: "#ff3b30",
  },
  pendingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  pendingTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 30,
    textAlign: "center",
  },
  codeCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 280,
  },
  codeLabel: {
    fontSize: 16,
    color: "#666",
    marginBottom: 10,
  },
  referenceCode: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#007AFF",
    marginBottom: 15,
    letterSpacing: 2,
  },
  copyButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  copyButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  instructions: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 30,
  },
  refreshButton: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: "#333",
    fontSize: 16,
    fontWeight: "600",
  },
});
