import { Stack } from "expo-router";
import { useAuthStore } from "@/features/auth/stores/auth-store";
import { useEffect } from "react";
import { useRouter } from "expo-router";

export default function ClientLayout() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    console.log("🏠 Client Layout check:", {
      isAuthenticated,
      role: user?.role,
      isApproved: user?.isApproved,
    });

    // Redirect if not authenticated or not a client
    if (!isAuthenticated || user?.role !== "client") {
      console.log("❌ Not client or not authenticated, redirecting to login");
      router.replace("/(auth)/login");
      return;
    }

    // Redirect if client is not approved
    if (user?.role === "client" && !user?.isApproved) {
      console.log("⏸️ Client not approved, redirecting to pending approval");
      // Use router.push instead of replace to allow back navigation
      router.push("/pending-approval");
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

