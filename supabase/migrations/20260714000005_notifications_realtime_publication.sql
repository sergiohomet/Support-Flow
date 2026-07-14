-- ============================================================
-- MIGRATION 20260714000005 — notifications realtime publication + grant
-- SupportFlow Helpdesk
--
-- Part of the "realtime" change: useListNotifications and the new
-- sidebar unread badge both subscribe to postgres_changes on
-- public.notifications. Two things are required for that to actually
-- receive events, not just subscribe successfully:
--
-- 1. Publication membership (mirrors 20260714000001, which added
--    `tickets` for the same reason).
-- 2. A base `GRANT SELECT ... TO authenticated`, independent of RLS
--    and independent of publication membership — Supabase Realtime
--    requires this separately. `notifications` never received it
--    (confirmed via information_schema.role_table_grants against the
--    live DB before writing this migration). The precedent is
--    documented in 20260703000005_backfill_realtime_select_grants.sql,
--    which had to backfill the same grant for tickets/ticket_comments/
--    users after the same gap caused useTicketDetail's subscription to
--    silently receive zero events.
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

GRANT SELECT ON public.notifications TO authenticated;
