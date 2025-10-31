import React, { useState, useEffect, useCallback, useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { User } from "lucide-react-native";
import api from "@/core/api/client";
import Dropdown from "@/shared/components/Dropdown";

interface Client {
  id: number;
  name: string;
  surname: string;
  phoneNumber?: string;
}

interface ClientSelectorProps {
  selectedClientId: number | null;
  onSelectClient: (clientId: number) => void;
  isLoading?: boolean;
  placeholder?: string;
}

interface ClientsResponse {
  clients: Client[];
  total: number;
}

const ITEMS_PER_PAGE = 50;

export default function ClientSelector({
  selectedClientId,
  onSelectClient,
  isLoading = false,
  placeholder = "Danışan seçin...",
}: ClientSelectorProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const loadClients = useCallback(async (search: string = "") => {
    try {
      setIsLoadingClients(true);
      const queryParams = new URLSearchParams();
      queryParams.append("skip", "0");
      queryParams.append("take", ITEMS_PER_PAGE.toString());
      if (search) {
        queryParams.append("search", search);
      }

      const url = `/api/clients?${queryParams.toString()}`;
      const data: ClientsResponse = await api.get(url);
      setClients(data.clients || []);
    } catch (error) {
      console.error("Error loading clients:", error);
      setClients([]);
    } finally {
      setIsLoadingClients(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadClients("");
  }, [loadClients]);

  // Search handler
  const handleSearch = useCallback(
    (search: string) => {
      setSearchTerm(search);
      loadClients(search);
    },
    [loadClients]
  );

  // Convert clients to dropdown options
  const clientOptions = useMemo(() => {
    const opts = clients.map((client) => ({
      id: client.id,
      label: `${client.name} ${client.surname}`,
      value: client.id.toString(),
    }));

    // If selectedClientId exists but not in options, we need to load it
    // For now, just return the options we have
    return opts;
  }, [clients]);

  const selectedValue = selectedClientId?.toString() || null;

  const handleSelect = (value: string) => {
    const clientId = parseInt(value, 10);
    if (!isNaN(clientId)) {
      onSelectClient(clientId);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.labelContainer}>
        <User size={18} color="#667eea" />
        <Text style={styles.label}>Danışan</Text>
      </View>
      <Dropdown
        value={selectedValue}
        options={clientOptions}
        placeholder={placeholder}
        onSelect={handleSelect}
        isLoading={isLoadingClients}
        searchable={true}
        onSearch={handleSearch}
        searchPlaceholder="Danışan ara..."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  labelContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginLeft: 8,
  },
});
