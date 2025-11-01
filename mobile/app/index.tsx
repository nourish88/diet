import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/features/auth/stores/auth-store";
import { Loading } from "@/shared/ui/Loading";

export default function IndexScreen() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    console.log("📍 Index.tsx routing check:", {
      isLoading,
      isAuthenticated,
      userRole: user?.role,
      isApproved: user?.isApproved,
      userEmail: user?.email,
    });

    if (!isLoading) {
      if (isAuthenticated && user) {
        console.log("✅ User is authenticated, role:", user.role);
        
        // Redirect based on user role
        if (user.role === "dietitian") {
          console.log("🔀 Redirecting to dietitian dashboard");
          router.replace("/(dietitian)");
        } else if (user.role === "client") {
          // Check if client is approved
          console.log("👤 Client role detected, isApproved:", user.isApproved);
          
          if (user.isApproved) {
            console.log("🔀 Redirecting to client dashboard");
            router.replace("/(client)");
          } else {
            console.log("🔀 Redirecting to pending approval screen");
            router.replace("/pending-approval");
          }
        } else {
          console.log("❌ Unknown role, redirecting to login");
          router.replace("/(auth)/login");
        }
      } else {
        console.log("❌ Not authenticated, redirecting to login");
        router.replace("/(auth)/login");
      }
    }
  }, [isAuthenticated, user, isLoading, router]);

  return <Loading text="Yönlendiriliyor..." />;
}

