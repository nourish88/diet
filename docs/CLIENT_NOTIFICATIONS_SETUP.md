# Danışan Bildirimleri Kurulumu

Bu modül iki tür bildirim gönderir:

- Diyetisyen panelinden seçili danışanlara anlık mesaj
- Her gün Türkiye saatiyle 10:00'da diyet bildirimi açık olan tüm danışanlara su hatırlatması

Anlık gönderim cron kullanmaz. Günlük 10:00 bildirimi Supabase `pg_cron` ile API endpoint'ini çağırır.

## Endpoint

- URL: `/api/cron/daily-client-notifications`
- Method: `GET` veya `POST`
- Auth: `CRON_SECRET`
- Saat: `10:00 Europe/Istanbul`
- UTC karşılığı: `07:00`

## Supabase Kurulumu

Supabase SQL Editor'de çalıştırın:

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
```

`YOUR_DOMAIN` ve `YOUR_CRON_SECRET` değerlerini değiştirin:

```sql
SELECT cron.schedule(
  'daily-client-water-reminder-10-tr',
  '0 7 * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://YOUR_DOMAIN/api/cron/daily-client-notifications?secret=YOUR_CRON_SECRET',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := '{}'::jsonb
    ) AS request_id;
  $$
);
```

## Kontrol

```sql
SELECT * FROM cron.job
WHERE jobname = 'daily-client-water-reminder-10-tr';

SELECT *
FROM cron.job_run_details
WHERE jobid IN (
  SELECT jobid FROM cron.job
  WHERE jobname = 'daily-client-water-reminder-10-tr'
)
ORDER BY start_time DESC
LIMIT 20;
```

## Manuel Test

```bash
curl -X POST "https://YOUR_DOMAIN/api/cron/daily-client-notifications?secret=YOUR_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Kaldırma

```sql
SELECT cron.unschedule('daily-client-water-reminder-10-tr');
```
