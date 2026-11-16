# Öğün Hatırlatıcı Sistemi Kurulumu

## Genel Bakış

Bu sistem, PWA kullanıcılarına öğün saatlerinden 30 dakika önce otomatik bildirim gönderir. Sistem Supabase pg_cron kullanarak her 15 dakikada bir çalışır.

## Özellikler

- Son 14 gün içinde diyeti olan kullanıcılar için çalışır
- Her öğünden 30 dakika önce bildirim gönderir
- Kullanıcı bildirim tercihlerini açıp kapatabilir
- Web push notification kullanır
- Client-side check desteği (kullanıcı uygulamayı açtığında)

## Kurulum

### 1. Supabase pg_cron Extension'ını Etkinleştir

1. Supabase Dashboard'a gidin
2. Database -> Extensions sekmesine gidin
3. `pg_cron` extension'ını bulun ve etkinleştirin

### 2. Vault ve CRON_SECRET ayarla

Yayın ortamında `CRON_SECRET` tanımlayın. Supabase Vault'a iki secret ekleyin:

- `diet_app_base_url`: uygulamanın HTTPS kök adresi (sonunda `/` olmadan)
- `diet_app_cron_secret`: yayın ortamındaki `CRON_SECRET` ile aynı değer

Vault uzantısını Supabase Dashboard üzerinden etkinleştirin. Bu ayarlar birbirinin alternatifi değildir; zamanlayıcının gönderdiği sır ile uygulamanın beklediği sır eşleşmelidir. Uygulama tablolarını Supabase'e taşımayın.

### 3. Cron Job Oluştur

Supabase SQL Editor'de aşağıdaki SQL'i çalıştırın. Aynı görev adıyla yeniden çalıştırmak görevin zamanlamasını/komutunu günceller.

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'meal-reminders-every-15-min',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'diet_app_base_url')
      || '/api/cron/meal-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' ||
        (select decrypted_secret from vault.decrypted_secrets where name = 'diet_app_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);
```

Uygulama kapalıyken bildirimler bu sunucu görevi sayesinde gönderilir. Sayfa açılışındaki kontrol görevin yerini tutmaz. Bu projede `vercel.json` cron tanımlamaz.

### 4. Web Push VAPID Keys Ayarla

Vercel environment variables'a ekleyin:

```
WEB_PUSH_PUBLIC_KEY=your-public-key
WEB_PUSH_PRIVATE_KEY=your-private-key
WEB_PUSH_CONTACT_EMAIL=mailto:your-email@example.com
```

Tarayıcı açık anahtarı `/api/push/config` üzerinden sunucudan alır; yeni akış için ayrıca `NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY` gerekmez. Mevcut VAPID anahtar çiftini koruyun. Ayrıntılı yayın/cihaz kontrolü: [PWA-KURULUM-VE-BILDIRIM-KONTROLU.md](PWA-KURULUM-VE-BILDIRIM-KONTROLU.md).

## API Endpoints

### 1. Cron Job Endpoint

- **URL**: `/api/cron/meal-reminders`
- **Method**: GET, POST
- **Authentication**: CRON_SECRET (Bearer token veya query parameter)
- **Purpose**: Tüm uygun kullanıcılar için öğün hatırlatıcılarını kontrol eder ve gönderir

### 2. Client-Side Check Endpoint

- **URL**: `/api/notifications/check-meal-reminders`
- **Method**: GET
- **Authentication**: User session (Supabase)
- **Purpose**: Authenticated kullanıcı için bekleyen hatırlatıcıları kontrol eder ve gönderir

## Kullanıcı Ayarları

Kullanıcılar PWA'da `/client/settings` sayfasından:

- Öğün hatırlatıcılarını açıp kapatabilir
- Bildirim izinlerini yönetebilir
- Manuel olarak hatırlatıcıları kontrol edebilir

## Bildirim Formatı

Bildirim mesajı şu formatta gönderilir:

```
Sayın [Ad] [Soyad], [tarih] tarihinde yazılan diyetinize ilişkin [Öğün Adı] menünüz: [miktar birim besin, miktar birim besin, ...]. [Öğün açıklaması]
```

Örnek:

```
Sayın Ahmet Yılmaz, 15 Ocak 2024 tarihinde yazılan diyetinize ilişkin Kahvaltı menünüz: 2 adet Yumurta, 2 dilim Ekmek, 10 adet Zeytin. Güne sağlıklı bir başlangıç yapın.
```

## Zamanlama Mantığı

- Öğün saati: 08:00
- Reminder saati: 07:30 (30 dakika önce)
- Reminder window: 07:30 - 07:45 (15 dakika)
- Cron job: Her 15 dakikada bir çalışır
- Eğer şu anki zaman reminder window içindeyse, bildirim gönderilir

## Sorun Giderme

### Bildirimler gönderilmiyor

1. Web push VAPID keys'in doğru ayarlandığından emin olun
2. CRON_SECRET'ın doğru ayarlandığından emin olun
3. Supabase cron job'ının çalıştığını kontrol edin:
   ```sql
   SELECT run.* FROM cron.job_run_details AS run
   JOIN cron.job AS job ON job.jobid = run.jobid
   WHERE job.jobname = 'meal-reminders-every-15-min'
   ORDER BY run.start_time DESC LIMIT 10;
   ```
4. Kullanıcının bildirim tercihlerinin açık olduğunu kontrol edin
5. Kullanıcının push subscription'ının olduğunu kontrol edin
6. Kullanıcının son 14 gün içinde diyeti olduğunu kontrol edin

### Cron job çalışmıyor

1. pg_cron extension'ının etkinleştirildiğinden emin olun
2. pg_net extension'ının etkinleştirildiğinden emin olun
3. Cron job'ın doğru schedule'a sahip olduğunu kontrol edin:
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'meal-reminders-every-15-min';
   ```
4. HTTP sonucunu da kontrol edin; başarılı cron SQL çalışması HTTP tesliminin başarılı olduğunu kanıtlamaz:
   ```sql
   SELECT id, status_code, timed_out, error_msg, created
   FROM net._http_response
   ORDER BY created DESC LIMIT 10;
   ```
   401 için `CRON_SECRET` eşleşmesini, zaman aşımı için yayın ortamı süresini ve alan adını kontrol edin.

## Test

### Manuel Test

1. Cron job endpoint'ini manuel olarak test edin:

   ```bash
   curl -X GET "https://your-domain.vercel.app/api/cron/meal-reminders" \
     -H "Authorization: Bearer your-secret"
   ```

2. Client-side check endpoint'ini test edin (authenticated user gerekli):
   ```bash
   curl -X GET "https://your-domain.vercel.app/api/notifications/check-meal-reminders" \
     -H "Authorization: Bearer user-session-token"
   ```

### Test Senaryoları

1. Kullanıcının öğün saatinden 30 dakika önce bildirim alması
2. Kullanıcının bildirim tercihlerini kapatması durumunda bildirim gönderilmemesi
3. Kullanıcının push subscription'ı olmadığında bildirim gönderilmemesi
4. Kullanıcının son 14 günden eski diyeti varsa bildirim gönderilmemesi

## İyileştirmeler

- [ ] Geçmiş hatırlatıcıları takip etme (duplicate önleme)
- [ ] Gruplandırılmış bildirimler (bir kullanıcı için birden fazla öğün varsa)
- [ ] Bildirim istatistikleri
- [ ] Bildirim geçmişi
