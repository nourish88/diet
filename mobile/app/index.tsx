import { Redirect } from "expo-router";
import { useAuth } from "../hooks/useAuth";
import { ActivityIndicator, View } from "react-native";

export default function Index() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  // Redirect based on user role
  if (user.role === "dietitian") {
    return <Redirect href="/(dietitian)" />;
  } else {
    return <Redirect href="/(client)" />;
  }
}

