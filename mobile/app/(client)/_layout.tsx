import { Stack } from "expo-router";
import { useAuthStore } from "@/features/auth/stores/auth-store";
import { useEffect } from "react";
import { useRouter } from "expo-router";

export default function ClientLayout() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    // Redirect if not authenticated or not a client
    if (!isAuthenticated || user?.role !== "client") {
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
        name="diets/index"
        options={{
          title: "Beslenme Programlarım",
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="diets/[id]"
        options={{
          title: "Diyet Detayı",
          headerShown: true,
        }}
      />
    </Stack>
  );
}
