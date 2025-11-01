import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { useAuthStore } from "@/features/auth/stores/auth-store";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - Data bu süre boyunca fresh sayılır
      cacheTime: 10 * 60 * 1000, // 10 minutes - Cache'de bu kadar tutulur
      refetchOnMount: false, // Sayfa açılınca otomatik yenileme yapma
      refetchOnWindowFocus: false, // App focus olunca yenileme yapma
      refetchOnReconnect: false, // İnternet bağlantısı gelince yenileme yapma
      retry: 1,
    },
  },
});

export default function RootLayout() {
  const { syncUser } = useAuthStore();

  useEffect(() => {
    // Sync user on app start
    syncUser();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen
          name="pending-approval"
          options={{
            title: "Onay Bekleniyor",
            headerShown: false,
          }}
        />
      </Stack>
      <StatusBar style="auto" />
    </QueryClientProvider>
  );
}
