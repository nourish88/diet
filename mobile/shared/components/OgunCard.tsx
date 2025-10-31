import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import {
  ChevronDown,
  ChevronUp,
  Clock,
  Plus,
  Trash2,
  Sparkles,
} from "lucide-react-native";
import MenuItemInput from "./MenuItemInput";
import { LinearGradient } from "expo-linear-gradient";

interface OgunData {
  name: string;
  time: string;
  detail: string;
  items: Array<{
    besin: string;
    miktar: string;
    birim: string;
  }>;
}

interface OgunCardProps {
  ogun: OgunData;
  index: number;
  onOgunChange: (field: keyof OgunData, value: string) => void;
  onMenuItemChange: (itemIndex: number, field: string, value: string) => void;
  onAddMenuItem: () => void;
  onDeleteMenuItem: (itemIndex: number) => void;
  onDeleteOgun?: () => void;
  onApplyPreset?: () => void;
}

export default function OgunCard({
  ogun,
  index,
  onOgunChange,
  onMenuItemChange,
  onAddMenuItem,
  onDeleteMenuItem,
  onDeleteOgun,
  onApplyPreset,
}: OgunCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <View style={styles.container}>
      {/* Ogun Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={["#667eea", "#764ba2"]}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <View style={styles.iconContainer}>
                <Clock size={18} color="#fff" />
              </View>
              <View style={styles.headerTextContainer}>
                <TextInput
                  style={styles.ogunNameInput}
                  value={ogun.name}
                  onChangeText={(text) => onOgunChange("name", text)}
                  placeholder="Öğün adı"
                  placeholderTextColor="rgba(255, 255, 255, 0.8)"
                  onPressIn={(e) => e.stopPropagation()}
                />
                <View style={styles.timeContainer}>
                  <TextInput
                    style={styles.timeInput}
                    value={ogun.time}
                    onChangeText={(text) => onOgunChange("time", text)}
                    placeholder="00:00"
                    placeholderTextColor="rgba(255, 255, 255, 0.7)"
                    keyboardType="numeric"
                    maxLength={5}
                    onPressIn={(e) => e.stopPropagation()}
                  />
                </View>
              </View>
            </View>
            <View style={styles.headerRight}>
              {onApplyPreset && (
                <TouchableOpacity
                  style={styles.presetButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    onApplyPreset();
                  }}
                >
                  <Sparkles size={16} color="#fff" />
                </TouchableOpacity>
              )}
              {onDeleteOgun && (
                <TouchableOpacity
                  style={styles.deleteHeaderButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    onDeleteOgun();
                  }}
                >
                  <Trash2 size={16} color="#fff" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => setIsExpanded(!isExpanded)}
                style={styles.expandButton}
              >
                {isExpanded ? (
                  <ChevronUp size={20} color="#fff" />
                ) : (
                  <ChevronDown size={20} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>

      {/* Ogun Content */}
      {isExpanded && (
        <View style={styles.content}>
          {/* Menu Items */}
          {ogun.items.map((item, itemIndex) => (
            <MenuItemInput
              key={itemIndex}
              item={item}
              onItemChange={(field, value) =>
                onMenuItemChange(itemIndex, field, value)
              }
              onDelete={() => onDeleteMenuItem(itemIndex)}
            />
          ))}

          {/* Add Menu Item Button */}
          <TouchableOpacity
            style={styles.addMenuItemButton}
            onPress={onAddMenuItem}
          >
            <Plus size={20} color="#667eea" />
            <Text style={styles.addMenuItemText}>Menu Item Ekle</Text>
          </TouchableOpacity>

          {/* Detail Notes */}
          <View style={styles.detailContainer}>
            <Text style={styles.detailLabel}>Notlar</Text>
            <TextInput
              style={styles.detailInput}
              placeholder="Öğün için özel notlar..."
              placeholderTextColor="#9ca3af"
              value={ogun.detail}
              onChangeText={(text) => onOgunChange("detail", text)}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    backgroundColor: "#fff",
  },
  header: {
    overflow: "hidden",
  },
  headerGradient: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  ogunNameInput: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
    minHeight: 24,
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  timeInput: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "500",
    minWidth: 60,
    minHeight: 20,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  presetButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  deleteHeaderButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(239, 68, 68, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  expandButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    padding: 20,
    backgroundColor: "#fff",
  },
  addMenuItemButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f4ff",
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e0e7ff",
    borderStyle: "dashed",
  },
  addMenuItemText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "600",
    color: "#667eea",
  },
  detailContainer: {
    marginTop: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  detailInput: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: "#1f2937",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    minHeight: 80,
  },
});
