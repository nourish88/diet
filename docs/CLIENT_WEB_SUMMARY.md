# Client Web Uygulaması - Özet Dokümantasyon

## 🎯 Proje Özeti

Client (Danışan) web uygulaması, danışanların web tarayıcısından beslenme programlarını görüntülemesine, diyetisyenle mesajlaşmasına ve sağlık takibi yapmasına olanak tanır.

## 📦 Yeni Eklenen Özellikler

### 1. Geliştirilmiş Login Sayfası

**Dosya**: `/app/(auth)/login/page.tsx`

#### Özellikler:
- ✅ **Sekme Sistemi**: Diyetisyen / Danışan seçimi
- ✅ **Gradient Butonlar**: Rol bazlı renk tema
- ✅ **Danışan Kaydı Linki**: Client sekmesinde görünür
- ✅ **Modern Tasarım**: Gradient arka plan, shadow efektleri

#### UI Bileşenleri:
```tsx
- Diyetisyen Sekmesi (İndigo/Purple renk)
- Danışan Sekmesi (Blue/Cyan renk)
- "Danışan Kaydı Oluştur" butonu
- Responsive tasarım
```

---

### 2. Client Register Sayfası

**Dosya**: `/app/(auth)/register-client/page.tsx`

#### Özellikler:
- ✅ **Email/Password Kayıt**: Basit form
- ✅ **Şifre Doğrulama**: Confirm password
- ✅ **Reference Code Oluşturma**: Otomatik 6 haneli kod
- ✅ **Success Screen**: Referans kodu gösterimi
- ✅ **Auto Redirect**: 3 saniye sonra pending approval'a yönlendirme

#### Akış:
```
1. Form doldur (email, password, confirm)
2. Submit → Supabase sign up
3. Database sync → Reference code al
4. Success screen → Referans kodu göster
5. Auto redirect → /pending-approval
```

---

### 3. Ana Sayfa Yönlendirmesi

**Dosya**: `/app/page.tsx`

#### Özellikler:
- ✅ **Otomatik Rol Kontrolü**: Session check + role check
- ✅ **Client Yönlendirmesi**: `/client` dashboard'a git
- ✅ **Dietitian Dashboard**: Mevcut dietitian sayfası
- ✅ **Pending Check**: Onaylanmamışları `/pending-approval`'a yönlendir

#### Logic:
```typescript
checkAuthAndLoadData() {
  if (no session) → /login
  
  if (role === "client") {
    if (!isApproved) → /pending-approval
    else → /client
  }
  
  if (role === "dietitian") {
    → Stay on / (dashboard)
  }
}
```

---

### 4. Client Layout

**Dosya**: `/app/client/layout.tsx`

#### Özellikler:
- ✅ **Top Navigation**: Logo, menü, kullanıcı bilgisi
- ✅ **Responsive Menu**: Mobil hamburger menü
- ✅ **Auth Check**: Rol ve onay kontrolü
- ✅ **Auto Logout**: Session kontrolü

#### Navigasyon:
```
🏠 Anasayfa → /client
🍽️ Diyetlerim → /client/diets
💬 Mesajlar → /client/unread-messages
👤 Kullanıcı Menüsü → Ad, email, çıkış
```

---

### 5. Client Dashboard

**Dosya**: `/app/client/page.tsx`

#### Özellikler:
- ✅ **Hoş Geldin Kartı**: Gradient header
- ✅ **Quick Access**: Beslenme programları ve mesajlar
- ✅ **Unread Badge**: Okunmamış mesaj sayısı
- ✅ **Personal Info**: Kişisel bilgiler kartı
- ✅ **Auto Refresh**: 30 saniyede bir unread count güncelleme

#### Kartlar:
```
1. Hoş Geldiniz Kartı (Gradient blue)
2. Beslenme Programlarım (Blue icon)
3. Okunmamış Mesajlar (Purple icon + badge)
4. Kişisel Bilgiler (Email, telefon, doğum tarihi)
```

---

### 6. Diyet Listesi

**Dosya**: `/app/client/diets/page.tsx`

#### Özellikler:
- ✅ **Grid Layout**: Responsive kart sistemi
- ✅ **Unread Badges**: Her diyet için okunmamış mesaj sayısı
- ✅ **Special Badges**: 🎂 Doğum günü, 🎉 Kutlamalar
- ✅ **Diet Info**: Tarih, öğün sayısı, hedef
- ✅ **Empty State**: Diyet yoksa bilgilendirme

