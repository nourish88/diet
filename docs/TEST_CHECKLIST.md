# Test Checklist - API Client Migration

## 🎯 Migrate Edilen Dosyalar

1. ✅ `app/clients/[id]/page.tsx`
2. ✅ `app/besinler/page.tsx`
3. ✅ `app/birthdays/page.tsx`
4. ✅ `components/DietForm.tsx`
5. ✅ `components/DietFormBasicFields.tsx`
6. ✅ `components/BannedBesinManager.tsx`
7. ✅ `components/MenuItem.tsx`
8. ✅ `components/ClientSelector.tsx`
9. ✅ `components/SmartBesinInput.tsx`

---

## 📋 Test Edilecek Sayfalar ve Senaryolar

### 1. **Danışan Detay Sayfası** (`/clients/[id]`)

**Dosya:** `app/clients/[id]/page.tsx`

**Test Senaryoları:**

- [ ] Sayfa yükleniyor mu? (client data fetch)
- [ ] Unread messages sayısı gösteriliyor mu? (30 saniyede bir otomatik refresh)
- [ ] Progress entries listesi yükleniyor mu?
- [ ] Exercise logs listesi yükleniyor mu?
- [ ] Date range filtreleri çalışıyor mu? (progress ve exercise için)
- [ ] "İlişki Kaldır" butonu çalışıyor mu? (unlink functionality)
- [ ] İlişkili email adresi gösteriliyor mu?
- [ ] Progress chart'ları render ediliyor mu?
- [ ] Exercise chart'ları render ediliyor mu?

**Önemli:** Bu sayfada 4 farklı API endpoint'i `apiClient` ile çağrılıyor.

---

### 2. **Besinler Sayfası** (`/besinler`)

**Dosya:** `app/besinler/page.tsx`

**Test Senaryoları:**

- [ ] Besinler listesi yükleniyor mu?
- [ ] Infinite scroll çalışıyor mu? (sayfa sonuna gelindiğinde yeni besinler yükleniyor mu?)
- [ ] Arama (search) fonksiyonu çalışıyor mu?
- [ ] Besin silme işlemi çalışıyor mu?
- [ ] Silme sonrası liste güncelleniyor mu?

**Önemli:** Infinite query ve delete işlemi `apiClient` ile yapılıyor.

---

### 3. **Doğum Günleri Sayfası** (`/birthdays`)

**Dosya:** `app/birthdays/page.tsx`

**Test Senaryoları:**

- [ ] Bugün doğum günü olan danışanlar listeleniyor mu?
- [ ] "WhatsApp ile Kutla" butonu görünüyor mu? (telefon numarası olanlar için)
- [ ] WhatsApp butonuna basınca WhatsApp açılıyor mu?
- [ ] WhatsApp mesajı doğru formatta mı? (önceden hazırlanmış mesaj)
- [ ] Telefon numarası olmayan danışanlarda buton gizli mi?

**Önemli:** PWA ve web için WhatsApp deep link açılış stratejisi test edilmeli.

---

### 4. **Yeni Diyet Oluşturma** (`/diets/new`)

**Dosya:** `components/DietForm.tsx`

**Test Senaryoları:**

- [ ] Sayfa yükleniyor mu?
- [ ] Client selector açılıyor mu?
- [ ] Client seçildiğinde client bilgileri yükleniyor mu?
- [ ] Son diyet otomatik yükleniyor mu? (loadLatestDiet)
- [ ] Son diyet yoksa boş form mu açılıyor?
- [ ] Menu item ekleme çalışıyor mu?
- [ ] Besin arama (SmartBesinInput) çalışıyor mu?
- [ ] Birim listesi yükleniyor mu? (MenuItem component)
- [ ] Öneriler (suggestions) geliyor mu?
- [ ] Diyet kaydetme çalışıyor mu? (POST request)
- [ ] Kaydetme sonrası yönlendirme doğru mu? (`/diets/[id]`)

**Kritik Component'ler:**

