# Check-in ve su bildirimi zamanlaması

Bildirim içerikleri, alıcıları ve haftalık check-in yanıtları uygulamanın
`DATABASE_URL` ile bağlı olduğu Neon PostgreSQL veritabanında kalıcı olarak
saklanır. Supabase bu kurulumda Auth, Vault ve `pg_cron`/`pg_net` zamanlayıcısı
olarak kullanılır; uygulama tabloları boş Supabase `public` şemasına kopyalanmaz.
`vercel.json` içinde cron tanımı kullanılmaz.

## Önerilen saatler (Europe/Istanbul)

| İş | Türkiye saati | UTC cron | Endpoint |
| --- | --- | --- | --- |
| Su hatırlatması | Her gün 12:00 | `0 9 * * *` | `/api/cron/daily-client-notifications?slot=12` |
| Su hatırlatması | Her gün 17:00 | `0 14 * * *` | `/api/cron/daily-client-notifications?slot=17` |
| Haftalık check-in | Pazar 18:30 | `30 15 * * 0` | `/api/cron/weekly-check-ins?mode=initial` |
| Doldurmayanlara tek hatırlatma | Pazartesi 10:00 | `0 7 * * 1` | `/api/cron/weekly-check-ins?mode=reminder` |

Türkiye kalıcı olarak UTC+3 kullandığı için saatler yıl boyunca değişmez.
Endpointler `CRON_SECRET` ile korunur ve tekrar çağrılsalar bile günlük/haftalık
tekilleştirme anahtarları mükerrer bildirim oluşturulmasını önler.

## Supabase Cron örneği

Supabase Dashboard üzerinden `pg_cron`, `pg_net` ve Vault etkinleştirildikten
sonra Vault'a aşağıdaki iki secret eklenir:

- `diet_app_base_url`: uygulamanın `https://...` kök adresi
- `diet_app_cron_secret`: uygulamadaki `CRON_SECRET` ile aynı değer

Ardından SQL Editor'da aşağıdaki işler tanımlanabilir:

```sql
select cron.schedule(
  'daily-active-client-water-reminder',
  '0 9 * * *',
  $$
  select net.http_get(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'diet_app_base_url')
      || '/api/cron/daily-client-notifications?slot=12',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'diet_app_cron_secret')
    )
  );
  $$
);

select cron.schedule(
  'daily-active-client-water-reminder-17-tr',
  '0 14 * * *',
  $$
  select net.http_get(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'diet_app_base_url')
      || '/api/cron/daily-client-notifications?slot=17',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'diet_app_cron_secret')
    )
  );
  $$
);

select cron.schedule(
  'weekly-client-check-in',
  '30 15 * * 0',
  $$
  select net.http_get(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'diet_app_base_url')
      || '/api/cron/weekly-check-ins?mode=initial',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'diet_app_cron_secret')
    )
  );
  $$
);

select cron.schedule(
  'weekly-client-check-in-reminder',
  '0 7 * * 1',
  $$
  select net.http_get(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'diet_app_base_url')
      || '/api/cron/weekly-check-ins?mode=reminder',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'diet_app_cron_secret')
    )
  );
  $$
);
```

Su ve check-in bildirimleri yalnızca `Client.isActive = true`, portal hesabıyla
eşleşmiş danışanlar için oluşturulur. Push izni olmayan danışanlarda da kalıcı
bildirim kaydı Neon veritabanında tutulur.

## Tek danışanla güvenli test

Toplu üretim uçlarını elle çağırmak yerine geçici test ucu kullanılmalıdır:

```text
GET /api/cron/test-client-notification?clientId=CLIENT_ID&type=water
GET /api/cron/test-client-notification?clientId=CLIENT_ID&type=check-in
Authorization: Bearer CRON_SECRET
```

Bu uç yalnızca verilen aktif ve portal hesabıyla eşleşmiş danışana gönderim
yapar. Her test Neon'da `test_water` veya `test_check_in` türüyle kalıcı
olarak kaydedilir. `check-in` testi `isTest = true` olan gerçek ve doldurulabilir
bir form üretir; gerçek Pazar check-in kaydından ayrı tutulur ve üretim
zamanlamalarının tekilleştirme anahtarlarını etkilemez.
