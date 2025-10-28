import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../services/api";

export default function ClientDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const clientId = parseInt(id as string);

  const { data: clientData, isLoading: clientLoading } = useQuery({
    queryKey: ["client", clientId],
    queryFn: () => apiClient.getClient(clientId),
  });

  const { data: dietsData, isLoading: dietsLoading } = useQuery({
    queryKey: ["client-diets", clientId],
    queryFn: () => apiClient.getDiets({ clientId }),
  });

  const client = clientData?.client;
  const diets = dietsData?.diets || [];

  const handleSendViaWhatsApp = async (dietId: number) => {
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/whatsapp/send-diet`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientId,
            dietId,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        // Open WhatsApp with the generated URL
        const canOpen = await Linking.canOpenURL(data.whatsappURL);
        if (canOpen) {
          await Linking.openURL(data.whatsappURL);
          Alert.alert(
            "Success",
            "WhatsApp opened! Tap 'Send' to deliver the message."
          );
        } else {
          Alert.alert("Error", "WhatsApp is not installed on this device.");
        }
      } else {
        Alert.alert("Error", data.error || "Failed to generate WhatsApp URL");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to open WhatsApp. Please try again.");
    }
  };

  if (clientLoading || dietsLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!client) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Client not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Client Information</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Name:</Text>
            <Text style={styles.infoValue}>
              {client.name} {client.surname}
            </Text>
          </View>
          {client.phoneNumber && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone:</Text>
              <Text style={styles.infoValue}>{client.phoneNumber}</Text>
            </View>
          )}
          {client.birthdate && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Birthdate:</Text>
              <Text style={styles.infoValue}>
                {new Date(client.birthdate).toLocaleDateString()}
              </Text>
            </View>
          )}
          {client.gender !== null && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Gender:</Text>
              <Text style={styles.infoValue}>
                {client.gender === 1 ? "Male" : "Female"}
              </Text>
            </View>
          )}
          {client.notes && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Notes:</Text>
              <Text style={styles.infoValue}>{client.notes}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Diet History</Text>
          <Text style={styles.dietCount}>
            {diets.length} diet{diets.length !== 1 ? "s" : ""}
          </Text>
        </View>

        {diets.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No diets yet</Text>
            <Text style={styles.emptySubtext}>
              Create a diet plan for this client
            </Text>
          </View>
        ) : (
          diets.map((diet: any) => (
            <View key={diet.id} style={styles.dietCard}>
              <TouchableOpacity
                style={styles.dietInfo}
                onPress={() => router.push(`/(dietitian)/diets/${diet.id}`)}
              >
                <Text style={styles.dietDate}>
                  {diet.tarih
                    ? new Date(diet.tarih).toLocaleDateString()
                    : "No date"}
                </Text>
                {diet.hedef && (
                  <Text style={styles.dietGoal} numberOfLines={2}>
                    {diet.hedef}
                  </Text>
                )}
                <Text style={styles.dietMeals}>
                  {diet.oguns?.length || 0} meal
                  {diet.oguns?.length !== 1 ? "s" : ""}
                </Text>
              </TouchableOpacity>

              <View style={styles.dietActions}>
                <TouchableOpacity
                  style={styles.whatsappButton}
                  onPress={() => handleSendViaWhatsApp(diet.id)}
                >
                  <Text style={styles.whatsappButtonText}>📱 WhatsApp</Text>
                </TouchableOpacity>
                <Text style={styles.arrow}>→</Text>
              </View>
            </View>
          ))
        )}
      </View>

      <TouchableOpacity
        style={styles.createButton}
        onPress={() =>
          router.push({
            pathname: "/(dietitian)/diets/new",
            params: { clientId: clientId.toString() },
          })
        }
      >
        <Text style={styles.createButtonText}>+ Create New Diet</Text>
      </TouchableOpacity>
    </ScrollView>
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
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  dietCount: {
    fontSize: 14,
    color: "#666",
  },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoRow: {
    flexDirection: "row",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
    width: 100,
  },
  infoValue: {
    fontSize: 16,
    color: "#333",
    flex: 1,
  },
  dietCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
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
  dietActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  whatsappButton: {
    backgroundColor: "#25D366",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  whatsappButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  arrow: {
    fontSize: 24,
    color: "#007AFF",
  },
  emptyContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 32,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#ccc",
  },
  createButton: {
    backgroundColor: "#007AFF",
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  createButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  errorText: {
    fontSize: 16,
    color: "#ff3b30",
  },
});