- `DietForm` - Ana form
- `DietFormBasicFields` - Tarih, su tüketimi, fiziksel aktivite
- `ClientSelector` - Danışan seçimi
- `MenuItem` - Besin, miktar, birim inputları
- `SmartBesinInput` - Besin arama ve öneriler
- `BannedBesinManager` - Yasaklı besinler (client detay sayfasında ama DietForm'da da kullanılıyor olabilir)

---

### 5. **Diyet Güncelleme** (`/diets/new?updateDietId=XXX`)

**Dosya:** `components/DietForm.tsx`

**Test Senaryoları:**

- [ ] URL'de `updateDietId` parametresi var mı?
- [ ] Diyet detayları yükleniyor mu? (loadDietById)
- [ ] Form alanları diyet verileri ile doldurulmuş mu?
- [ ] "Güncelle" butonu görünüyor mu? (Kaydet değil)
- [ ] Güncelleme işlemi çalışıyor mu? (PUT request)
- [ ] Güncelleme sonrası cache invalidate ediliyor mu?
- [ ] Menu item'lar güncelleniyor mu?
- [ ] Client bilgileri korunuyor mu?

**Önemli:** Update mode ile create mode arasındaki farklar test edilmeli.

---

### 6. **Yasaklı Besinler Yönetimi**

**Dosya:** `components/BannedBesinManager.tsx`

**Test Senaryoları:**

- [ ] Besinler listesi yükleniyor mu? (200 besin)
- [ ] Yasaklı besin ekleme çalışıyor mu?
- [ ] Yasaklı besin silme (X butonu) çalışıyor mu?
- [ ] Sebep (reason) girilebiliyor mu?
- [ ] Liste güncelleniyor mu? (ekleme/silme sonrası)

**Not:** Bu component client detay sayfasında (`/clients/[id]`) kullanılıyor.

---

### 7. **Component İzolasyon Testleri**

#### `ClientSelector` Component

- [ ] Arama input'una yazınca sonuçlar geliyor mu?
- [ ] Debounce çalışıyor mu? (300ms)
- [ ] Client seçimi çalışıyor mu?
- [ ] Seçilen client adı gösteriliyor mu?

#### `SmartBesinInput` Component

- [ ] Besin arama çalışıyor mu?
- [ ] Öneriler (suggestions) gösteriliyor mu?
- [ ] Yeni besin ekleme dialogu açılıyor mu?
- [ ] Besin grubu seçimi çalışıyor mu?
- [ ] Yeni besin kaydedildikten sonra input güncelleniyor mu?

#### `MenuItem` Component

- [ ] Besin seçimi çalışıyor mu?
- [ ] Birim listesi yükleniyor mu?
- [ ] Miktar girişi çalışıyor mu?
- [ ] Öneri seçildiğinde miktar/birim otomatik dolduruluyor mu?
- [ ] Silme (trash icon) çalışıyor mu?

---

## 🔍 Özel Test Senaryoları

### API Client Özellikleri

- [ ] Authorization header otomatik ekleniyor mu?
- [ ] Session cache çalışıyor mu? (60 saniye TTL)
- [ ] 401/403 hatalarında login'e yönlendirme yapılıyor mu?
- [ ] Request interceptor'lar çalışıyor mu? (varsa)
- [ ] Response interceptor'lar çalışıyor mu? (varsa)

### Hata Durumları

- [ ] 404 hataları doğru handle ediliyor mu?
- [ ] Network hataları doğru gösteriliyor mu?
- [ ] Error toast'ları görünüyor mu?
- [ ] Loading state'leri doğru gösteriliyor mu?

### PWA Özellikleri

- [ ] WhatsApp açılışı PWA'da çalışıyor mu?
- [ ] WhatsApp açılışı web'de çalışıyor mu?
- [ ] Image upload gallery erişimi var mı? (sadece camera değil)

---

## ⚠️ Kritik Test Noktaları

### En Önemli Testler (Öncelikli)

1. **Diyet Oluşturma** (`/diets/new`)

   - Client seçimi
   - Menu item ekleme
   - Diyet kaydetme

2. **Diyet Güncelleme** (`/diets/new?updateDietId=XXX`)

   - Diyet yükleme
   - Form doldurma
   - Güncelleme işlemi

3. **Danışan Detay** (`/clients/[id]`)

   - Tüm verilerin yüklenmesi
   - Unread messages (30 saniye refresh)

4. **Besinler Listesi** (`/besinler`)
   - Infinite scroll
   - Arama
   - Silme

### Orta Öncelik

- Doğum günleri sayfası
- Yasaklı besinler yönetimi
- Component izolasyon testleri

### Düşük Öncelik (genel akış)

- PWA özellikleri
- Error handling
- Loading states

---

## 🚀 Test Sırası Önerisi

1. **İlk:** Basit sayfalar (besinler, birthdays)
2. **İkinci:** Component'ler (ClientSelector, SmartBesinInput, MenuItem)
3. **Üçüncü:** Diyet formu (yeni diyet oluşturma)
4. **Dördüncü:** Diyet güncelleme
5. **Son:** Danışan detay sayfası (en karmaşık)

---

## 📝 Notlar

- Tüm API çağrıları artık `apiClient` üzerinden yapılıyor
- Session cache 60 saniye TTL ile çalışıyor
- Request/Response interceptor'lar kullanılabilir
- 401/403 hatalarında otomatik login'e yönlendirme var
- Build başarılı ✅

---

## 🐛 Olası Sorunlar

1. **Session cache:** Eğer auth token güncelleniyorsa, cache temizlenmeli
2. **404 handling:** Bazı endpoint'lerde 404 beklenen bir durum (örn: son diyet yok)
3. **Infinite scroll:** Sayfa sonuna gelindiğinde yeni veriler yüklenmeli
4. **WhatsApp deep link:** PWA ve web'de farklı davranışlar olabilir

---

**Son Güncelleme:** Build hatası çözüldü, kritik 10+ dosya migrate edildi ✅
