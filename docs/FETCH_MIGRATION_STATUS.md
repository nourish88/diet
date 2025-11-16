# Fetch Migration Status

## Özet

Projede **79 yerde** direkt `fetch` kullanımı bulundu. En kritik dosyalar `apiClient` kullanacak şekilde migrate edildi.

## Migrate Edilen Dosyalar ✅

### 1. `app/clients/[id]/page.tsx`

- ✅ `/api/clients/${clientId}/unread-messages` → `apiClient.get()`
- ✅ `/api/progress?` → `apiClient.get()`
- ✅ `/api/exercises?` → `apiClient.get()`
- ✅ `/api/clients/${clientId}/unlink` → `apiClient.post()`

### 2. `app/besinler/page.tsx`

- ✅ `/api/besinler?` → `apiClient.get()` (infinite query)
- ✅ `/api/besinler/${id}` (DELETE) → `apiClient.delete()`

### 3. `app/birthdays/page.tsx`

- ✅ `/api/birthdays/today` → `apiClient.get()`
- ✅ `/api/birthdays/whatsapp` → `apiClient.post()`

## Hala Direkt Fetch Kullanan Dosyalar ❌

### Kritik Dosyalar (API endpoint'leri)

1. **`components/DietForm.tsx`** (4 fetch)

   - `/api/clients/${initialClientId}`
   - `/api/clients/${selectedClientId}`
   - `/api/diets/latest/${targetClientId}`
   - `/api/diets/${dietId}`

2. **`components/DietFormBasicFields.tsx`** (2 fetch)

   - `/api/important-dates`
   - `/api/clients/${selectedClientId}`

3. **`app/client/` sayfaları** (10+ fetch)

   - `app/client/page.tsx` - `/api/auth/sync`, `/api/notifications/check-meal-reminders`, `/api/clients/${clientId}/unread-messages`
   - `app/client/conversations/page.tsx` - `/api/client/portal/conversations`
   - `app/client/diets/page.tsx` - `/api/client/portal/overview`
   - `app/client/exercises/page.tsx` - `/api/exercises?`
   - `app/client/progress/page.tsx` - `/api/progress?`
   - `app/client/settings/page.tsx` - `/api/auth/sync`, `/api/notifications/preferences`
   - `app/client/diets/[id]/page.tsx` - `/api/client/portal/diets/${dietId}`

4. **`components/BannedBesinManager.tsx`** (3 fetch)

   - `/api/besinler?pageSize=200`
   - `/api/clients/${clientId}/banned-besins`
   - `/api/clients/${clientId}/banned-besins?besinId=${besinId}`

5. **`components/MenuItem.tsx`** (1 fetch)

   - `/api/birims`

6. **`components/SmartBesinInput.tsx`** (2 fetch)

   - `/api/besin-gruplari`
   - `/api/besinler`

7. **`components/ClientSelector.tsx`** (1 fetch)

   - `/api/clients?search=...`

8. **`app/besinler/[id]/edit/page.tsx`** (2 fetch)

   - `/api/besinler/${besinId}` (GET, PUT)

9. **`app/besin-gruplari/page.tsx`** (2 fetch)

   - `/api/besin-gruplari`
   - `/api/besin-gruplari/${id}` (DELETE)

10. **`app/page.tsx`** (4 fetch)

    - `/api/analytics/stats`
    - `/api/diets?skip=0&take=5`
    - `/api/auth/sync`
    - `/api/unread-messages/list`

11. **`lib/auth-context.tsx`** (2 fetch)

    - `/api/auth/sync`

12. **Diğer component'ler ve sayfalar** (30+ fetch)

### Statik Asset'ler (Normal)

- `components/DirectPDFButton.tsx` - `/ezgi_evgin.png`, `/nazar-boncugu.png` ✅ (normal)
- `components/DatabasePDFButton.tsx` - `/ezgi_evgin.png`, `/nazar-boncugu.png` ✅ (normal)
- `lib/brosur-generator.ts` - `/api/brosur/qrcode` (server-side endpoint, normal)

### Dış API'ler (Normal)

- `lib/expo-push.ts` - `https://exp.host/--/api/v2/push/send` ✅ (dış API, normal)
- `lib/api-auth.ts` - Supabase auth endpoint ✅ (normal)

## Toplam Durum

- ✅ **Migrate Edilen:** ~10 fetch kullanımı (3 kritik dosya)
- ❌ **Kalan:** ~69 fetch kullanımı (30+ dosya)
- 📊 **Tamamlanma:** ~13%

## Öneriler

### Öncelik 1: Kritik Component'ler

1. `components/DietForm.tsx` - En çok kullanılan component
2. `components/DietFormBasicFields.tsx` - DietForm'a bağlı
3. `components/BannedBesinManager.tsx` - Client yönetiminde kullanılıyor
4. `components/ClientSelector.tsx` - Çok kullanılan component

### Öncelik 2: Client Sayfaları

- Tüm `app/client/` sayfaları migrate edilmeli

### Öncelik 3: Diğer Sayfalar

- `app/page.tsx` (dashboard)
- `app/besinler/[id]/edit/page.tsx`
- `app/besin-gruplari/page.tsx`

## Sonraki Adımlar

1. Kritik component'leri migrate et (DietForm, DietFormBasicFields, vb.)
2. Client sayfalarını migrate et
3. Diğer sayfaları migrate et
4. Test et ve doğrula
