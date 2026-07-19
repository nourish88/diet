# Danışan Bildirimleri Kurulumu

Bu modül iki tür bildirim gönderir:

- Diyetisyen panelinden seçili danışanlara anlık mesaj
- Her gün Türkiye saatiyle 12:00 ve 17:00'da bildirimleri açık olan tüm aktif danışanlara su hatırlatması

Anlık gönderim cron kullanmaz. Su bildirimleri Supabase `pg_cron` ile API
endpoint'ini çağırır. Vault ve cron kurulumunun güncel, güvenli SQL'i için
[`CHECK_IN_AND_WATER_SCHEDULING.md`](./CHECK_IN_AND_WATER_SCHEDULING.md)
dosyasını kullanın.

## Endpoint

- URL: `/api/cron/daily-client-notifications?slot=12` veya `?slot=17`
- Method: `GET` veya `POST`
- Auth: Vault'taki `diet_app_cron_secret` değeriyle `Authorization: Bearer ...`
- Saatler: `12:00` ve `17:00 Europe/Istanbul`
- UTC karşılıkları: `09:00` ve `14:00`

## Kontrol

```sql
SELECT * FROM cron.job
WHERE jobname IN (
  'daily-active-client-water-reminder',
  'daily-active-client-water-reminder-17-tr'
);

SELECT *
FROM cron.job_run_details
WHERE jobid IN (
  SELECT jobid FROM cron.job
  WHERE jobname IN (
    'daily-active-client-water-reminder',
    'daily-active-client-water-reminder-17-tr'
  )
)
ORDER BY start_time DESC
LIMIT 20;
```

## Manuel Test

```bash
curl -X POST "https://YOUR_DOMAIN/api/cron/daily-client-notifications?slot=17" \
  -H "Authorization: Bearer $CRON_SECRET"
```

## Kaldırma

```sql
SELECT cron.unschedule('daily-active-client-water-reminder-17-tr');
```
