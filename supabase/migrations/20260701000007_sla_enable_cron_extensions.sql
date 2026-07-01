-- ============================================================
-- MIGRATION 20260701000007 — Enable pg_cron and pg_net
-- SupportFlow Helpdesk
--
-- Both extensions were available on this Supabase project but not
-- installed. Required for the SLA escalation cron (Slice 3):
--   pg_cron — schedules the periodic job (cron.schedule).
--   pg_net  — allows async HTTP calls from Postgres (net.http_post),
--             used by the cron job to invoke the sla-escalation-check
--             Edge Function.
--
-- No manual dashboard step needed for this part — both extensions are
-- enabled the same way as any other (CREATE EXTENSION), unlike the
-- service-role secret used later in the cron job body, which does
-- require a manual step (see migration 20260701000008).
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
