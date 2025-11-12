# Birthday Notification Setup

This document explains how to set up the birthday notification cron job using Supabase pg_cron.

## Overview

The birthday notification system sends push notifications to dietitians at 00:00 (midnight) and 10:00 AM GMT+3 every day, informing them about clients with birthdays on that day.

## Prerequisites

1. Supabase project with pg_cron extension enabled
2. `CRON_SECRET` environment variable set in Vercel
3. Web push notifications configured (VAPID keys)

## Setup Steps

### 1. Enable pg_cron Extension

First, enable the pg_cron extension in your Supabase database:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

### 2. Get Your CRON_SECRET

Make sure you have set the `CRON_SECRET` environment variable in Vercel. You can get it from:
- Vercel Dashboard → Your Project → Settings → Environment Variables

### 3. Get Your API Endpoint URL

Your API endpoint URL should be:
```
https://your-domain.vercel.app/api/cron/birthday-notifications
```

Replace `your-domain.vercel.app` with your actual Vercel deployment URL.

### 4. Create Cron Jobs

Create two cron jobs: one for midnight (00:00 GMT+3) and one for 10:00 AM GMT+3.

#### Midnight Job (00:00 GMT+3 = 21:00 UTC)

```sql
-- Schedule birthday notification job for midnight GMT+3 (21:00 UTC)
SELECT cron.schedule(
  'birthday-notifications-midnight',
  '0 21 * * *', -- 21:00 UTC = 00:00 GMT+3
  $$
  SELECT
    net.http_post(
      url := 'https://your-domain.vercel.app/api/cron/birthday-notifications?secret=YOUR_CRON_SECRET',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := '{}'::jsonb
    ) AS request_id;
  $$
);
```

#### Morning Job (10:00 AM GMT+3 = 07:00 UTC)

```sql
-- Schedule birthday notification job for 10:00 AM GMT+3 (07:00 UTC)
SELECT cron.schedule(
  'birthday-notifications-morning',
  '0 7 * * *', -- 07:00 UTC = 10:00 GMT+3
  $$
  SELECT
    net.http_post(
      url := 'https://your-domain.vercel.app/api/cron/birthday-notifications?secret=YOUR_CRON_SECRET',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := '{}'::jsonb
    ) AS request_id;
  $$
);
```

**Important:** Replace `YOUR_CRON_SECRET` with your actual CRON_SECRET value from Vercel.

### 5. Verify Cron Jobs

Check if the cron jobs are scheduled:

```sql
-- List all cron jobs
SELECT * FROM cron.job;
```

You should see two jobs:
- `birthday-notifications-midnight`
- `birthday-notifications-morning`

### 6. Check Cron Job Logs

To check if the cron jobs are running successfully:

```sql
-- View recent cron job runs
SELECT 
  jobid,
  runid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
WHERE jobid IN (
  SELECT jobid FROM cron.job 
  WHERE jobname IN ('birthday-notifications-midnight', 'birthday-notifications-morning')
)
ORDER BY start_time DESC
LIMIT 20;
```

## Testing

### Manual Test

You can manually trigger the birthday notification endpoint:

```bash
curl -X GET "https://your-domain.vercel.app/api/cron/birthday-notifications?secret=YOUR_CRON_SECRET"
```

Or using POST:

```bash
curl -X POST "https://your-domain.vercel.app/api/cron/birthday-notifications" \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"
```

### Expected Response

```json
{
  "success": true,
  "message": "Sent X notifications, Y failed, Z dietitians notified",
  "sent": X,
  "failed": Y,
  "dietitiansNotified": Z
}
```

## Troubleshooting

### Job Not Running

1. Check if pg_cron extension is enabled:
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_cron';
   ```

2. Check cron job status:
   ```sql
   SELECT * FROM cron.job WHERE jobname LIKE 'birthday-notifications%';
   ```

3. Check cron job logs for errors:
   ```sql
   SELECT * FROM cron.job_run_details 
   WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname LIKE 'birthday-notifications%')
   ORDER BY start_time DESC;
   ```

### Notifications Not Being Sent

1. Verify web push is configured:
   - Check `WEB_PUSH_PUBLIC_KEY` and `WEB_PUSH_PRIVATE_KEY` environment variables
   - Verify dietitians have active push subscriptions

2. Check API endpoint logs in Vercel:
   - Go to Vercel Dashboard → Your Project → Functions
   - Check `/api/cron/birthday-notifications` logs

3. Verify client birthdates are stored correctly:
   - Check `Client.birthdate` field in database
   - Ensure birthdates are in correct format (DateTime)

### Timezone Issues

- The system uses GMT+3 (Turkey time) for date comparisons
- Cron jobs are scheduled in UTC:
  - 00:00 GMT+3 = 21:00 UTC (previous day)
  - 10:00 GMT+3 = 07:00 UTC

## Unschedule Jobs

If you need to remove the cron jobs:

```sql
-- Unschedule midnight job
SELECT cron.unschedule('birthday-notifications-midnight');

-- Unschedule morning job
SELECT cron.unschedule('birthday-notifications-morning');
```

## Security Notes

1. **CRON_SECRET**: Keep your CRON_SECRET secure and never commit it to version control
2. **HTTPS**: Always use HTTPS for API endpoints in production
3. **Authorization**: The endpoint checks for CRON_SECRET in both Authorization header and query parameter

## Additional Resources

- [Supabase pg_cron Documentation](https://supabase.com/docs/guides/database/extensions/pg_cron)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Web Push Notifications](https://web.dev/push-notifications-overview/)

