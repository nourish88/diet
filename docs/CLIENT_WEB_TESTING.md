# Client Web Uygulaması Test Rehberi

## 🧪 Test Senaryoları

### Scenario 1: Yeni Danışan Kaydı

#### Adımlar:

1. **Tarayıcıyı açın ve login sayfasına gidin:**
   ```
   http://localhost:3000/login
   ```

2. **"Danışan" sekmesine tıklayın**
   - Mavi renk olmalı (active)
   - "Danışan Kaydı Oluştur" butonu görünmeli

3. **"Danışan Kaydı Oluştur" butonuna tıklayın**
   - `/register-client` sayfasına yönlendirilmelisiniz

4. **Kayıt formunu doldurun:**
   ```
   Email: test@example.com
   Şifre: test123
   Şifre Tekrar: test123
   ```

5. **"Kayıt Ol" butonuna tıklayın**

#### Beklenen Sonuç:

✅ Başarılı kayıt mesajı gösterilmeli  
✅ **Referans kodu** gösterilmeli (örn: `ABC123`)  
✅ 3 saniye sonra otomatik olarak `/pending-approval` sayfasına yönlendirilmeli

#### Pending Approval Sayfası:

- ⏰ "Hesabınız Onay Bekliyor" başlığı
- 🔢 Referans kodu gösterilmeli (büyük, mavi kutu)
- 📝 Adım adım talimatlar
- ✅ "Durumu Kontrol Et" butonu
- 🚪 "Çıkış Yap" butonu

---

### Scenario 2: Diyetisyen Tarafından Onaylama

#### Adımlar (Diyetisyen):

1. **Diyetisyen olarak giriş yapın**
   ```
   http://localhost:3000/login
   Diyetisyen sekmesi -> Email/Password
   ```

2. **Pending Clients sayfasına gidin:**
   ```
   http://localhost:3000/pending-clients
   ```

3. **Bekleyen danışanı bulun**
   - Referans kodu gözükecek
   - Email adresi gözükecek

4. **"Match & Approve" butonuna tıklayın**

