import { Stack, useRouter, useSegments } from "expo-router";
import { useAuthStore } from "@/features/auth/stores/auth-store";
import { useEffect } from "react";
import { consentRequired } from "@/core/config/kvkk-consent";

export default function ClientLayout() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();

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
      router.push("/pending-approval");
      return;
    }

    const c = user?.client as
      | {
          kvkkPortalConsentAt?: string | null;
          kvkkPortalConsentVersion?: string | null;
        }
      | null
      | undefined;
    const needsKvkk = consentRequired(
      c?.kvkkPortalConsentAt,
      c?.kvkkPortalConsentVersion
    );
    const onKvkkScreen = segments.some((s) => s === "kvkk-onay");

    if (needsKvkk && !onKvkkScreen) {
      router.replace("/(client)/kvkk-onay");
      return;
    }
    if (!needsKvkk && onKvkkScreen) {
      router.replace("/(client)");
    }
  }, [isAuthenticated, user, router, segments]);

  return (
    <Stack>
      <Stack.Screen
        name="kvkk-onay"
        options={{
          title: "KVKK Onayı",
          headerShown: false,
        }}
      />
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




