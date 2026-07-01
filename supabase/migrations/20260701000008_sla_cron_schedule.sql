-- ============================================================
-- MIGRATION 20260701000008 — SLA escalation cron schedule
-- SupportFlow Helpdesk
--
-- Schedules the sla-escalation-check Edge Function to run every 15
-- minutes via pg_cron + pg_net (net.http_post). This is the first
-- scheduled/cron job in this repo.
--
-- SECRET HANDLING: the service_role key sent as the Authorization
-- bearer header is NEVER stored in this file (or any committed file).
-- It lives encrypted in Supabase Vault, created out-of-band via:
--
--   SELECT vault.create_secret(
--     '<the actual service_role key>',
--     'sla_service_role_key',
--     'Service role key used by the SLA escalation pg_cron job to
--      authenticate against the sla-escalation-check Edge Function.'
--   );
--
-- This migration only references that secret BY NAME via the
-- vault.decrypted_secrets view, resolved at execution time inside the
-- cron job body — the plaintext key never touches source control.
--
-- Idempotent: unschedules any pre-existing job with the same name
-- before recreating it, so re-running this migration (or a future
-- schedule-tweaking migration) doesn't create duplicate cron jobs.
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sla-escalation-check') THEN
    PERFORM cron.unschedule('sla-escalation-check');
  END IF;
END $$;

SELECT cron.schedule(
  'sla-escalation-check',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://uvlucodcayfuzfqvpqan.supabase.co/functions/v1/sla-escalation-check',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'sla_service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