5. **Mevcut bir client seçin** (dropdown'dan)

6. **"Approve" butonuna tıklayın**

#### Beklenen Sonuç:

✅ "Client approved successfully" mesajı  
✅ Danışan listeden kaldırılmalı  
✅ Seçilen client'a `userId` atanmalı

---

### Scenario 3: Danışan Giriş ve Dashboard

#### Adımlar:

1. **Logout yapın** (eğer hala diyetisyen olarak giriş yaptıysanız)

2. **Login sayfasına gidin:**
   ```
   http://localhost:3000/login
   ```

3. **"Danışan" sekmesine tıklayın**

4. **Kayıt olduğunuz bilgilerle giriş yapın:**
   ```
   Email: test@example.com
   Şifre: test123
   ```

5. **"Danışan Girişi" butonuna tıklayın**

#### Beklenen Sonuç:

✅ Başarılı giriş  
✅ Otomatik olarak `/client` dashboard'una yönlendirilmeli  
✅ Hoş geldin mesajı görünmeli: "Hoş Geldiniz, [İsim]!"  
✅ 2 ana kart görünmeli:
   - 🍽️ Beslenme Programlarım
   - 💬 Okunmamış Mesajlar (badge: 0)
✅ Kişisel bilgiler kartı görünmeli

---

### Scenario 4: Diyetleri Görüntüleme

#### Önkoşul:
Diyetisyen bu client için en az 1 diyet oluşturmuş olmalı.

#### Adımlar:

1. **Dashboard'dan "Beslenme Programlarım" kartına tıklayın**
   - Veya üst menüden "Diyetlerim" linkine tıklayın

2. **Diyet listesini görüntüleyin**

#### Beklenen Sonuç:

✅ Tüm diyetler listelenmelidir  
✅ Her diyet için:
   - 📋 Diyet numarası
   - 📅 Tarih
   - 🕐 Öğün sayısı
   - 🎯 Hedef (varsa)
   - 💬 Okunmamış mesaj sayısı (varsa)

---

### Scenario 5: Diyet Detayı

#### Adımlar:

1. **Diyet listesinden bir diyete tıklayın**

#### Beklenen Sonuç:

✅ Diyet detay sayfası açılmalı  
✅ Özet bilgiler görünmeli:
   - 💧 Su Tüketimi
   - 🎯 Hedef
   - 📊 Sonuç
   - 🏃 Fiziksel Aktivite

✅ Öğünler listelenmelidir:
   - Öğün adı ve saati
   - Besin listesi
   - Miktar ve birimler

✅ Aksiyonlar:
   - 📥 "PDF Olarak İndir" butonu
   - 💬 "Diyetisyenimle İletişime Geç" butonu

---

### Scenario 6: Mesajlaşma

#### Adımlar:

1. **Diyet detay sayfasından "Diyetisyenimle İletişime Geç" butonuna tıklayın**

2. **Mesaj yazın:**
   ```
   "Merhaba, bu diyetle ilgili bir sorum var."
   ```

3. **İsteğe bağlı: Öğün seçin** (dropdown'dan)

4. **"Gönder" butonuna tıklayın**

#### Beklenen Sonuç:

✅ Mesaj gönderilmeli  
✅ Mesaj listesinde görünmeli  
✅ "Siz" etiketi olmalı (kendi mesajınız)  
✅ Mesaj input'u temizlenmeli

---

### Scenario 7: Fotoğraf Ekleme

#### Adımlar:

1. **Mesajlaşma sayfasında 📷 butona tıklayın**

2. **Fotoğraf seçin** (maks 5 adet)

3. **Mesaj yazın ve gönder**

#### Beklenen Sonuç:

✅ Fotoğraflar yüklenmelidir  
✅ Mesajın altında thumbnail'ler görünmeli  
✅ Tıklanınca büyük görünmeli (lightbox)

#### Not:
⚠️ Fotoğraflar 12 saat sonra otomatik silinir (cron job)

---

### Scenario 8: Okunmamış Mesajlar

#### Önkoşul:
Diyetisyen size mesaj göndermiş olmalı.

#### Adımlar:

1. **Dashboard'a gidin** (`/client`)

2. **"Okunmamış Mesajlar" kartına bakın**
   - Badge'de sayı görünmeli (örn: 3)

3. **"Okunmamış Mesajlar" kartına tıklayın**
   - Veya üst menüden "Mesajlar" linkine tıklayın

#### Beklenen Sonuç:

✅ `/client/unread-messages` sayfası açılmalı  
✅ Tüm okunmamış mesajlar listelenmelidir:
   - Hangi diyetle ilgili
   - Hangi öğünle ilgili (varsa)
   - Son mesaj içeriği
   - Kaç mesaj okunmadı

✅ Bir conversation'a tıklayınca:
   - Mesajlaşma sayfasına yönlendirilmelisiniz
   - Mesajlar otomatik "okundu" işaretlenmelidir

---

### Scenario 9: Çıkış ve Tekrar Giriş

#### Adımlar:

1. **Sağ üst köşeden kullanıcı menüsüne tıklayın**

2. **"Çıkış" butonuna tıklayın**

3. **Login sayfasına yönlendirilmelisiniz**

4. **Tekrar giriş yapın**

#### Beklenen Sonuç:

✅ Çıkış başarılı  
✅ Session temizlenmiş olmalı  
✅ Tekrar giriş yapınca dashboard'a gidilmeli  
✅ Okunmamış mesajlar hala takip edilmeli (session'lar arası dayanıklı)

---

## 🔍 Edge Cases (Özel Durumlar)

### Case 1: Onaylanmamış Danışan Girişi

**Senaryo:**
- Danışan kayıt oldu ama diyetisyen henüz onaylamadı
- Giriş yapmaya çalışıyor

**Beklenen:**
✅ Login başarılı olmalı  
✅ Ama `/pending-approval` sayfasına yönlendirilmeli  
✅ Dashboard'a erişememeli

---

### Case 2: Diyeti Olmayan Danışan

**Senaryo:**
- Danışan onaylandı
- Ama diyetisyen henüz diyet oluşturmadı

**Beklenen:**
✅ Dashboard açılmalı  
✅ "Diyetlerim" sayfası boş liste göstermeli:
   - 📋 "Henüz beslenme programınız yok" mesajı
   - Bilgilendirme metni

---

### Case 3: Eski Fotoğraflar

**Senaryo:**
- 12 saatten eski fotoğraflar var

**Beklenen:**
✅ Cron job her saat çalışmalı  
✅ 12 saatten eski fotoğraflar silinmeli:
   - Dosya sistemden
   - Veritabanından
   - Supabase Storage'dan

---

## 🛠️ Debug Araçları

### Console Logs

Tarayıcı console'unda şunları görmelisiniz:

```javascript
// Başarılı kayıt
✅ Supabase signup successful: <user-id>
✅ Database sync successful: { user: {...}, referenceCode: "ABC123" }

// Başarılı giriş
🔄 Redirecting authenticated user to home
✅ User: test@example.com
✅ Database user: test@example.com

// Mesajlaşma
📧 Loading messages for diet: 123
✅ Loaded 5 messages
📤 Sending message...
✅ Message sent successfully

// Okunmamış mesajlar
📧 Loading unread count...
✅ Loaded 3 unread messages
📖 Marking messages as read: [1, 2, 3]
✅ Marked 3 messages as read
```

### Network Tab

API çağrılarını kontrol edin:

```
POST /api/auth/sync - 200 OK
GET /api/clients/[id]/diets - 200 OK
GET /api/clients/[id]/diets/[dietId] - 200 OK
GET /api/clients/[id]/unread-messages - 200 OK
POST /api/clients/[id]/diets/[dietId]/messages - 200 OK
PATCH /api/clients/[id]/diets/[dietId]/messages - 200 OK
```

---

## ✅ Test Checklist

### Kayıt ve Onay
- [ ] Client kayıt olabiliyor
- [ ] Reference code oluşturuluyor
- [ ] Pending approval sayfası görünüyor
- [ ] Diyetisyen approve edebiliyor
- [ ] Approve sonrası giriş yapabiliyor

### Dashboard
- [ ] Hoş geldin mesajı görünüyor
- [ ] Beslenme programları kartı görünüyor
- [ ] Okunmamış mesajlar kartı görünüyor
- [ ] Kişisel bilgiler görünüyor

### Diyetler
- [ ] Diyet listesi yükleniyor
- [ ] Diyet detayı açılabiliyor
- [ ] PDF indirilebiliyor
- [ ] Öğünler doğru görünüyor

### Mesajlaşma
- [ ] Mesaj gönderebiliyor
- [ ] Mesaj alıyor (diyetisyenden)
- [ ] Fotoğraf eklenebiliyor
- [ ] Okundu işaretleme çalışıyor

### Navigasyon
- [ ] Top navigation çalışıyor
- [ ] Logout çalışıyor
- [ ] Route'lar doğru yönlendiriyor

---

## 🐛 Bilinen Sorunlar

### None (Tüm özellikler çalışıyor! 🎉)

---

## 📝 Not

Bu test rehberi manuel test içindir. Otomatik testler için:
- Jest testleri yazılabilir
- Cypress E2E testleri eklenebilir
- Playwright kullanılabilir

---

**Test Eden**: _______________  
**Tarih**: _______________  
**Durum**: ⬜ Passed | ⬜ Failed  
**Notlar**: _______________