---

### 7. Diyet Detayı

**Dosya**: `/app/client/diets/[id]/page.tsx`

#### Özellikler:
- ✅ **Gradient Header**: Diyet numarası ve tarih
- ✅ **Summary Cards**: Su, hedef, sonuç, fiziksel aktivite
- ✅ **Meal List**: Tüm öğünler ve besinler
- ✅ **PDF Download**: Otomatik dosya indirme
- ✅ **Message Button**: Diyetisyenle iletişim

---

### 8. Mesajlaşma

**Dosya**: `/app/client/diets/[id]/messages/page.tsx`

#### Özellikler:
- ✅ **Real-time Chat**: Mesaj listesi
- ✅ **Photo Upload**: 5 fotoğrafa kadar
- ✅ **Meal Context**: Öğün seçimi (optional)
- ✅ **Auto Read Mark**: Mesajları otomatik okundu işaretle
- ✅ **Scroll to Bottom**: Yeni mesajda otomatik scroll

---

### 9. Okunmamış Mesajlar

**Dosya**: `/app/client/unread-messages/page.tsx`

#### Özellikler:
- ✅ **Conversation List**: Tüm okunmamış mesajlar
- ✅ **Grouped by Diet**: Diyet bazlı gruplama
- ✅ **Last Message**: Son mesaj önizlemesi
- ✅ **Unread Count**: Her conversation için sayı
- ✅ **Direct Navigation**: Tıklayınca mesajlaşmaya git

---

### 10. Pending Approval

**Dosya**: `/app/pending-approval/page.tsx`

#### Özellikler:
- ✅ **Reference Code Display**: Büyük, mavi kutu
- ✅ **Step-by-Step Guide**: Adım adım talimat
- ✅ **Status Check**: "Durumu Kontrol Et" butonu
- ✅ **Auto Redirect**: Onaylanınca dashboard'a git
- ✅ **User Info**: Email gösterimi

---

## 🎨 Tasarım Sistemi

### Renkler

