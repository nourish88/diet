# Code Review and Refactoring Analysis Report

**Tarih:** 2025-01-XX  
**Branch:** refactor/code-review-analysis  
**Kapsam:** Next.js best practices, component optimization, state management, merkezi yönetim

---

## Executive Summary

Bu analiz raporu, diet uygulamasının kod kalitesi, performans, maintainability ve Next.js best practices açısından kapsamlı bir incelemesini içermektedir. Özellikle merkezi yönetim katmanları (interceptors, middleware), loading state yönetimi, ve component mimarisi üzerinde durulmuştur.

---

## 1. Next.js App Router Best Practices

### 1.1 Server vs Client Components

**Durum:**

- **37 page.tsx** dosyası mevcut
- **35 tanesi** `"use client"` direktifi kullanıyor
- **Sadece 2 tanesi** server component olabilir potansiyeli var:
  - `app/(diyet)/Diyet/page.tsx`
  - `app/important-dates/page.tsx`

**Sorunlar:**

1. ✅ **Kritik:** Tüm sayfalar client component olarak işaretlenmiş, ancak birçoğu server component olabilir
2. ✅ **Yüksek:** SEO ve performans için metadata, initial data fetching server component'lerden yapılmalı
3. ✅ **Orta:** Loading states için `loading.tsx` dosyaları yok
4. ✅ **Orta:** Error handling için `error.tsx` dosyaları yok

**Öneriler:**

- Static metadata ve initial data fetching için server component'lere geçiş
- Her route için `loading.tsx` ve `error.tsx` eklenmeli
- Client component'ler sadece interaktif özellikler için kullanılmalı

### 1.2 Middleware

**Durum:**

- ✅ **Kritik:** `middleware.ts` dosyası yok
- Route protection merkezi olarak yapılmıyor
- Her API route'unda manuel authentication check yapılıyor

**Öneriler:**

- `app/middleware.ts` oluşturulmalı
- Route-based authentication ve redirect logic merkezi hale getirilmeli
- Public/private route ayrımı yapılmalı

---

## 2. Merkezi Yönetim ve Interceptors

### 2.1 API Client (`lib/api-client.ts`)

**Mevcut Durum:**

```typescript
async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession(); // ❌ Her request'te çağrılıyor

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }
  // ...
}
```

**Sorunlar:**

1. ✅ **Kritik:** Her API request'inde `getSession()` çağrılıyor - performance sorunu
2. ✅ **Yüksek:** Session cache mekanizması yok
3. ✅ **Yüksek:** Request/Response interceptor pattern yok (mobile app'te axios interceptor var, web'de yok)
4. ✅ **Orta:** 401/403 error handling merkezi değil
5. ✅ **Orta:** Token refresh logic merkezi değil

**Öneriler:**

1. **Session Cache Eklenmeli:**

   ```typescript
   private sessionCache: { session: Session | null; timestamp: number } | null = null;
   private readonly SESSION_CACHE_TTL = 60000; // 1 minute

   private async getCachedSession() {
     if (this.sessionCache && Date.now() - this.sessionCache.timestamp < this.SESSION_CACHE_TTL) {
       return this.sessionCache.session;
     }
     const supabase = createClient();
     const { data: { session } } = await supabase.auth.getSession();
     this.sessionCache = { session, timestamp: Date.now() };
     return session;
   }
   ```

2. **Request Interceptor Pattern:**

   ```typescript
   private requestInterceptors: Array<(config: RequestInit) => Promise<RequestInit>> = [];

   addRequestInterceptor(interceptor: (config: RequestInit) => Promise<RequestInit>) {
     this.requestInterceptors.push(interceptor);
   }

   private async applyRequestInterceptors(config: RequestInit): Promise<RequestInit> {
     let finalConfig = config;
     for (const interceptor of this.requestInterceptors) {
       finalConfig = await interceptor(finalConfig);
     }
     return finalConfig;
   }
   ```

3. **Response Interceptor Pattern:**

   ```typescript
   private responseInterceptors: Array<(response: Response) => Promise<Response>> = [];

   addResponseInterceptor(interceptor: (response: Response) => Promise<Response>) {
     this.responseInterceptors.push(interceptor);
   }

   private async applyResponseInterceptors(response: Response): Promise<Response> {
     let finalResponse = response;
     for (const interceptor of this.responseInterceptors) {
       finalResponse = await interceptor(finalResponse);
     }
     return finalResponse;
   }
   ```

