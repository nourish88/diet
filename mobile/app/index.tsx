import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/features/auth/stores/auth-store";
import { Loading } from "@/shared/ui/Loading";

export default function IndexScreen() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated && user) {
        // Redirect based on user role
        if (user.role === "dietitian") {
          router.replace("/(dietitian)");
        } else if (user.role === "client") {
          router.replace("/(client)");
        } else {
          router.replace("/(auth)/login");
        }
      } else {
        router.replace("/(auth)/login");
      }
    }
  }, [isAuthenticated, user, isLoading, router]);

  return <Loading text="Yönlendiriliyor..." />;
}