#### Client Teması
- **Primary**: Blue (#3b82f6)
- **Secondary**: Cyan (#06b6d4)
- **Accent**: Purple (#8b5cf6)
- **Success**: Green (#10b981)
- **Danger**: Red (#ef4444)

#### Dietitian Teması
- **Primary**: Indigo (#6366f1)
- **Secondary**: Purple (#a855f7)

### Gradient'ler

```css
/* Client */
.gradient-client {
  background: linear-gradient(to right, #3b82f6, #06b6d4);
}

/* Dietitian */
.gradient-dietitian {
  background: linear-gradient(to right, #6366f1, #a855f7);
}

/* Header */
.gradient-bg {
  background: linear-gradient(to br, #eff6ff, #e0e7ff);
}
```

### Tipografi

```
- Başlık: 2xl-3xl, font-bold
- Alt başlık: lg-xl, font-semibold
- Body: sm-base, font-normal
- Caption: xs, font-medium
```

### Spacing

```
- Section gap: 6 (1.5rem)
- Card padding: 6 (1.5rem)
- Button padding: 3-4 (0.75-1rem)
```

### Shadows

```
- Card: shadow-sm (hafif)
- Hover: shadow-md (orta)
- Active: shadow-xl (yoğun)
```

---

## 🔐 Güvenlik

### Authentication Flow

```
1. Login → Supabase Auth
2. Get Session → Access Token
3. Sync with DB → Get User Role
4. Role Check → Redirect accordingly
5. Session Persist → LocalStorage
```

### Authorization Checks

```typescript
// Client Layout
if (role !== "client") → redirect to /
if (!isApproved) → redirect to /pending-approval

// API Routes
requireAuth() → Check session token
requireOwnClient() → Check client ownership
```

### API Security

- ✅ **Token-based Auth**: Bearer token
- ✅ **CORS**: Configured origins
- ✅ **Rate Limiting**: (TODO)
- ✅ **Input Validation**: Zod schemas

---

## 📡 API Endpoints (Client)

### Authentication

```
POST /api/auth/sync
  Body: { supabaseId, email, role }
  Response: { user, referenceCode }
```

### Diets

```
GET /api/clients/[id]/diets
  Headers: Authorization: Bearer <token>
  Response: { diets: [...] }

GET /api/clients/[id]/diets/[dietId]
  Response: { diet: {...} }
```

### Messages

```
GET /api/clients/[id]/diets/[dietId]/messages
  Response: { messages: [...], unreadCount }

POST /api/clients/[id]/diets/[dietId]/messages
  Body: { content, ogunId?, photos? }
  Response: { message: {...} }

PATCH /api/clients/[id]/diets/[dietId]/messages
  Body: { messageIds: [...] }
  Response: { markedCount }
```

### Unread Messages

```
GET /api/clients/[id]/unread-messages
  Response: { totalUnread, unreadByDiet: {...} }

GET /api/unread-messages/list
  Response: { conversations: [...], totalUnread }
```

---

## 📱 Responsive Breakpoints

```css
/* Mobile */
@media (max-width: 640px) {
  - Single column layout
  - Hamburger menu
  - Full-width cards
}

/* Tablet */
@media (min-width: 641px) and (max-width: 1024px) {
  - 2 column grid
  - Horizontal menu
  - Larger cards
}

/* Desktop */
@media (min-width: 1025px) {
  - Multi-column grid
  - Full navigation
  - Max-width container (7xl)
}
```

---

## 🚀 Performance

### Optimizations

- ✅ **React Query**: Data caching ve automatic refetch
- ✅ **Lazy Loading**: Dynamic imports (TODO)
- ✅ **Image Optimization**: Next.js Image component
- ✅ **Code Splitting**: Route-based splitting
- ✅ **Memo**: useMemo, useCallback (where needed)

### Loading States

- ✅ Skeleton screens (TODO)
- ✅ Spinner loading
- ✅ Progressive enhancement

---

## 🔄 State Management

### Local State (useState)

```typescript
- Form inputs
- UI state (modals, menus)
- Loading states
```

### Server State (React Query)

```typescript
- Diets data
- Messages data
- Unread counts
```

### Auth State (Supabase)

```typescript
- User session
- Auth token
- User info
```

---

## 📚 Dokümantasyon

1. **CLIENT_WEB_GUIDE.md**: Kullanım rehberi
2. **CLIENT_WEB_TESTING.md**: Test senaryoları
3. **CLIENT_WEB_SUMMARY.md**: Bu dosya (özet)

---

## ✅ Tamamlanan Görevler

- [x] Login sayfası güncelleme (Diyetisyen/Danışan seçimi)
- [x] Client register sayfası (/register-client)
- [x] Ana sayfa rol bazlı yönlendirme
- [x] Client layout ve navigation
- [x] Client dashboard
- [x] Diyet listesi ve detayı
- [x] Mesajlaşma sistemi
- [x] Okunmamış mesajlar tracking
- [x] Pending approval sayfası
- [x] Reference code sistemi
- [x] PDF indirme
- [x] Fotoğraf upload
- [x] Responsive tasarım

---

## 🔮 Gelecek Planlar

### Kısa Vadeli (1-2 Hafta)

- [ ] **Web Push Notifications**: Browser notifications
- [ ] **Profile Edit**: Client bilgilerini güncelleme
- [ ] **Settings Page**: Bildirim tercihleri
- [ ] **Dark Mode**: Karanlık tema

### Orta Vadeli (1-2 Ay)

- [ ] **Progress Tracking**: Kilo, ölçü takibi
- [ ] **Charts & Graphs**: İlerleme grafikleri
- [ ] **Food Diary**: Besin günlüğü
- [ ] **Appointment System**: Randevu alma

### Uzun Vadeli (3+ Ay)

- [ ] **Video Call**: Diyetisyenle görüntülü görüşme
- [ ] **Recipe Suggestions**: AI destekli tarif önerileri
- [ ] **Shopping List**: Otomatik alışveriş listesi
- [ ] **Meal Planning**: Haftalık öğün planı

---

## 🤝 Katkıda Bulunma

Yeni özellik eklerken:

1. **Feature branch** oluştur
2. **Dokümantasyon** yaz
3. **Test** yaz
4. **PR** aç
5. **Review** bekle

---

## 📞 İletişim

- **GitHub**: [Repository Link]
- **Email**: [Support Email]
- **Discord**: [Community Link]

---

**Versiyon**: 1.0.0  
**Tarih**: 1 Kasım 2025  
**Durum**: ✅ Production Ready  
**Hazırlayan**: AI Asistan