4. **401/403 Merkezi Handling:**
   ```typescript
   private async handleAuthError(response: Response) {
     if (response.status === 401 || response.status === 403) {
       // Clear session cache
       this.sessionCache = null;
       // Redirect to login
       if (typeof window !== 'undefined') {
         window.location.href = '/login';
       }
     }
   }
   ```

### 2.2 Mobile App Comparison

**Mobile App (`mobile/src/core/api/client.ts`):**

- ✅ Axios interceptor kullanıyor
- ✅ Request interceptor: Token otomatik ekleniyor
- ✅ Response interceptor: 401/403 handling merkezi
- ✅ Error handling merkezi

**Web App:**

- ❌ Fetch API kullanıyor (interceptor pattern zor)
- ❌ Her request'te getSession() çağrılıyor
- ❌ Error handling component bazlı

**Öneri:** Web app'te de interceptor pattern benzeri bir yapı kurulmalı.

---

## 3. State Management ve Loading States

### 3.1 React Query vs useState

**Durum:**
Birçok sayfa hem React Query kullanıyor hem de `useState` ile manuel loading state yönetiyor:

**Örnekler:**

1. **`app/clients/page.tsx`:**

   ```typescript
   const [isLoading, setIsLoading] = useState(true); // ❌ Gereksiz
   const [isLoadingMore, setIsLoadingMore] = useState(false); // ❌ Gereksiz

   const { data: cachedFirstPage } = useQuery({...}); // ✅ React Query var

   // Manuel loading yönetimi
   if (append) {
     setIsLoadingMore(true);
   } else {
     setIsLoading(true);
   }
   ```

2. **`app/diets/page.tsx`:**

   ```typescript
   const [isLoading, setIsLoading] = useState(true); // ❌ Gereksiz
   const [isLoadingMore, setIsLoadingMore] = useState(false); // ❌ Gereksiz

   const { data: cachedFirstPage } = useQuery({...}); // ✅ React Query var
   ```

3. **`app/istatistikler/page.tsx`:**

   ```typescript
   const [isLoading, setIsLoading] = useState(true); // ❌ Gereksiz
   const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(
     null
   ); // ❌ Gereksiz

   // apiClient.get kullanıyor, React Query kullanmıyor
   ```

4. **`app/tanimlamalar/page.tsx`:**
   ```typescript
   const [isLoading, setIsLoading] = useState(true); // ❌ Gereksiz
   const [suDefinitions, setSuDefinitions] = useState<Definition[]>([]); // ❌ Gereksiz
   ```

**Sorunlar:**

1. ✅ **Yüksek:** React Query kullanılıyor ama built-in loading state'leri kullanılmıyor
2. ✅ **Yüksek:** `isLoading`, `isFetching`, `isError` gibi state'ler React Query'den gelmeli
3. ✅ **Orta:** Manual state management ile React Query cache karışıyor
4. ✅ **Orta:** Infinite scroll için `useInfiniteQuery` kullanılmalı

**Öneriler:**

1. **React Query'den Loading State Kullan:**

   ```typescript
   const { data, isLoading, isFetching, error } = useQuery({
     queryKey: ["clients", skip, take, searchTerm],
     queryFn: () => fetchClients({ skip, take, search: searchTerm }),
   });

   // useState ile isLoading yönetme
   // isLoading ve isFetching React Query'den geliyor
   ```

2. **Infinite Query Kullan:**

   ```typescript
   const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
     useInfiniteQuery({
       queryKey: ["clients", searchTerm],
       queryFn: ({ pageParam = 0 }) =>
         fetchClients({
           skip: pageParam,
           take: ITEMS_PER_PAGE,
           search: searchTerm,
         }),
       getNextPageParam: (lastPage, pages) => {
         return lastPage.hasMore ? pages.length : undefined;
       },
       initialPageParam: 0,
     });
   ```

3. **Tüm API Calls için React Query:**
   - `app/istatistikler/page.tsx` → `useQuery` kullanmalı
   - `app/tanimlamalar/page.tsx` → `useQuery` kullanmalı
   - `app/besin-gruplari/page.tsx` → `useQuery` kullanmalı

