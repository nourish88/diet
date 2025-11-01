# Client (Danışan) Web Uygulaması Kullanım Rehberi

## 📱 Genel Bakış

Client web uygulaması, danışanların beslenme programlarını görüntülemesine, diyetisyenle mesajlaşmasına ve kendi sağlık bilgilerini takip etmesine olanak tanır.

## 🚀 Başlangıç

### 1. Kayıt Olma (İlk Kullanıcılar)

1. **Login sayfasına gidin**: `http://localhost:3000/login`
2. **"Danışan" sekmesini seçin**
3. **"Danışan Kaydı Oluştur" butonuna tıklayın**
4. Kayıt formunu doldurun:
   - E-posta adresi
   - Şifre (en az 6 karakter)
   - Şifre tekrar
5. **"Kayıt Ol" butonuna tıklayın**
6. ✅ **Referans kodunuzu kaydedin!** (Örnek: `ABC123`)

### 2. Referans Kodu Paylaşma

1. Aldığınız referans kodunu **diyetisyeninize** verin
2. Diyetisyen web panelinden:
   - `/pending-clients` sayfasına gidecek
   - Referans kodunuzu kullanarak sizi mevcut danışan kaydınızla eşleştirecek
   - Onaylayacak

### 3. Giriş Yapma

1. **Login sayfasına gidin**: `http://localhost:3000/login`
2. **"Danışan" sekmesini seçin**
3. Email ve şifrenizi girin
4. **"Danışan Girişi" butonuna tıklayın**

**Onaylanmadıysanız:**
- `Pending Approval` sayfasına yönlendirilirsiniz
- Referans kodunuzu görebilir ve durumu kontrol edebilirsiniz

**Onaylandıysanız:**
- Otomatik olarak `/client` dashboard'una yönlendirilirsiniz

## 📊 Dashboard (Anasayfa)

### Özellikler

✅ Hoş geldin mesajı (adınız ve soyadınız)  
✅ **Beslenme Programlarım** kartı  
✅ **Okunmamış Mesajlar** kartı (badge ile sayı gösterimi)  
✅ Kişisel bilgileriniz (e-posta, telefon, doğum tarihi, cinsiyet)

### Navigasyon

Üst menüden:
- 🏠 **Anasayfa**: Dashboard
- 🍽️ **Diyetlerim**: Tüm beslenme programlarınız
- 💬 **Mesajlar**: Okunmamış mesajlarınız
- 👤 **Kullanıcı Menüsü**: Ad, soyad, e-posta, çıkış butonu

## 🍽️ Diyetlerim

### Liste Görünümü

Her diyet kartında:
- 📅 Diyet numarası ve tarihi
- 🕐 Öğün sayısı
- 🎯 Hedef bilgisi (varsa)
- 💬 Okunmamış mesaj sayısı (varsa, kırmızı badge)
- 🎂 Özel günler (doğum günü, kutlamalar)

### Diyet Detayı

Bir diyete tıkladığınızda:

#### Özet Bilgiler
- 💧 **Su Tüketimi**: Günlük su hedefi
- 🎯 **Hedef**: Beslenme hedefi
- 📊 **Sonuç**: Beklenen sonuç
- 🏃 **Fiziksel Aktivite**: Önerilen aktiviteler
- 📝 **Diyetisyen Notu**: Özel notlar

#### Öğünler
- Her öğün için:
  - ⏰ Öğün saati
  - 🥗 Besin listesi
  - 📏 Miktar ve birim bilgileri

#### Aksiyonlar
- 📥 **PDF İndir**: Diyetinizi PDF olarak indirin
- 💬 **Diyetisyenimle İletişime Geç**: Mesajlaşma sayfasına gidin

## 💬 Mesajlaşma

### Mesaj Gönderme

1. Diyet detay sayfasından **"Diyetisyenimle İletişime Geç"** butonuna tıklayın
2. Mesaj yazın
3. İsterseniz öğün seçin (hangi öğünle ilgili olduğunu belirtmek için)
4. İsterseniz fotoğraf ekleyin (📷 butonu)
5. **Gönder** butonuna tıklayın

### Fotoğraf Ekleme

