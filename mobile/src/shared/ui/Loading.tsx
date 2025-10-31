import React from "react";
import { View, ActivityIndicator, Text, ViewProps, StyleSheet } from "react-native";

interface LoadingProps extends ViewProps {
  text?: string;
  size?: "small" | "large";
}

export const Loading: React.FC<LoadingProps> = ({
  text = "Yükleniyor...",
  size = "large",
  style,
  ...props
}) => {
  return (
    <View style={[styles.container, style]} {...props}>
      <ActivityIndicator size={size} color="#3b82f6" style={styles.spinner} />
      {text && <Text style={styles.text}>{text}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  spinner: {
    marginBottom: 16,
  },
  text: {
    color: "#6b7280",
    textAlign: "center",
    fontSize: 14,
  },
});

export default Loading;