### 3.2 React Query Configuration

**Mevcut Durum (`components/providers/QueryProvider.tsx`):**

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      refetchOnWindowFocus: false,
    },
  },
});
```

**Öneriler:**

1. **Global Error Handling:**

   ```typescript
   defaultOptions: {
     queries: {
       staleTime: 60 * 1000,
       refetchOnWindowFocus: false,
       retry: (failureCount, error: any) => {
         // 401/403 için retry yapma
         if (error?.status === 401 || error?.status === 403) {
           return false;
         }
         return failureCount < 3;
       },
       onError: (error: any) => {
         // Global error handling
         console.error('Query error:', error);
       },
     },
     mutations: {
       onError: (error: any) => {
         // Global mutation error handling
         console.error('Mutation error:', error);
       },
     },
   },
   ```

2. **Global Loading State:**
   - React Query DevTools kullanılıyor ✅
   - Global loading indicator eklenebilir

---

## 4. Component Architecture

### 4.1 Büyük Component'ler

**En Büyük Component'ler:**

1. **`DietForm.tsx`**: 1324 satır ❌ **ÇOK BÜYÜK**
2. **`DirectPDFButton.tsx`**: 1235 satır ❌ **ÇOK BÜYÜK**
3. **`DatabasePDFButton.tsx`**: 999 satır ❌ **ÇOK BÜYÜK**
4. **`DietTable.tsx`**: 823 satır ❌ **BÜYÜK**
5. **`DietFormBasicFields.tsx`**: 626 satır ❌ **BÜYÜK**
6. **`SmartBesinInput.tsx`**: 521 satır ❌ **BÜYÜK**

**Sorunlar:**

1. ✅ **Kritik:** DietForm 1324 satır - refactor edilmeli
2. ✅ **Yüksek:** PDF button component'leri çok büyük - split edilmeli
3. ✅ **Orta:** Component'ler tek sorumluluk prensibine uymuyor

**Öneriler:**

1. **DietForm.tsx Refactoring:**

   - `DietFormLogic.tsx` - State management ve business logic
   - `DietFormUI.tsx` - UI rendering
   - `DietFormHooks.ts` - Custom hooks
   - `DietFormUtils.ts` - Utility functions

2. **PDF Button Components:**

   - `DirectPDFButton.tsx` → `PDFGenerator/` folder'a taşınmalı
   - `DatabasePDFButton.tsx` → `PDFGenerator/` folder'a taşınmalı
   - Common PDF logic extract edilmeli

3. **Component Splitting:**
   - 300+ satır component'ler split edilmeli
   - Single Responsibility Principle uygulanmalı

### 4.2 Component Reusability

**Durum:**

- Bazı component'ler duplicate logic içeriyor
- Shared utilities eksik

**Öneriler:**

- Common form components oluşturulmalı
- Shared hooks extract edilmeli
- Common UI patterns için wrapper component'ler

---

## 5. Performance Optimizations

### 5.1 Bundle Size

**Sorunlar:**

1. ✅ **Orta:** Büyük client component'ler bundle size'ı artırıyor
2. ✅ **Orta:** Lazy loading eksik

**Öneriler:**

1. **Dynamic Imports:**

   ```typescript
   const DietForm = dynamic(() => import("@/components/DietForm"), {
     loading: () => <div>Loading...</div>,
   });
   ```

2. **Route-based Code Splitting:**
   - Next.js otomatik yapıyor ama büyük component'ler için manuel lazy loading

### 5.2 Re-renders

**Sorunlar:**

1. ✅ **Orta:** Gereksiz re-render'lar olabilir
2. ✅ **Düşük:** Memoization eksik olabilir

**Öneriler:**

- `React.memo` kullanımı kontrol edilmeli
- `useMemo` ve `useCallback` gerektiğinde kullanılmalı
- React DevTools Profiler ile analiz yapılmalı

### 5.3 API Calls

**Sorunlar:**

1. ✅ **Yüksek:** Her API call'da `getSession()` çağrılıyor (session cache gerekli)
2. ✅ **Orta:** Duplicate fetch'ler olabilir

**Öneriler:**

- Session cache (2.1'de detaylandırıldı)
- React Query cache stratejisi optimize edilmeli

---

## 6. Clean Code ve Maintainability

### 6.1 Code Organization

**Durum:**

- Folder structure iyi organize edilmiş ✅
- Component'ler mantıklı yerlerde

**İyileştirmeler:**

- `components/` içinde feature-based organization
- Shared utilities için `lib/` folder

### 6.2 Type Safety

**Durum:**

- TypeScript kullanılıyor ✅
- `any` type kullanımları var ❌

**Öneriler:**

- `any` type'lar kaldırılmalı
- Strict type checking aktif edilmeli

### 6.3 Error Handling

**Sorunlar:**

1. ✅ **Yüksek:** Her component'te aynı error handling pattern tekrarlanıyor
2. ✅ **Orta:** Global error boundary eksik

**Öneriler:**

1. **Global Error Boundary:**

   ```typescript
   // app/error-boundary.tsx
   "use client";

   export default function ErrorBoundary({
     error,
     reset,
   }: {
     error: Error;
     reset: () => void;
   }) {
     return (
       <div>
         <h2>Something went wrong!</h2>
         <button onClick={reset}>Try again</button>
       </div>
     );
   }
   ```

2. **React Query Error Handling:**
   - Global error handler QueryProvider'da

---

## 7. Önceliklendirme

### Kritik (Hemen Yapılmalı)

1. ✅ **Session Cache:** `api-client.ts`'de her request'te `getSession()` çağrısı
2. ✅ **Loading States:** React Query kullanılıyorsa `useState` ile manuel loading kaldırılmalı
3. ✅ **Next.js Middleware:** Route protection için `middleware.ts` eklenmeli

### Yüksek (Kısa Vadede)

4. ✅ **Request/Response Interceptors:** `api-client.ts`'de interceptor pattern
5. ✅ **Component Splitting:** `DietForm.tsx` (1324 satır) ve diğer büyük component'ler
6. ✅ **React Query Migration:** Tüm API calls için React Query kullanılmalı

### Orta (Orta Vadede)

7. ✅ **Server Components:** Static pages için server component'lere geçiş
8. ✅ **Loading/Error Files:** Her route için `loading.tsx` ve `error.tsx`
9. ✅ **Bundle Optimization:** Dynamic imports ve code splitting

### Düşük (Uzun Vadede)

10. ✅ **Type Safety:** `any` type'ların kaldırılması
11. ✅ **Performance Profiling:** React DevTools ile detaylı analiz
12. ✅ **Documentation:** Component ve utility dokümantasyonu

---

## 8. Detaylı Öneriler ve Kod Örnekleri

### 8.1 Optimized API Client

```typescript
// lib/api-client-optimized.ts
import { createClient } from "./supabase-browser";
import type { Session } from "@supabase/supabase-js";