- Maksimum 5 fotoğraf eklenebilir
- Fotoğraflar 12 saat sonra otomatik silinir (gizlilik için)
- Format: JPG, PNG

### Okunmamış Mesajlar

`/client/unread-messages` sayfasından:
- Tüm okunmamış mesajlarınızı görebilirsiniz
- Hangi diyetle ilgili olduğunu görebilirsiniz
- Hangi öğünle ilgili olduğunu görebilirsiniz
- Son mesaj önizlemesi ve zamanı

### Otomatik Okundu İşaretleme

- Mesajlaşma sayfasını açtığınızda
- Diyetisyenin gönderdiği mesajlar otomatik olarak "okundu" işaretlenir
- Diyetisyen bunları anlık olarak görebilir

## 🔔 Bildirimler

### Push Notifications (Yakında)

- Diyetisyeniniz mesaj gönderdiğinde bildirim alırsınız
- Web push notification ile
- Gerçek zamanlı güncellemeler

## 🎨 Tasarım ve UX

### Renkler

- **Mavi tonları**: Client teması
- **Gradient'ler**: Modern görünüm
- **Kart sistemi**: Düzenli içerik
- **Hover efektleri**: İnteraktif deneyim

### Responsive

- ✅ Mobil uyumlu
- ✅ Tablet uyumlu
- ✅ Desktop uyumlu

## 🔒 Güvenlik

### Authentication

- Session bazlı (Supabase)
- Token ile API çağrıları
- Otomatik logout (session sona ererse)

### Authorization

- Sadece kendi diyetlerinizi görebilirsiniz
- Sadece kendi mesajlarınıza erişebilirsiniz
- Rol kontrolü (client olmalısınız)

### Data Privacy

- Fotoğraflar 12 saat sonra silinir
- Mesajlar şifrelenmiş bağlantı üzerinden
- Kişisel veriler güvende

## 🆘 Sık Karşılaşılan Sorunlar

### "Pending Approval" ekranında takılı kaldım

**Çözüm:**
1. Referans kodunuzu diyetisyeninize verdiğinizden emin olun
2. Diyetisyen kodunuzu kullanarak sizi eşleştirmeli
3. "Durumu Kontrol Et" butonuna tıklayın
4. Hala devam ediyorsa, diyetisyeninizle iletişime geçin

### Diyetlerim görünmüyor

**Çözüm:**
1. Diyetisyeninizin size diyet oluşturmuş olması gerekir
2. Onaylanmış olmanız gerekir (`isApproved: true`)
3. Sayfayı yenileyin (yenile butonu veya aşağı kaydırın)

### Mesaj gönderemiyorum

**Çözüm:**
1. İnternet bağlantınızı kontrol edin
2. Session'ınız geçerli mi kontrol edin (çıkış yapıp tekrar girin)
3. Tarayıcı console'unu açın ve hata mesajlarını kontrol edin

### PDF indiremiyor

**Çözüm:**
1. Tarayıcınızın pop-up engelleyicisini devre dışı bırakın
2. PDF indirme izinlerini kontrol edin
3. Farklı bir tarayıcı deneyin

## 📱 Mobil vs Web

### Mobil Uygulama

- Push notifications
- Daha hızlı
- Offline destek (yakında)
- Expo Go ile test

### Web Uygulaması

- Tarayıcıdan erişim
- Kurulum gerektirmez
- Masaüstünde daha rahat
- Paylaşım kolay

## 🔄 Güncellemeler

### Son Güncellemeler

- ✅ Okunmamış mesaj sistemi
- ✅ Unread messages tracking
- ✅ Dashboard unread count
- ✅ Client web interface
- ✅ Client registration flow
- ✅ Reference code system

### Yakında

- 🔔 Push notifications (web)
- 📊 İlerleme grafikleri
- 🎯 Hedef takibi
- 📅 Randevu sistemi
- 💬 Video görüşme

## 📞 Destek

Sorunlarınız için:
1. Diyetisyeninizle iletişime geçin
2. Sistem yöneticisine ulaşın
3. GitHub Issues açın

---

**Hazırlayan**: AI Asistan  
**Tarih**: 1 Kasım 2025  
**Versiyon**: 1.0.0

