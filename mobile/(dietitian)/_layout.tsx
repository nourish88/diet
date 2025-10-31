import { Stack } from "expo-router";
import { useAuthStore } from "../features/auth/stores/auth-store";
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
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: "Dashboard",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="clients/index"
        options={{
          title: "Danışanlar",
          headerShown: true,
          headerBackTitle: "Geri",
        }}
      />
      <Stack.Screen
        name="clients/[id]"
        options={{
          title: "Danışan Detayı",
          headerShown: true,
          headerBackTitle: "Geri",
        }}
      />
      <Stack.Screen
        name="clients/new"
        options={{
          title: "Yeni Danışan",
          headerShown: true,
          headerBackTitle: "Geri",
        }}
      />
      <Stack.Screen
        name="diets/index"
        options={{
          title: "Beslenme Programları",
          headerShown: true,
          headerBackTitle: "Geri",
        }}
      />
      <Stack.Screen
        name="diets/new"
        options={{
          title: "Yeni Diyet",
          headerShown: true,
          headerBackTitle: "Geri",
        }}
      />
      <Stack.Screen
        name="diets/[id]"
        options={{
          title: "Diyet Detayı",
          headerShown: true,
          headerBackTitle: "Geri",
        }}
      />
      <Stack.Screen
        name="diets/from-template"
        options={{
          title: "Şablondan Diyet",
          headerShown: true,
          headerBackTitle: "Geri",
        }}
      />
      <Stack.Screen
        name="templates/index"
        options={{
          title: "Şablonlar",
          headerShown: true,
          headerBackTitle: "Geri",
        }}
      />
    </Stack>
  );
}