type RequestInterceptor = (config: RequestInit) => Promise<RequestInit>;
type ResponseInterceptor = (response: Response) => Promise<Response>;

class OptimizedApiClient {
  private baseURL = "/api";
  private sessionCache: { session: Session | null; timestamp: number } | null =
    null;
  private readonly SESSION_CACHE_TTL = 60000; // 1 minute
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];

  private async getCachedSession(): Promise<Session | null> {
    if (
      this.sessionCache &&
      Date.now() - this.sessionCache.timestamp < this.SESSION_CACHE_TTL
    ) {
      return this.sessionCache.session;
    }

    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    this.sessionCache = { session, timestamp: Date.now() };
    return session;
  }

  addRequestInterceptor(interceptor: RequestInterceptor) {
    this.requestInterceptors.push(interceptor);
  }

  addResponseInterceptor(interceptor: ResponseInterceptor) {
    this.responseInterceptors.push(interceptor);
  }

  private async applyRequestInterceptors(
    config: RequestInit
  ): Promise<RequestInit> {
    let finalConfig = config;
    for (const interceptor of this.requestInterceptors) {
      finalConfig = await interceptor(finalConfig);
    }
    return finalConfig;
  }

  private async applyResponseInterceptors(
    response: Response
  ): Promise<Response> {
    let finalResponse = response;
    for (const interceptor of this.responseInterceptors) {
      finalResponse = await interceptor(finalResponse);
    }
    return finalResponse;
  }

  private async handleAuthError(response: Response) {
    if (response.status === 401 || response.status === 403) {
      this.sessionCache = null;
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
  }

  async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const session = await this.getCachedSession();

    let headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };

    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }

    let config: RequestInit = {
      ...options,
      headers,
    };

    // Apply request interceptors
    config = await this.applyRequestInterceptors(config);

    const response = await fetch(`${this.baseURL}${endpoint}`, config);

    // Handle auth errors
    await this.handleAuthError(response);

    // Apply response interceptors
    const interceptedResponse = await this.applyResponseInterceptors(response);

    if (!interceptedResponse.ok) {
      // Error handling...
      const error = new Error(`API Error: ${interceptedResponse.status}`);
      (error as any).status = interceptedResponse.status;
      throw error;
    }

    const contentType = interceptedResponse.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      return interceptedResponse.json();
    }

    return {} as T;
  }

  // ... rest of methods (get, post, put, delete, patch)
}
```

### 8.2 Next.js Middleware

```typescript
// app/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes
  const publicRoutes = ["/login", "/register", "/register-client"];
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Check auth token
  const token =
    request.cookies.get("sb-auth-token")?.value ||
    request.headers.get("authorization")?.replace("Bearer ", "");

  if (!token && !pathname.startsWith("/api")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

### 8.3 React Query Migration Example

```typescript
// app/clients/page-optimized.tsx
"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchClients } from "@/services/ClientService";

const ITEMS_PER_PAGE = 20;

export default function ClientsPageOptimized() {
  const [searchTerm, setSearchTerm] = useState("");

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = useInfiniteQuery({
    queryKey: ["clients", searchTerm],
    queryFn: ({ pageParam = 0 }) =>
      fetchClients({
        skip: pageParam,
        take: ITEMS_PER_PAGE,
        search: searchTerm || undefined,
      }),
    getNextPageParam: (lastPage, pages) => {
      return lastPage.hasMore ? pages.length * ITEMS_PER_PAGE : undefined;
    },
    initialPageParam: 0,
  });

  const clients = data?.pages.flatMap((page) => page.clients) ?? [];
  const total = data?.pages[0]?.total ?? 0;

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (isError) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div>
      {/* UI */}
      {clients.map((client) => (
        <div key={client.id}>{client.name}</div>
      ))}
      {hasNextPage && (
        <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
          {isFetchingNextPage ? "Loading..." : "Load More"}
        </button>
      )}
    </div>
  );
}
```

---

## 9. Sonuç ve Sonraki Adımlar

### Özet

- **Kritik Sorunlar:** Session cache, loading state yönetimi, middleware eksikliği
- **Yüksek Öncelik:** Interceptor pattern, component splitting, React Query migration
- **Genel Durum:** Uygulama çalışıyor ancak optimizasyon ve best practices açısından iyileştirme potansiyeli yüksek

### Önerilen Adımlar

1. Session cache implementasyonu (1-2 saat)
2. Loading state refactoring (2-3 saat)
3. Middleware eklenmesi (1 saat)
4. API client interceptor pattern (2-3 saat)
5. Component splitting (3-5 saat)
6. React Query migration (4-6 saat)

**Toplam Tahmini Süre:** 13-20 saat

---

## 10. Checklist

### Merkezi Yönetim

- [ ] Session cache eklendi
- [ ] Request interceptor pattern implementasyonu
- [ ] Response interceptor pattern implementasyonu
- [ ] 401/403 merkezi handling
- [ ] Next.js middleware.ts eklendi

### State Management

- [ ] useState ile manuel loading kaldırıldı
- [ ] React Query built-in loading state'leri kullanılıyor
- [ ] useInfiniteQuery infinite scroll için kullanılıyor
- [ ] Tüm API calls React Query ile

### Component Architecture

- [ ] DietForm.tsx split edildi
- [ ] PDF button component'leri refactor edildi
- [ ] Büyük component'ler split edildi (300+ satır)

### Performance

- [ ] Dynamic imports eklendi
- [ ] Bundle size optimize edildi
- [ ] Re-render'lar minimize edildi

### Code Quality

- [ ] any type'lar kaldırıldı
- [ ] Error boundaries eklendi
- [ ] Loading/Error files eklendi
- [ ] TypeScript strict mode aktif

---

**Rapor Hazırlayan:** AI Assistant  
**Son Güncelleme:** 2025-01-XX
