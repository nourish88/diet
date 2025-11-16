"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

interface ApiError {
  status?: number;
  message?: string;
  error?: string;
}

export default function QueryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 2 * 60 * 1000, // 2 minutes (increased from 1 minute)
            gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime, data kept in cache)
            refetchOnWindowFocus: false,
            refetchOnMount: true,
            refetchOnReconnect: true,
            retry: (failureCount, error: unknown) => {
              const apiError = error as ApiError;
              // Don't retry on 401/403 (auth errors)
              if (apiError?.status === 401 || apiError?.status === 403) {
                return false;
              }
              // Retry up to 3 times for other errors
              return failureCount < 3;
            },
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
          },
          mutations: {
            retry: (failureCount, error: unknown) => {
              const apiError = error as ApiError;
              // Don't retry mutations on 401/403 (auth errors)
              if (apiError?.status === 401 || apiError?.status === 403) {
                return false;
              }
              // Retry mutations once for other errors
              return failureCount < 1;
            },
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}