import { Stack } from "expo-router";
import { useAuthStore } from "@/features/auth/stores/auth-store";
import { useEffect } from "react";
import { useRouter } from "expo-router";

export default function DietitianLayout() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    // Redirect if not authenticated or not a dietitian
    if (!isAuthenticated || user?.role !== "dietitian") {
      router.replace("/(auth)/login");
    }
  }, [isAuthenticated, user, router]);

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: "#fff",
        },
        headerTintColor: "#1f2937",
        headerTitleStyle: {
          fontWeight: "600",
          fontSize: 18,
        },
        headerShadowVisible: true,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="clients/index"
        options={{
          title: "Danışanlar",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="clients/[id]"
        options={{
          title: "Danışan Detayı",
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="clients/new"
        options={{
          title: "Yeni Danışan",
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="diets/index"
        options={{
          title: "Beslenme Programları",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="diets/new"
        options={{
          title: "Yeni Diyet",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="diets/create"
        options={{
          title: "Diyet Oluştur",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="diets/[id]"
        options={{
          title: "Diyet Detayı",
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="diets/from-template"
        options={{
          title: "Şablondan Diyet",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="templates/index"
        options={{
          title: "Şablonlar",
          headerShown: true,
        }}
      />
    </Stack>
  );
}


