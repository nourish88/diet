# Diet Mobile App

Expo SDK 54 ve React Native kullanarak geliştirilmiş, TypeScript tabanlı mobil diyet uygulaması.

## Özellikler

### Diyetisyen Modülü

- Dashboard ile özet istatistikler
- Danışan listesi ve yönetimi (lazy loading)
- Diyet oluşturma ve düzenleme
- Şablonlardan diyet oluşturma
- Geçmiş diyetleri görüntüleme ve raporlama

### Danışan Modülü

- Dashboard ile kişisel özet
- Diyet programlarını görüntüleme
- Diyetlere yorum yapma
- Öğün fotoğrafları paylaşma
- PDF oluşturma ve indirme

### Bildirim Sistemi

- Local notification sistemi
- Öğün saatlerinden 30 dakika önce hatırlatıcı
- 14 gün boyunca otomatik bildirimler

## Teknolojiler

- **Framework**: Expo SDK 54, React Native
- **Language**: TypeScript
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **State Management**: Zustand
- **Data Fetching**: React Query (TanStack Query)
- **Forms**: React Hook Form + Zod
- **HTTP Client**: Axios
- **Storage**: Expo SecureStore
- **Notifications**: Expo Notifications
- **PDF**: Expo Print + Expo Sharing
- **Architecture**: Clean Architecture, Feature-based structure

## Kurulum

1. **Dependencies yükle**:

   ```bash
   npm install
   ```

2. **Environment variables ayarla**:

   ```bash
   cp .env.example .env
   ```

   `.env` dosyasını düzenleyin:

   ```
   EXPO_PUBLIC_API_URL=http://localhost:3000
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. **Uygulamayı başlat**:
   ```bash
   npm start
   ```

## Proje Yapısı

```
mobile/
├── app/                    # Expo Router screens
│   ├── (auth)/            # Authentication screens
│   ├── (dietitian)/       # Dietitian module
│   └── (client)/          # Client module
├── features/              # Feature modules
│   ├── auth/              # Authentication
│   ├── diets/             # Diet management
│   ├── clients/           # Client management
│   ├── templates/         # Template management
│   ├── comments/          # Comment system
│   └── notifications/    # Notification system
├── core/                  # Core utilities
│   ├── api/              # API client
│   ├── storage/          # Secure storage
│   └── config/           # Configuration
├── shared/               # Shared resources
│   ├── ui/               # Reusable UI components
│   ├── hooks/            # Custom hooks
│   └── utils/            # Utility functions
└── types/                # TypeScript types
```

## API Endpoints

Uygulama web API'lerini kullanır:

- **Authentication**: `/api/auth/sync`
- **Clients**: `/api/clients`
- **Diets**: `/api/diets`
- **Templates**: `/api/templates`
- **Comments**: `/api/comments`
- **Meal Photos**: `/api/meal-photos`

## Bildirim Sistemi

- Tamamen local notification sistemi
- Diyet oluşturulduğunda otomatik schedule
- 14 gün boyunca her öğün saatinden 30 dakika önce bildirim
- Expo Notifications API kullanır

## Fotoğraf Yönetimi

- Öğün fotoğrafları PostgreSQL'de Base64 olarak saklanır
- 2 gün sonra otomatik silinir (backend cron job)
- Expo Image Picker ile fotoğraf seçimi

## PDF Oluşturma

- Expo Print API kullanır
- HTML template ile PDF oluşturur
- Expo Sharing ile paylaşım

## Backend Cron Job

Fotoğrafları temizlemek için:

```bash
npm run cleanup-photos cleanup
```

İstatistikleri görmek için:

```bash
npm run cleanup-photos stats
```

## Geliştirme

### Yeni Feature Ekleme

1. `features/` altında yeni klasör oluştur
2. `api/`, `stores/`, `components/` alt klasörlerini ekle
3. Types ve hooks'ları tanımla
4. UI componentlerini oluştur

### Styling

NativeWind kullanarak Tailwind CSS sınıfları ile stillendirme yapın:

```tsx
<View className="flex-1 bg-secondary-50 p-4">
  <Text className="text-xl font-bold text-secondary-900">Başlık</Text>
</View>
```

### State Management

Zustand store'ları kullanın:

```tsx
import { create } from "zustand";

interface StoreState {
  data: any[];
  setData: (data: any[]) => void;
}

export const useStore = create<StoreState>((set) => ({
  data: [],
  setData: (data) => set({ data }),
}));
```

## Test

```bash
# iOS simulator
npm run ios

# Android emulator
npm run android

# Web browser
npm run web
```

## Build

```bash
# Android
npm run build:android

# iOS
npm run build:ios
```

## Lisans

Bu proje özel kullanım içindir.
