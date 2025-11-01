# Diyetisyen-Danışan Mesajlaşma Özelliği

## 📱 Genel Bakış

Danışanlar ve diyetisyenler arasında diyet programlarına özel mesajlaşma sistemi.

### Özellikler

✅ **Danışan (Mobile)**
- Mesaj gönderme (text)
- Fotoğraf ekleme (galeri veya kamera)
- Öğün seçimi (opsiyonel)
- Mesajlaşma geçmişi

✅ **Diyetisyen (Web)**
- Mesajları görüntüleme
- Yanıt gönderme (text)
- Danışan fotoğraflarını görüntüleme
- Mesajlaşma geçmişi

✅ **Teknik**
- Fotoğraflar 12 saat sonra otomatik silinir
- Her diyet programına özel mesajlaşma
- Güvenli authorization ve authentication

---

## 🚀 Kullanım

### Mobile Tarafı (Danışan)

1. **Mesajlaşma Ekranına Erişim**
   - Beslenme programlarım → Bir programa tıkla
   - "Diyetisyenimle İletişime Geç" butonuna tıkla

2. **Mesaj Gönderme**
   - Mesaj kutusuna yazın
   - Enter ile gönderin
   - Shift+Enter ile yeni satır ekleyin

3. **Fotoğraf Ekleme**
   - 📷 Kamera ikonu → Galeri veya kamera seçin
   - Birden fazla fotoğraf eklenebilir
   - Fotoğrafları önizleyip silebilirsiniz

4. **Öğün Seçimi**
   - ⬇️ Dropdown ikonu → Öğün seçin
   - Mesajınız belirli bir öğünle ilişkilendirilir
   - İsteğe bağlıdır

### Web Tarafı (Diyetisyen)

1. **Mesajlaşma Ekranına Erişim**
   - Danışanlar → Bir danışan seç
   - İlgili dietin yanındaki "Mesajlaşma" butonuna tıkla

2. **Mesajları Görüntüleme**
   - Tüm mesajlaşma geçmişini görürsünüz
   - Danışan fotoğrafları gösterilir
   - Öğün bilgileri badge ile gösterilir

3. **Yanıt Gönderme**
   - Mesaj kutusuna yazın
   - "Gönder" butonuna tıklayın veya Enter tuşuna basın

---

## 🗄️ Veritabanı Yapısı

### DietComment (Mesajlar)
```prisma
model DietComment {
  id          Int          @id @default(autoincrement())
  content     String       // Mesaj içeriği
  userId      Int          // Gönderen (client veya dietitian)
  dietId      Int          // Hangi diyet
  ogunId      Int?         // Opsiyonel: Hangi öğün
  photos      MealPhoto[]  // Eklenen fotoğraflar
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
}
```

### MealPhoto (Fotoğraflar)
```prisma
model MealPhoto {
  id          Int           @id @default(autoincrement())
  imageData   String        // Base64 encoded image
  dietId      Int
  ogunId      Int?          // Opsiyonel
  clientId    Int
  commentId   Int?          // Bağlı mesaj
  uploadedAt  DateTime      @default(now())
  expiresAt   DateTime      // 12 saat sonra silinecek
}
```

---

## 🔒 Güvenlik

### Authorization Kontrolü
- **Danışan**: Sadece kendi dietlerindeki mesajları görebilir
- **Diyetisyen**: Sadece kendi danışanlarının mesajlarını görebilir
- **Fotoğraf**: Sadece danışanlar fotoğraf gönderebilir

### Token Kontrolü
- Tüm API istekleri Supabase JWT token ile doğrulanır
- Yetkisiz erişim 401/403 ile engellenir

---

## 🧹 Otomatik Temizlik

### Fotoğraf Silme Job'ı
- **Endpoint**: `/api/cron/cleanup-photos`
- **Schedule**: Her saat başı (Vercel cron)
- **İşlev**: 12 saatten eski fotoğrafları siler

### Manuel Tetikleme
```bash
curl -X POST https://your-domain.com/api/cron/cleanup-photos \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Vercel Deployment
```json
{
  "crons": [{
    "path": "/api/cron/cleanup-photos",
    "schedule": "0 * * * *"
  }]
}
```

---

## 📡 API Endpoints

### GET `/api/clients/[id]/diets/[dietId]/messages`
**Tüm mesajları getir**

**Response:**
```json
{
  "success": true,
  "messages": [
    {
      "id": 1,
      "content": "Sabah kahvaltısı için ne önerirsiniz?",
      "userId": 5,
      "user": {
        "id": 5,
        "email": "client@example.com",
        "role": "client"
      },
      "ogun": {
        "id": 1,
        "name": "Kahvaltı"
      },
      "photos": [
        {
          "id": 10,
          "imageData": "data:image/jpeg;base64,...",
          "uploadedAt": "2025-11-01T08:00:00.000Z",
          "expiresAt": "2025-11-01T20:00:00.000Z"
        }
      ],
      "createdAt": "2025-11-01T08:00:00.000Z"
    }
  ]
}
```

### POST `/api/clients/[id]/diets/[dietId]/messages`
**Yeni mesaj gönder**

**Request Body:**
```json
{
  "content": "Sabah kahvaltısı için ne önerirsiniz?",
  "ogunId": 1,
  "photos": [
    {
      "imageData": "data:image/jpeg;base64,..."
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": {
    "id": 1,
    "content": "...",
    "userId": 5,
    "dietId": 100,
    "ogunId": 1,
    "createdAt": "2025-11-01T08:00:00.000Z"
  }
}
```

---

## 🐛 Troubleshooting

### Mobilde Fotoğraf Çekilemiyor
**Çözüm**: Uygulama ayarlarından kamera ve galeri izinlerini kontrol edin

### Web'de Mesajlar Yüklenmiyor
**Çözüm**: 
1. Tarayıcı konsol hatalarını kontrol edin
2. Authorization token'ın geçerli olduğundan emin olun
3. Network sekmesinden API yanıtlarını inceleyin

### Fotoğraflar Görünmüyor
**Çözüm**:
1. Fotoğrafın 12 saatten eski olup olmadığını kontrol edin
2. Base64 formatın doğru olduğunu kontrol edin
3. Browser console'da image load hatalarını inceleyin

---

## 🔄 Gelecek Geliştirmeler (İsteğe Bağlı)

- [ ] Push notifications (yeni mesaj bildirimi)
- [ ] Mesaj okundu işaretleme
- [ ] Fotoğraf zoom özelliği
- [ ] Mesaj arama
- [ ] Fotoğraf upload progress bar
- [ ] Mesaj silme özelliği
- [ ] Emoji desteği
- [ ] Ses mesajı desteği

---

## 📞 Destek

Herhangi bir sorun için:
- GitHub Issues
- Email: support@dietapp.com

